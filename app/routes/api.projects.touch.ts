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
    const body = (await request.json()) as { projectId: string };
    const { projectId } = body;

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

    // Update last accessed timestamp (only if user owns the project)
    const { error: updateError } = await supabase
      .from('projects')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (updateError) {
      // Non-critical error, just log it
      console.error('Error updating last accessed:', updateError);
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error in touch project API:', error);

    // Non-critical endpoint, return success even on error
    return json({ success: true });
  }
}
