import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to the 'stuffy-league' bucket and returns the public URL.
 * File path is stored as: user_id/filename
 */
export async function uploadFile(file: File, userId: string, folder: 'players' | 'teams' = 'players'): Promise<string | null> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${folder}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('stuffy-league')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return null;
  }

  const { data } = supabase.storage
    .from('stuffy-league')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
