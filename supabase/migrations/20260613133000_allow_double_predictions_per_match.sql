alter table public.predictions
drop constraint if exists predictions_user_id_match_id_key;

alter table public.predictions
drop constraint if exists predictions_user_id_match_id_bet_mode_key;

alter table public.predictions
add constraint predictions_user_id_match_id_bet_mode_key
unique (user_id, match_id, bet_mode);
