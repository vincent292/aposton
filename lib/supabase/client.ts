'use client';

import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, requireSupabaseConfig } from './config';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    const { url, publishableKey } = requireSupabaseConfig();
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
