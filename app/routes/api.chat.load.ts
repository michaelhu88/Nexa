import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { supabaseChatStorage } from '~/lib/persistence/supabaseChat';

export async function loader({ request }: ActionFunctionArgs) {
  try {
    // Get project ID from query params
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Load messages using Supabase chat storage
    const messages = await supabaseChatStorage.loadMessages(projectId);

    return json({ messages });
  } catch (error) {
    console.error('Error in load chat API:', error);

    if (error instanceof Error) {
      if (error.message === 'User not authenticated') {
        return json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (error.message === 'Access denied' || error.message === 'Project not found') {
        return json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
