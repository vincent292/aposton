create table if not exists public.family_dependents (
  id uuid primary key default gen_random_uuid(),
  guardian_user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  document_number text not null,
  relationship text not null default 'child'
    check (relationship in ('child')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.family_dependents enable row level security;

drop trigger if exists family_dependents_set_updated_at on public.family_dependents;
create trigger family_dependents_set_updated_at
before update on public.family_dependents
for each row
execute function public.set_updated_at();

create or replace function public.upsert_worldcup_match(
  p_external_api_id bigint,
  p_slug text,
  p_home_team text,
  p_away_team text,
  p_home_flag text,
  p_away_flag text,
  p_kickoff_at timestamptz,
  p_stadium text,
  p_stage_label text,
  p_status text,
  p_home_score smallint,
  p_away_score smallint,
  p_raw_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  synced_match_id uuid;
begin
  if p_external_api_id is null then
    raise exception 'El partido requiere un external_api_id para sincronizarse.';
  end if;

  insert into public.matches (
    external_api_id,
    slug,
    home_team,
    away_team,
    home_flag,
    away_flag,
    kickoff_at,
    stadium,
    stage_label,
    status,
    home_score,
    away_score,
    source,
    raw_data
  )
  values (
    p_external_api_id,
    p_slug,
    p_home_team,
    p_away_team,
    p_home_flag,
    p_away_flag,
    p_kickoff_at,
    p_stadium,
    p_stage_label,
    coalesce(p_status, 'scheduled'),
    p_home_score,
    p_away_score,
    'worldcup26',
    p_raw_data
  )
  on conflict (external_api_id) do update
  set
    slug = excluded.slug,
    home_team = excluded.home_team,
    away_team = excluded.away_team,
    home_flag = excluded.home_flag,
    away_flag = excluded.away_flag,
    kickoff_at = excluded.kickoff_at,
    stadium = excluded.stadium,
    stage_label = excluded.stage_label,
    status = excluded.status,
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    source = excluded.source,
    raw_data = excluded.raw_data,
    updated_at = timezone('utc', now())
  returning id into synced_match_id;

  return synced_match_id;
end;
$$;

grant execute on function public.upsert_worldcup_match(
  bigint,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  smallint,
  smallint,
  jsonb
) to anon, authenticated;

drop policy if exists "users read their own dependents" on public.family_dependents;
create policy "users read their own dependents"
on public.family_dependents
for select
to authenticated
using (auth.uid() = guardian_user_id);

drop policy if exists "users insert their own dependents" on public.family_dependents;
create policy "users insert their own dependents"
on public.family_dependents
for insert
to authenticated
with check (auth.uid() = guardian_user_id and relationship = 'child');

drop policy if exists "users update their own dependents" on public.family_dependents;
create policy "users update their own dependents"
on public.family_dependents
for update
to authenticated
using (auth.uid() = guardian_user_id)
with check (auth.uid() = guardian_user_id and relationship = 'child');

drop policy if exists "users delete their own dependents" on public.family_dependents;
create policy "users delete their own dependents"
on public.family_dependents
for delete
to authenticated
using (auth.uid() = guardian_user_id);
