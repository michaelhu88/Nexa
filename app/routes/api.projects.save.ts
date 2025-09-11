import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { authClient } from '~/lib/supabase/auth-client';
import { createClient } from '@supabase/supabase-js';
import type { FileMap } from '~/lib/stores/files';
import { createHash } from 'crypto';

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = (await request.json()) as { projectId: string; files: FileMap };
    const { projectId, files } = body;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.user_id !== user.id) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Get existing files to determine what to update/delete
    const { data: existingFiles, error: existingError } = await supabase
      .from('project_files')
      .select('file_path, checksum')
      .eq('project_id', projectId);

    if (existingError) {
      console.error('Error fetching existing files:', existingError);
    }

    const existingPaths = new Set(existingFiles?.map((f) => f.file_path) || []);
    const newPaths = new Set(Object.keys(files));

    // Files to delete (exist in DB but not in new files)
    const pathsToDelete = Array.from(existingPaths).filter((path) => !newPaths.has(path));

    // Delete removed files
    if (pathsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('project_files')
        .delete()
        .eq('project_id', projectId)
        .in('file_path', pathsToDelete);

      if (deleteError) {
        console.error('Error deleting files:', deleteError);
      }
    }

    // Prepare files for upsert
    const fileRecords = [];

    for (const [path, file] of Object.entries(files)) {
      if (file && file.type === 'file') {
        const content = file.content;
        const checksum = createHash('sha256')
          .update(typeof content === 'string' ? content : new Uint8Array(content as ArrayBuffer))
          .digest('hex');

        // Only update if content has changed
        const existingFile = existingFiles?.find((f) => f.file_path === path);

        if (!existingFile || existingFile.checksum !== checksum) {
          fileRecords.push({
            project_id: projectId,
            file_path: path,
            content: file.isBinary ? null : (content as string),
            content_binary: file.isBinary ? (content as any) : null,
            is_binary: file.isBinary || false,
            file_type: path.split('.').pop() || 'txt',
            file_size: typeof content === 'string' ? content.length : (content as ArrayBuffer).byteLength,
            checksum,
          });
        }
      }
    }

    // Upsert files (insert or update)
    if (fileRecords.length > 0) {
      const { error: upsertError } = await supabase.from('project_files').upsert(fileRecords, {
        onConflict: 'project_id,file_path',
      });

      if (upsertError) {
        console.error('Error saving files:', upsertError);
        return json({ error: 'Failed to save files' }, { status: 500 });
      }
    }

    // Update project's updated_at timestamp
    const { error: updateError } = await supabase
      .from('projects')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project timestamp:', updateError);
    }

    return json({
      success: true,
      filesUpdated: fileRecords.length,
      filesDeleted: pathsToDelete.length,
    });
  } catch (error) {
    console.error('Error in save project API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
