-- Pathly Supabase setup
-- Execute this file in Supabase SQL Editor as project owner.

-- 1) Required extensions
create extension if not exists pg_cron;

-- 2) Profile soft-delete support
alter table if exists public.profiles
  add column if not exists deleted_at timestamptz;

alter table if exists public.profiles
  add column if not exists updated_at timestamptz default now();

update public.profiles
set updated_at = coalesce(updated_at, now())
where updated_at is null;

-- 3) Helpful index for cleanup job
create index if not exists idx_profiles_deleted_at
  on public.profiles (deleted_at)
  where deleted_at is not null;

-- 4) RLS for profile updates (safe if policies already exist)
alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_insert_own'
  ) then
    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- 5) Optional RPC helpers for app-side deletion workflow
create or replace function public.mark_my_account_for_deletion()
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.profiles (id, deleted_at, updated_at)
  values (auth.uid(), now(), now())
  on conflict (id)
  do update set
    deleted_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.cancel_my_account_deletion()
returns void
language plpgsql
security invoker
as $$
begin
  update public.profiles
  set deleted_at = null,
      updated_at = now()
  where id = auth.uid();
end;
$$;

-- 6) Cleanup function executed by cron (hard delete after 30 days)
-- This function deletes user data and then removes users from auth.users.
-- Run this SQL as project owner so function owner can delete from auth schema.
create or replace function public.cleanup_soft_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  expired_user_ids uuid[];
  deleted_count integer := 0;
begin
  select array_agg(id)
  into expired_user_ids
  from public.profiles
  where deleted_at is not null
    and deleted_at <= now() - interval '30 days';

  if expired_user_ids is null then
    return 0;
  end if;

  -- Delete app data first
  delete from public.daily_task_completions where user_id = any(expired_user_ids);
  delete from public.daily_tasks where user_id = any(expired_user_ids);
  delete from public.goals where user_id = any(expired_user_ids);
  delete from public.streaks where user_id = any(expired_user_ids);
  delete from public.profiles where id = any(expired_user_ids);

  -- Delete auth users (hard delete)
  delete from auth.users where id = any(expired_user_ids);
  get diagnostics deleted_count = row_count;

  return deleted_count;
end;
$$;

revoke all on function public.cleanup_soft_deleted_accounts() from public;
grant execute on function public.cleanup_soft_deleted_accounts() to service_role;

-- 7) Daily cron at 00:01 (UTC)
-- Remove existing job with same name if present.
do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'cleanup-soft-deleted-accounts'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end $$;

select cron.schedule(
  'cleanup-soft-deleted-accounts',
  '1 0 * * *',
  $$select public.cleanup_soft_deleted_accounts();$$
);
