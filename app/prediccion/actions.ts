'use server';

import { redirect } from 'next/navigation';
import { getPredictedWinnerFromScore } from '@/lib/quiniela/format';
import { isPredictionOpen } from '@/lib/quiniela/rules';
import type { BetMode, PredictedWinner } from '@/lib/quiniela/types';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function buildPredictionPath(
  slug: string,
  params: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `/prediccion/${slug}?${query}` : `/prediccion/${slug}`;
}

function clampScore(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(20, Math.round(parsed)));
}

export async function savePredictionAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim();
  const matchId = String(formData.get('matchId') ?? '').trim();

  if (!slug || !matchId) {
    redirect('/inicio');
  }

  if (!isSupabaseConfigured()) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('El guardado de apuestas aun no esta disponible.'),
      })
    );
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('No se pudo guardar la apuesta en este momento.'),
      })
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/prediccion/${slug}`)}`);
  }

  const betMode = String(formData.get('betMode') ?? 'winner') as BetMode;
  const homeScore = clampScore(formData.get('homeScore'));
  const awayScore = clampScore(formData.get('awayScore'));
  const predictedWinner = String(
    formData.get('predictedWinner') ?? ''
  ) as PredictedWinner;

  if (betMode === 'winner' && !['home', 'draw', 'away'].includes(predictedWinner)) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('Debes elegir ganador o empate.'),
      })
    );
  }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('kickoff_at, status')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError || !match || !isPredictionOpen({ kickoffAt: match.kickoff_at, status: match.status })) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('Las apuestas para este partido ya estan cerradas.'),
      })
    );
  }

  const insertPayload = {
    user_id: user.id,
    match_id: matchId,
    bet_mode: betMode,
    predicted_winner:
      betMode === 'winner'
        ? predictedWinner
        : getPredictedWinnerFromScore(homeScore, awayScore),
    predicted_home_score: betMode === 'exact_score' ? homeScore : null,
    predicted_away_score: betMode === 'exact_score' ? awayScore : null,
  };

  const { data: existingPrediction, error: existingError } = await supabase
    .from('predictions')
    .select('id, edit_count')
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage(existingError.message),
      })
    );
  }

  if (existingPrediction && Number(existingPrediction.edit_count ?? 0) >= 1) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('Ya usaste tu unico cambio para este partido.'),
      })
    );
  }

  if (!existingPrediction) {
    const { error } = await supabase.from('predictions').insert(insertPayload);

    if (error) {
      redirect(
        buildPredictionPath(slug, {
          error: encodeMessage(error.message),
        })
      );
    }

    redirect(`/guardada?match=${slug}&mode=${betMode}&updated=0`);
  }

  const { error } = await supabase
    .from('predictions')
    .update({
      bet_mode: insertPayload.bet_mode,
      predicted_winner: insertPayload.predicted_winner,
      predicted_home_score: insertPayload.predicted_home_score,
      predicted_away_score: insertPayload.predicted_away_score,
    })
    .eq('id', existingPrediction.id);

  if (error) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage(error.message),
      })
    );
  }

  redirect(`/guardada?match=${slug}&mode=${betMode}&updated=1`);
}
