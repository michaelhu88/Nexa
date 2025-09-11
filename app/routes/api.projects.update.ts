import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { authClient } from '~/lib/supabase/auth-client';
import { createClient } from '@supabase/supabase-js';

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
    const body = (await request.json()) as { projectId: string; updates: Record<string, any> };
    const { projectId, updates } = body;

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

    // Prepare updates (convert camelCase to snake_case)
    const dbUpdates: any = {};

    if (updates.name !== undefined) {
      dbUpdates.name = updates.name;
    }

    if (updates.description !== undefined) {
      dbUpdates.description = updates.description;
    }

    if (updates.isPublic !== undefined) {
      dbUpdates.is_public = updates.isPublic;
    }

    if (updates.thumbnailUrl !== undefined) {
      dbUpdates.thumbnail_url = updates.thumbnailUrl;
    }

    if (updates.settings !== undefined) {
      dbUpdates.settings = updates.settings;
    }

    if (updates.metadata !== undefined) {
      dbUpdates.metadata = updates.metadata;
    }

    // If updating name, generate new slug
    if (updates.name) {
      const { data: slugData, error: slugError } = await supabase.rpc('generate_project_slug', {
        project_name: updates.name,
        user_id: user.id,
      });

      if (!slugError && slugData) {
        dbUpdates.url_slug = slugData;
      }
    }

    // Update the project
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      return json({ error: 'Failed to update project' }, { status: 500 });
    }

    // Transform snake_case to camelCase for frontend
    const transformedProject = {
      id: updatedProject.id,
      userId: updatedProject.user_id,
      name: updatedProject.name,
      description: updatedProject.description,
      urlSlug: updatedProject.url_slug,
      thumbnailUrl: updatedProject.thumbnail_url,
      settings: updatedProject.settings,
      metadata: updatedProject.metadata,
      isPublic: updatedProject.is_public,
      isTemplate: updatedProject.is_template,
      lastAccessedAt: updatedProject.last_accessed_at,
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
    };

    return json(transformedProject);
  } catch (error) {
    console.error('Error in update project API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
