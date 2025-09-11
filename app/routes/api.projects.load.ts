import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { authClient } from '~/lib/supabase/auth-client';
import { createClient } from '@supabase/supabase-js';

export async function loader({ request }: ActionFunctionArgs) {
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

    // Get project ID from query params
    const url = new URL(request.url);
    const projectId = url.searchParams.get('id');

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

    // Fetch the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access to this project
    if (project.user_id !== user.id && !project.is_public) {
      return json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch project files
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId);

    if (filesError) {
      console.error('Error fetching project files:', filesError);

      // Don't fail if we can't get files, just return empty array
    }

    // Transform snake_case to camelCase for frontend
    const transformedProject = {
      id: project.id,
      userId: project.user_id,
      name: project.name,
      description: project.description,
      urlSlug: project.url_slug,
      thumbnailUrl: project.thumbnail_url,
      settings: project.settings,
      metadata: project.metadata,
      isPublic: project.is_public,
      isTemplate: project.is_template,
      lastAccessedAt: project.last_accessed_at,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };

    const transformedFiles = (files || []).map((file) => ({
      id: file.id,
      projectId: file.project_id,
      filePath: file.file_path,
      content: file.content,
      contentBinary: file.content_binary,
      isBinary: file.is_binary,
      fileType: file.file_type,
      fileSize: file.file_size,
      checksum: file.checksum,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return json({
      project: transformedProject,
      files: transformedFiles,
    });
  } catch (error) {
    console.error('Error in load project API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
