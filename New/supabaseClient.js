import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lmmnwgtcdjyiktobsere.supabase.co'

export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_nI7_82Ik0BN5XGBTj5Lm5g_yrl7rPnD'

export const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAACq436XKOHEO8jVd'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
