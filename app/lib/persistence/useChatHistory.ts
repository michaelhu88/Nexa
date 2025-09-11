import { useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs';
import { getCurrentProject } from '~/lib/stores/projects';
import { supabaseChatStorage } from './supabaseChat';
import { authClient } from '~/lib/supabase/auth-client';
import type { FileMap } from '~/lib/stores/files';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';
import { projectActions } from '~/lib/stores/projects';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

export interface IChatMetadata {
  gitUrl?: string;
  gitBranch?: string;
  netlifySiteId?: string;
}

// Project-based chat state
export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);
export function useChatHistory() {
  const [searchParams] = useSearchParams();

  const [, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  // Get current project from store
  const currentProject = getCurrentProject();

  useEffect(() => {
    async function loadProjectChat() {
      try {
        // Check if user is authenticated
        const {
          data: { user },
          error: authError,
        } = await authClient.auth.getUser();

        if (authError || !user) {
          setReady(true);
          return;
        }

        if (!currentProject) {
          // No project loaded, show empty chat
          setInitialMessages([]);
          setReady(true);

          return;
        }

        // Load chat messages for current project
        const messages = await supabaseChatStorage.loadMessages(currentProject.id);

        const rewindId = searchParams.get('rewindTo');
        let filteredMessages = messages;
        let archivedMessages: Message[] = [];

        if (rewindId) {
          const rewindIndex = messages.findIndex((m) => m.id === rewindId);

          if (rewindIndex !== -1) {
            filteredMessages = messages.slice(0, rewindIndex + 1);
            archivedMessages = messages.slice(rewindIndex + 1);
          }
        }

        // Check if we need to restore from a snapshot
        const snapshot = await supabaseChatStorage.loadSnapshot(currentProject.id);

        if (snapshot && filteredMessages.length === 0) {
          // Create restoration message with snapshot data
          const files = Object.entries(snapshot.snapshotData.files || {})
            .map(([key, value]) => {
              if (value?.type !== 'file') {
                return null;
              }

              return {
                content: value.content,
                path: key,
              };
            })
            .filter((x): x is { content: string; path: string } => !!x);

          const projectCommands = await detectProjectCommands(files);
          const commandActionsString = createCommandActionsString(projectCommands);

          filteredMessages = [
            {
              id: generateId(),
              role: 'user',
              content: 'Restore project from snapshot',
              annotations: ['no-store', 'hidden'],
            },
            {
              id: generateId(),
              role: 'assistant',
              content: `Nexa restored your project from a snapshot.
                <nexaArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
                ${Object.entries(snapshot.snapshotData.files || {})
                  .map(([key, value]) => {
                    if (value?.type === 'file') {
                      return `
                    <nexaAction type="file" filePath="${key}">
${value.content}
                    </nexaAction>
                    `;
                    } else {
                      return '';
                    }
                  })
                  .join('\n')}
                ${commandActionsString}
                </nexaArtifact>
                `,
              annotations: [
                'no-store',
                ...(snapshot.snapshotData.summary
                  ? [
                      {
                        chatId: snapshot.chatMessageId || '',
                        type: 'chatSummary',
                        summary: snapshot.snapshotData.summary,
                      } as ContextAnnotation,
                    ]
                  : []),
              ],
            },
          ];

          // Restore files to WebContainer
          await restoreSnapshot(currentProject.id, snapshot);
        }

        setArchivedMessages(archivedMessages);
        setInitialMessages(filteredMessages);

        // Set project metadata
        description.set(currentProject.name);
        chatId.set(currentProject.id);
        chatMetadata.set(currentProject.metadata as IChatMetadata);

        setReady(true);
      } catch (error) {
        console.error('Failed to load project chat:', error);
        logStore.logError('Failed to load project chat', error);
        toast.error('Failed to load chat history');
        setReady(true);
      }
    }

    loadProjectChat();
  }, [currentProject?.id, searchParams]);

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, projectId?: string, chatSummary?: string) => {
      const id = projectId || getCurrentProject()?.id;

      if (!id) {
        console.warn('No project ID available for snapshot');
        return;
      }

      try {
        await supabaseChatStorage.saveSnapshot(id, chatIdx, files, chatSummary);
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');
      }
    },
    [],
  );

  const restoreSnapshot = useCallback(async (projectId: string, snapshot: any) => {
    const container = await webcontainer;

    if (!snapshot?.snapshotData?.files) {
      return;
    }

    const files = snapshot.snapshotData.files as FileMap;

    // Create directories first
    for (const [key, value] of Object.entries(files)) {
      let filePath = key;

      if (filePath.startsWith(container.workdir)) {
        filePath = filePath.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(filePath, { recursive: true });
      }
    }

    // Then create files
    for (const [key, value] of Object.entries(files)) {
      let filePath = key;

      if (filePath.startsWith(container.workdir)) {
        filePath = filePath.replace(container.workdir, '');
      }

      if (value?.type === 'file') {
        const content = value.content;
        await container.fs.writeFile(filePath, content, {
          encoding: value.isBinary ? undefined : 'utf8',
        });
      }
    }
  }, []);

  return {
    ready,
    initialMessages,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const project = getCurrentProject();

      if (!project) {
        console.warn('No project available to update metadata');
        return;
      }

      try {
        // Update project metadata in the projects store
        await projectActions.updateProject(project.id, {
          metadata: { ...project.metadata, ...metadata },
        });
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[]) => {
      const project = getCurrentProject();

      if (!project || messages.length === 0) {
        return;
      }

      try {
        // Filter out no-store messages
        const messagesToStore = messages.filter((m) => !m.annotations?.includes('no-store'));

        if (messagesToStore.length > 0) {
          await supabaseChatStorage.saveMessages(project.id, messagesToStore);
        }

        // Handle chat summary if present
        const lastMessage = messages[messages.length - 1];

        if (lastMessage.role === 'assistant') {
          const annotations = lastMessage.annotations as JSONValue[];
          const filteredAnnotations = (annotations?.filter(
            (annotation: JSONValue) =>
              annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
          ) || []) as { type: string; value: any } & { [key: string]: any }[];

          const summaryAnnotation = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary');

          if (summaryAnnotation) {
            // Save snapshot with summary
            const files = workbenchStore.files.get();
            await takeSnapshot(lastMessage.id, files, project.id, summaryAnnotation.summary);
          }
        }
      } catch (error) {
        console.error('Failed to store message history:', error);
        toast.error('Failed to save chat history');
      }
    },
    takeSnapshot,
    importChat: async (_description: string, _messages: Message[]) => {
      // Not implemented for project-based chats
      toast.error('Import is not yet supported for project-based chats');
    },
    exportChat: () => {
      const project = getCurrentProject();

      if (!project || initialMessages.length === 0) {
        toast.error('No chat to export');
        return;
      }

      const chatData = {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
        },
        messages: initialMessages,
        exportDate: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(chatData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_chat.json`;
      link.click();

      URL.revokeObjectURL(url);
      toast.success('Chat exported successfully');
    },
  };
}
