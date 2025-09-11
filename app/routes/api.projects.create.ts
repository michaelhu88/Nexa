import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { authClient } from '~/lib/supabase/auth-client';
import { createClient } from '@supabase/supabase-js';
import type { FileMap } from '~/lib/stores/files';

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
    const body = (await request.json()) as any;
    const { name, description, isPublic, files, metadata } = body;

    if (!name) {
      return json({ error: 'Project name is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique slug using the database function
    const { data: slugData, error: slugError } = await supabase.rpc('generate_project_slug', {
      project_name: name,
      user_id: user.id,
    });

    if (slugError) {
      console.error('Error generating slug:', slugError);
      return json({ error: 'Failed to generate project slug' }, { status: 500 });
    }

    // Create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        url_slug: slugData,
        is_public: isPublic || false,
        metadata: metadata || {},
        settings: {},
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return json({ error: 'Failed to create project' }, { status: 500 });
    }

    // If files were provided, save them
    if (files && Object.keys(files).length > 0) {
      const fileRecords = [];

      for (const [path, file] of Object.entries(files as FileMap)) {
        if (file && file.type === 'file') {
          fileRecords.push({
            project_id: project.id,
            file_path: path,
            content: file.isBinary ? null : file.content,
            content_binary: file.isBinary ? file.content : null,
            is_binary: file.isBinary || false,
            file_type: path.split('.').pop() || 'txt',
          });
        }
      }

      if (fileRecords.length > 0) {
        const { error: filesError } = await supabase.from('project_files').insert(fileRecords);

        if (filesError) {
          console.error('Error saving project files:', filesError);

          // Don't fail the whole operation, but log the error
        }
      }
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

    return json(transformedProject);
  } catch (error) {
    console.error('Error in create project API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
