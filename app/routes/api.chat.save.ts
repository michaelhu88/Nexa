import { json, type ActionFunctionArgs } from '@remix-run/cloudflare';
import { supabaseChatStorage } from '~/lib/persistence/supabaseChat';

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Parse request body
    const body = (await request.json()) as any;
    const { projectId, messages } = body;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!Array.isArray(messages)) {
      return json({ error: 'Messages must be an array' }, { status: 400 });
    }

    // Save messages using Supabase chat storage
    await supabaseChatStorage.saveMessages(projectId, messages);

    return json({ success: true });
  } catch (error) {
    console.error('Error in save chat API:', error);

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
