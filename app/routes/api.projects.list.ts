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

    // Create Supabase client with service role for server-side operations
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, description, url_slug, thumbnail_url, is_public, last_accessed_at, created_at')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    // Transform snake_case to camelCase for frontend
    const transformedProjects = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      urlSlug: project.url_slug,
      thumbnailUrl: project.thumbnail_url,
      isPublic: project.is_public,
      lastAccessedAt: project.last_accessed_at,
      createdAt: project.created_at,
    }));

    return json(transformedProjects);
  } catch (error) {
    console.error('Error in projects list API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
