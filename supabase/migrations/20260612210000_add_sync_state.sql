create table if not exists public.sync_state (
  id uuid primary key default gen_random_uuid(),
  sync_type text unique not null,
  last_sync_at timestamptz,
  is_syncing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_settlements (
  match_id uuid primary key references public.matches (id) on delete cascade,
  winner_pool numeric(10, 2) not null default 0,
  exact_score_pool numeric(10, 2) not null default 0,
  winner_hits integer not null default 0,
  exact_score_hits integer not null default 0,
  total_predictions integer not null default 0,
  settled_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sync_state enable row level security;
alter table public.match_settlements enable row level security;

drop trigger if exists sync_state_set_updated_at on public.sync_state;
create trigger sync_state_set_updated_at
before update on public.sync_state
for each row
execute function public.set_updated_at();

drop trigger if exists match_settlements_set_updated_at on public.match_settlements;
create trigger match_settlements_set_updated_at
before update on public.match_settlements
for each row
execute function public.set_updated_at();

drop policy if exists "match settlements are readable by everyone" on public.match_settlements;
create policy "match settlements are readable by everyone"
on public.match_settlements
for select
to anon, authenticated
using (true);
