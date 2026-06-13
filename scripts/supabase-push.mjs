import { spawnSync } from 'node:child_process';
import { getCommandEnv, getRemoteDbUrl, loadDotEnv } from './supabase-env.mjs';

loadDotEnv();

const commandEnv = getCommandEnv();
const remoteDbUrl = getRemoteDbUrl();

if (remoteDbUrl) {
  const dbUrlPushResult = spawnSync('npx', ['supabase', 'db', 'push', '--db-url', remoteDbUrl], {
    stdio: 'inherit',
    shell: true,
    env: commandEnv,
  });

  if (dbUrlPushResult.status !== 0) {
    process.exit(dbUrlPushResult.status ?? 1);
  }

  process.exit(0);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  throw new Error(
    'Falta SUPABASE_ACCESS_TOKEN o SUPABASE_DB_URL en .env. Usa SUPABASE_ACCESS_TOKEN para link + db push o pega el Session pooler string completo en SUPABASE_DB_URL.'
  );
}

const linkResult = spawnSync('node', ['scripts/supabase-link.mjs'], {
  stdio: 'inherit',
  shell: true,
  env: commandEnv,
});

if (linkResult.status !== 0) {
  process.exit(linkResult.status ?? 1);
}

const pushResult = spawnSync('npx', ['supabase', 'db', 'push'], {
  stdio: 'inherit',
  shell: true,
  env: commandEnv,
});

if (pushResult.status !== 0) {
  process.exit(pushResult.status ?? 1);
}
