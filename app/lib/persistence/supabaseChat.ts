import type { Message } from 'ai';
import { authClient } from '~/lib/supabase/auth-client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createScopedLogger } from '~/utils/logger';
import type { FileMap } from '~/lib/stores/files';
import type { Database } from '~/lib/supabase/types';

const logger = createScopedLogger('SupabaseChat');

export interface SupabaseChatMessage {
  id: string;
  projectId: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  annotations?: any;
  parentMessageId?: string;
  createdAt: Date;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  chatMessageId?: string;
  name?: string;
  description?: string;
  snapshotData: {
    files: FileMap;
    summary?: string;
  };
  createdAt: Date;
}

// Create Supabase client for chat operations (server-side only)
function getSupabaseClient(): SupabaseClient<Database> {
  // Ensure this only runs on server-side
  if (typeof window !== 'undefined') {
    throw new Error('SupabaseChatStorage should only be used server-side');
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}

export class SupabaseChatStorage {
  private _supabase: SupabaseClient<Database> | null = null;

  private _getClient(): SupabaseClient<Database> {
    if (!this._supabase) {
      this._supabase = getSupabaseClient();
    }

    return this._supabase;
  }

  // Save chat messages to Supabase
  async saveMessages(projectId: string, messages: Message[]): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await this._getClient()
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      const typedProject = project as { user_id: string };

      if (typedProject.user_id !== user.id) {
        throw new Error('Access denied');
      }

      // Filter out messages marked as no-store
      const messagesToSave = messages.filter((msg) => !msg.annotations?.includes('no-store'));

      if (messagesToSave.length === 0) {
        return;
      }

      // Convert to database format
      const dbMessages = messagesToSave.map((msg) => ({
        project_id: projectId,
        message_id: msg.id,
        role: msg.role,
        content: Array.isArray(msg.content)
          ? msg.content.find((item) => item.type === 'text')?.text || ''
          : msg.content,
        annotations: msg.annotations || null,
        created_at: new Date().toISOString(),
      }));

      // Upsert messages (insert or update if exists)
      const { error } = await this._getClient()
        .from('chat_messages')
        .upsert(dbMessages as any, {
          onConflict: 'project_id,message_id',
        });

      if (error) {
        logger.error('Failed to save messages:', error);
        throw error;
      }

      logger.info(`Saved ${dbMessages.length} messages for project ${projectId}`);
    } catch (error) {
      logger.error('Error in saveMessages:', error);
      throw error;
    }
  }

  // Load chat messages from Supabase
  async loadMessages(projectId: string): Promise<Message[]> {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user has access to the project
      const { data: project, error: projectError } = await this._getClient()
        .from('projects')
        .select('user_id, is_public')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      const typedProject = project as { user_id: string; is_public: boolean };

      if (typedProject.user_id !== user.id && !typedProject.is_public) {
        throw new Error('Access denied');
      }

      // Load messages
      const { data: messages, error } = await this._getClient()
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Failed to load messages:', error);
        throw error;
      }

      // Convert to Message format
      const aiMessages: Message[] = (messages || []).map((msg: any) => ({
        id: msg.message_id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        annotations: msg.annotations,
        createdAt: new Date(msg.created_at),
      }));

      logger.info(`Loaded ${aiMessages.length} messages for project ${projectId}`);

      return aiMessages;
    } catch (error) {
      logger.error('Error in loadMessages:', error);
      throw error;
    }
  }

  // Save a project snapshot
  async saveSnapshot(projectId: string, chatMessageId: string, files: FileMap, summary?: string): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await this._getClient()
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      if ((project as any).user_id !== user.id) {
        throw new Error('Access denied');
      }

      const snapshotData = {
        files,
        summary,
      };

      // Save snapshot
      const { error } = await this._getClient()
        .from('project_snapshots')
        .upsert(
          {
            project_id: projectId,
            chat_message_id: chatMessageId,
            snapshot_data: snapshotData,
            created_at: new Date().toISOString(),
          } as any,
          {
            onConflict: 'project_id,chat_message_id',
          },
        );

      if (error) {
        logger.error('Failed to save snapshot:', error);
        throw error;
      }

      logger.info(`Saved snapshot for project ${projectId}, message ${chatMessageId}`);
    } catch (error) {
      logger.error('Error in saveSnapshot:', error);
      throw error;
    }
  }

  // Load a project snapshot
  async loadSnapshot(projectId: string, chatMessageId?: string): Promise<ProjectSnapshot | null> {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      let query = this._getClient().from('project_snapshots').select('*').eq('project_id', projectId);

      if (chatMessageId) {
        query = query.eq('chat_message_id', chatMessageId);
      } else {
        // Get the latest snapshot
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data: snapshots, error } = await query;

      if (error) {
        logger.error('Failed to load snapshot:', error);
        throw error;
      }

      if (!snapshots || snapshots.length === 0) {
        return null;
      }

      const snapshot = snapshots[0];
      const typedSnapshot = snapshot as any;

      return {
        id: typedSnapshot.id,
        projectId: typedSnapshot.project_id,
        chatMessageId: typedSnapshot.chat_message_id,
        name: typedSnapshot.name,
        description: typedSnapshot.description,
        snapshotData: typedSnapshot.snapshot_data,
        createdAt: new Date(typedSnapshot.created_at),
      };
    } catch (error) {
      logger.error('Error in loadSnapshot:', error);
      return null;
    }
  }

  // Delete messages for a project
  async deleteMessages(projectId: string): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Verify user owns the project
      const { data: project, error: projectError } = await this._getClient()
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        throw new Error('Project not found');
      }

      if ((project as any).user_id !== user.id) {
        throw new Error('Access denied');
      }

      // Delete messages (snapshots will be cascade deleted)
      const { error } = await this._getClient().from('chat_messages').delete().eq('project_id', projectId);

      if (error) {
        logger.error('Failed to delete messages:', error);
        throw error;
      }

      logger.info(`Deleted messages for project ${projectId}`);
    } catch (error) {
      logger.error('Error in deleteMessages:', error);
      throw error;
    }
  }

  // Fork a conversation at a specific message
  async forkConversation(sourceProjectId: string, targetProjectId: string, messageId: string): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
        error: authError,
      } = await authClient.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // Load messages up to the fork point
      const { data: messages, error: messagesError } = await this._getClient()
        .from('chat_messages')
        .select('*')
        .eq('project_id', sourceProjectId)
        .order('created_at', { ascending: true });

      if (messagesError || !messages) {
        throw new Error('Failed to load source messages');
      }

      // Find the fork point
      const messageIndex = (messages as any[]).findIndex((msg) => msg.message_id === messageId);

      if (messageIndex === -1) {
        throw new Error('Fork message not found');
      }

      // Copy messages up to and including the fork point
      const messagesToCopy = messages.slice(0, messageIndex + 1);

      const copiedMessages = (messagesToCopy as any[]).map((msg) => ({
        project_id: targetProjectId,
        message_id: msg.message_id, // Keep same message IDs for consistency
        role: msg.role,
        content: msg.content,
        annotations: msg.annotations,
        created_at: new Date().toISOString(),
      }));

      // Insert the copied messages
      const { error: insertError } = await this._getClient()
        .from('chat_messages')
        .insert(copiedMessages as any);

      if (insertError) {
        logger.error('Failed to fork conversation:', insertError);
        throw insertError;
      }

      logger.info(`Forked conversation from ${sourceProjectId} to ${targetProjectId} at message ${messageId}`);
    } catch (error) {
      logger.error('Error in forkConversation:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const supabaseChatStorage = new SupabaseChatStorage();
