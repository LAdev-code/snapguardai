import { supabase } from './supabaseBrowserClient';

export async function getSupabaseAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
