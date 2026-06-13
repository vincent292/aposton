import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase/service';
import { syncWorldCupGamesToSupabase } from '@/lib/worldcup/worldcup26';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get('authorization') ?? '';
  const bearerToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('secret');

  return bearerToken === cronSecret || queryToken === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const summary = await syncWorldCupGamesToSupabase(supabase);

    return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        syncedGames: 0,
        updatedMatches: 0,
        finishedMatches: 0,
        recalculatedMatches: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido.'],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
