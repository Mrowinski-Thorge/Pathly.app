# Supabase Setup – Pathly

## Env-Variablen
```
VITE_SUPABASE_URL=https://lmmnwgtcdjyiktobsere.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_nI7_82Ik0BN5XGBTj5Lm5g_yrl7rPnD
VITE_TURNSTILE_SITE_KEY=0x4AAAAAACq436XKOHEO8jVd
```

## Cloudflare Turnstile in Supabase aktivieren
Dashboard → Authentication → Auth Settings → Bot- und Spam-Schutz → Turnstile  
Site Key + Secret Key eintragen → Speichern.

## Datenbankstruktur (bereits eingerichtet)
| Tabelle | Zweck |
|---|---|
| `profiles` | Benutzerprofil: `display_name`, `theme`, `language`, `onboarding_done`, `deleted_at` |

Alle anderen Tabellen (goals, daily_tasks usw.) wurden entfernt.

## RLS-Policies (bereits aktiv)
- `profiles_select_own` – SELECT nur eigene Zeile
- `profiles_insert_own` – INSERT nur eigene Zeile
- `profiles_update_own` – UPDATE nur eigene Zeile
- `profiles_delete_own` – DELETE nur eigene Zeile

## Trigger (bereits aktiv)
`on_auth_user_created` → `handle_new_user()`:  
Legt beim Registrieren automatisch einen Profiles-Eintrag an.

## RPC-Funktionen (bereits aktiv)
- `mark_my_account_for_deletion()` – setzt `deleted_at = now()`
- `cancel_my_account_deletion()`   – setzt `deleted_at = null`
- `cleanup_soft_deleted_accounts()` – löscht Accounts nach 30 Tagen (via Cron)

## Cron-Job (bereits aktiv)
```
Name: cleanup-soft-deleted-accounts
Schedule: 1 0 * * *  (täglich 00:01 UTC)
```
Prüfen:
```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'cleanup-soft-deleted-accounts';
```

## Manueller Test der Löschung
```sql
-- Einen User auf "abgelaufen" setzen:
update public.profiles
set deleted_at = now() - interval '31 days'
where id = '<uuid>';

-- Cleanup manuell ausführen:
select public.cleanup_soft_deleted_accounts();
```
