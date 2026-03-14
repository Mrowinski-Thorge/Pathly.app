# Supabase setup for Pathly

Follow these steps in Supabase dashboard for your new project.

## 1) Auth provider values
Set these values in your app or environment variables:
- VITE_SUPABASE_URL = https://lmmnwgtcdjyiktobsere.supabase.co
- VITE_SUPABASE_PUBLISHABLE_KEY = sb_publishable_nI7_82Ik0BN5XGBTj5Lm5g_yrl7rPnD
- VITE_TURNSTILE_SITE_KEY = 0x4AAAAAACq436XKOHEO8jVd

## 2) Enable Turnstile in Supabase Auth
In Supabase dashboard:
- Go to Authentication > Providers (or Auth Settings, depending on UI)
- Enable CAPTCHA / Bot protection with Cloudflare Turnstile
- Add your Turnstile Site Key and Secret Key
- Save settings

Important: site key alone is not enough, you must also store the secret key in Supabase Auth settings.

## 3) Run SQL setup
Open SQL Editor and run the full content of:
- supabase/setup.sql

This creates:
- deleted_at support in profiles
- RLS policies for profiles
- RPC helpers for mark/cancel deletion
- cleanup function for accounts marked over 30 days
- pg_cron job at 00:01 UTC every day

## 4) Verify cron job
Run this in SQL Editor:

select jobid, jobname, schedule, active
from cron.job
where jobname = 'cleanup-soft-deleted-accounts';

You should see one active job with schedule 1 0 * * *.

## 5) Verify deletion flow
- Mark account for deletion in app Settings
- Log in again: app asks if deletion should be canceled
- If canceled: deleted_at becomes null
- If not canceled: account stays marked and cron removes it after 30 days

## 6) Optional manual test of cleanup
For testing only:
- Set deleted_at in profiles to now() - interval '31 days' for a test user
- Run: select public.cleanup_soft_deleted_accounts();
- Check user is removed from auth.users and related app tables
