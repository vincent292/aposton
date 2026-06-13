import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"(.*)"$/, '$1');

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL en .env.');
  }

  const host = new URL(url).host;
  const projectRef = host.split('.')[0];

  if (!projectRef) {
    throw new Error('No se pudo obtener el project ref desde NEXT_PUBLIC_SUPABASE_URL.');
  }

  return projectRef;
}

export function getDbPassword() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!dbPassword) {
    throw new Error(
      'Falta SUPABASE_DB_PASSWORD en .env. Agregala para poder vincular y migrar el proyecto remoto.'
    );
  }

  return dbPassword;
}

export function getRemoteDbUrl() {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();

  if (dbUrl) {
    return dbUrl;
  }

  return null;
}

export function getCommandEnv() {
  return {
    ...process.env,
    SUPABASE_TELEMETRY_DISABLED: '1',
  };
}
