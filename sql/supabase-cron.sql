create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('sync-live-matches-every-10-minutes')
where exists (
  select 1
  from cron.job
  where jobname = 'sync-live-matches-every-10-minutes'
);

select cron.schedule(
  'sync-live-matches-every-10-minutes',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://MI-DOMINIO.com/api/sync/live',
    headers := jsonb_build_object(
      'Authorization', 'Bearer CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
