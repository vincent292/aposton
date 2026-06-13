import { spawnSync } from 'node:child_process';
import { getCommandEnv, getDbPassword, getProjectRef, loadDotEnv } from './supabase-env.mjs';

loadDotEnv();

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  throw new Error(
    'Falta SUPABASE_ACCESS_TOKEN en .env para usar supabase link. Si prefieres evitar el link, agrega SUPABASE_DB_URL y usa npm run supabase:push:remote.'
  );
}

const dbPassword = getDbPassword();
const projectRef = getProjectRef();

const result = spawnSync(
  'npx',
  ['supabase', 'link', '--project-ref', projectRef, '--password', dbPassword],
  {
    stdio: 'inherit',
    shell: true,
    env: getCommandEnv(),
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
