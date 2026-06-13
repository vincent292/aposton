alter table public.matches
add column if not exists raw_data jsonb;

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
