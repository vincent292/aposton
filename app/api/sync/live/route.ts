import { NextResponse } from 'next/server';
import { syncApiFootballLiveMatchesToSupabase } from '@/lib/football-api';
import { createServiceSupabaseClient } from '@/lib/supabase/service';

const SYNC_TYPE = 'live_matches';
const RECENT_SYNC_WINDOW_MS = 8 * 60 * 1000;

type SyncCandidate = {
  id: string;
  external_api_id: number | null;
  home_team: string;
  away_team: string;
  source: string | null;
};

type SyncState = {
  sync_type: string;
  last_sync_at: string | null;
  is_syncing: boolean | null;
};

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') ?? '';

  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

function recentlySynced(lastSyncAt: string | null) {
  if (!lastSyncAt) {
    return false;
  }

  const lastSyncTime = new Date(lastSyncAt).getTime();

  return Number.isFinite(lastSyncTime) && Date.now() - lastSyncTime < RECENT_SYNC_WINDOW_MS;
}

async function getSyncCandidates() {
  const supabase = createServiceSupabaseClient();
  const now = new Date();
  const inThirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);
  const selectFields = 'id, external_api_id, home_team, away_team, source';

  const [liveResult, upcomingResult] = await Promise.all([
    supabase
      .from('matches')
      .select(selectFields)
      .eq('status', 'live'),
    supabase
      .from('matches')
      .select(selectFields)
      .eq('status', 'scheduled')
      .gte('kickoff_at', now.toISOString())
      .lte('kickoff_at', inThirtyMinutes.toISOString()),
  ]);

  if (liveResult.error) {
    throw new Error(liveResult.error.message);
  }

  if (upcomingResult.error) {
    throw new Error(upcomingResult.error.message);
  }

  const byId = new Map<string, SyncCandidate>();

  for (const match of [...(liveResult.data ?? []), ...(upcomingResult.data ?? [])]) {
    byId.set(match.id, match as SyncCandidate);
  }

  return {
    supabase,
    candidates: Array.from(byId.values()),
  };
}

async function ensureSyncState(supabase: ReturnType<typeof createServiceSupabaseClient>) {
  const { error: upsertError } = await supabase
    .from('sync_state')
    .upsert({ sync_type: SYNC_TYPE }, { onConflict: 'sync_type', ignoreDuplicates: true });

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  const { data, error } = await supabase
    .from('sync_state')
    .select('sync_type, last_sync_at, is_syncing')
    .eq('sync_type', SYNC_TYPE)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as SyncState;
}

async function setSyncing(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  isSyncing: boolean,
  markSynced = false
) {
  const payload: {
    is_syncing: boolean;
    updated_at: string;
    last_sync_at?: string;
  } = {
    is_syncing: isSyncing,
    updated_at: new Date().toISOString(),
  };

  if (markSynced) {
    payload.last_sync_at = payload.updated_at;
  }

  const { error } = await supabase
    .from('sync_state')
    .update(payload)
    .eq('sync_type', SYNC_TYPE);

  if (error) {
    throw new Error(error.message);
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { supabase, candidates } = await getSyncCandidates();

  if (!candidates.length) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'No live or upcoming matches',
    });
  }

  const syncState = await ensureSyncState(supabase);

  if (syncState.is_syncing) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Sync already running',
    });
  }

  if (recentlySynced(syncState.last_sync_at)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'Recently synced',
    });
  }

  await setSyncing(supabase, true);

  try {
    const summary = await syncApiFootballLiveMatchesToSupabase(supabase, candidates);
    await setSyncing(supabase, false, true);

    return NextResponse.json({
      ...summary,
      skipped: false,
    }, { status: summary.ok ? 200 : 502 });
  } catch (error) {
    await setSyncing(supabase, false);

    return NextResponse.json(
      {
        ok: false,
        skipped: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido.'],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
