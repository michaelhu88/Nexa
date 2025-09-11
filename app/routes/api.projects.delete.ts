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

    // Delete the project (cascade will handle related records)
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', projectId);

    if (deleteError) {
      console.error('Error deleting project:', deleteError);
      return json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error in delete project API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
