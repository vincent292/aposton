create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  document_number text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_api_id bigint unique,
  slug text not null unique,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  kickoff_at timestamptz not null,
  stadium text,
  stage_label text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'cancelled')),
  home_score smallint,
  away_score smallint,
  winner_stake smallint not null default 1 check (winner_stake = 1),
  exact_score_stake smallint not null default 2 check (exact_score_stake = 2),
  source text not null default 'manual',
  raw_data jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  match_id uuid not null references public.matches (id) on delete cascade,
  bet_mode text not null check (bet_mode in ('winner', 'exact_score')),
  predicted_winner text check (predicted_winner in ('home', 'draw', 'away')),
  predicted_home_score smallint check (predicted_home_score between 0 and 20),
  predicted_away_score smallint check (predicted_away_score between 0 and 20),
  stake_amount smallint not null default 1 check (stake_amount in (1, 2)),
  edit_count smallint not null default 0 check (edit_count between 0 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, match_id)
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, document_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'document_number', '')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    document_number = excluded.document_number,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.apply_prediction_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  match_record record;
begin
  select kickoff_at, status
  into match_record
  from public.matches
  where id = new.match_id;

  if match_record is null then
    raise exception 'El partido seleccionado no existe.';
  end if;

  if match_record.status in ('live', 'finished', 'cancelled') then
    raise exception 'La prediccion ya no se puede guardar porque el partido no esta disponible.';
  end if;

  if match_record.kickoff_at - interval '10 minutes' <= timezone('utc', now()) then
    raise exception 'Las apuestas cierran 10 minutos antes del inicio del partido.';
  end if;

  if tg_op = 'UPDATE' then
    if old.user_id <> new.user_id or old.match_id <> new.match_id then
      raise exception 'No se puede mover una prediccion a otro usuario o partido.';
    end if;

    if old.edit_count >= 1 then
      raise exception 'Solo puedes modificar la prediccion una vez.';
    end if;

    new.edit_count = old.edit_count + 1;
  end if;

  if new.bet_mode = 'winner' then
    if new.predicted_winner is null then
      raise exception 'Debes elegir ganador o empate.';
    end if;

    new.predicted_home_score = null;
    new.predicted_away_score = null;
    new.stake_amount = 1;
  end if;

  if new.bet_mode = 'exact_score' then
    if new.predicted_home_score is null or new.predicted_away_score is null then
      raise exception 'Debes elegir el marcador exacto.';
    end if;

    if new.predicted_home_score > new.predicted_away_score then
      new.predicted_winner = 'home';
    elseif new.predicted_home_score < new.predicted_away_score then
      new.predicted_winner = 'away';
    else
      new.predicted_winner = 'draw';
    end if;

    new.stake_amount = 2;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
before update on public.matches
for each row
execute function public.set_updated_at();

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at
before update on public.predictions
for each row
execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists predictions_apply_rules on public.predictions;
create trigger predictions_apply_rules
before insert or update on public.predictions
for each row
execute function public.apply_prediction_rules();

drop policy if exists "profiles are visible to authenticated users" on public.profiles;
create policy "profiles are visible to authenticated users"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "users update their own profile" on public.profiles;
create policy "users update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "matches are readable by everyone" on public.matches;
create policy "matches are readable by everyone"
on public.matches
for select
to anon, authenticated
using (true);

drop policy if exists "users read their own predictions" on public.predictions;
create policy "users read their own predictions"
on public.predictions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "users insert their own predictions" on public.predictions;
create policy "users insert their own predictions"
on public.predictions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users update their own predictions" on public.predictions;
create policy "users update their own predictions"
on public.predictions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace view public.leaderboard_overview as
select
  row_number() over (
    order by
      coalesce(sum(pr.stake_amount), 0) desc,
      count(pr.id) desc,
      min(p.created_at) asc
  )::int as position,
  coalesce(nullif(trim(p.full_name), ''), 'Jugador sin nombre') as display_name,
  coalesce(sum(pr.stake_amount), 0)::int as total_staked,
  count(pr.id)::int as predictions_count
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.full_name, p.created_at;

grant select on public.leaderboard_overview to anon, authenticated;

insert into public.matches (
  slug,
  home_team,
  away_team,
  home_flag,
  away_flag,
  kickoff_at,
  stadium,
  stage_label,
  status
)
values
  (
    'argentina-mexico',
    'Argentina',
    'Mexico',
    'ARG',
    'MEX',
    '2026-06-15T18:00:00-04:00',
    'Estadio Azteca',
    'Grupo A',
    'scheduled'
  ),
  (
    'brasil-francia',
    'Brasil',
    'Francia',
    'BRA',
    'FRA',
    '2026-06-20T16:00:00-04:00',
    'Estadio Lusail',
    'Grupo B',
    'scheduled'
  ),
  (
    'portugal-alemania',
    'Portugal',
    'Alemania',
    'POR',
    'GER',
    '2026-06-18T14:00:00-04:00',
    'Arena Internacional',
    'Partido en vivo',
    'live'
  ),
  (
    'espana-italia',
    'Espana',
    'Italia',
    'ESP',
    'ITA',
    '2026-06-22T19:30:00-04:00',
    'MetLife Stadium',
    'Grupo C',
    'scheduled'
  ),
  (
    'uruguay-eeuu',
    'Uruguay',
    'Estados Unidos',
    'URU',
    'USA',
    '2026-06-24T20:00:00-04:00',
    'SoFi Stadium',
    'Grupo D',
    'scheduled'
  )
on conflict (slug) do update
set
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  home_flag = excluded.home_flag,
  away_flag = excluded.away_flag,
  kickoff_at = excluded.kickoff_at,
  stadium = excluded.stadium,
  stage_label = excluded.stage_label,
  status = excluded.status,
  updated_at = timezone('utc', now());

update public.matches
set
  home_score = 1,
  away_score = 1
where slug = 'portugal-alemania';
