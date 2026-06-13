'use server';

import { redirect } from 'next/navigation';
import { ensureMatchRecordBySlug } from '@/lib/quiniela/data';
import { isPredictionOpen } from '@/lib/quiniela/rules';
import { getPredictedWinnerFromScore } from '@/lib/quiniela/format';
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
  let matchId = String(formData.get('matchId') ?? '').trim();

  if (!slug) {
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
    redirect(`/registro?next=${encodeURIComponent(`/prediccion/${slug}`)}`);
  }

  if (!matchId) {
    matchId = (await ensureMatchRecordBySlug(slug)) ?? '';
  }

  if (!matchId) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage(
          'Todavia no pudimos sincronizar este partido. Intenta de nuevo en unos segundos.'
        ),
      })
    );
  }

  const winnerPredictedWinner = String(
    formData.get('winnerPredictedWinner') ?? ''
  ) as PredictedWinner;
  const exactHomeScore = clampScore(formData.get('exactHomeScore'));
  const exactAwayScore = clampScore(formData.get('exactAwayScore'));

  if (!['home', 'draw', 'away'].includes(winnerPredictedWinner)) {
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

  const { data: existingPredictions, error: existingError } = await supabase
    .from('predictions')
    .select(
      'id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, edit_count'
    )
    .eq('match_id', matchId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (existingError) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage(existingError.message),
      })
    );
  }

  const existingWinnerPrediction =
    existingPredictions?.find((item) => item.bet_mode === 'winner') ?? null;
  const existingExactPrediction =
    existingPredictions?.find((item) => item.bet_mode === 'exact_score') ?? null;

  const winnerChanged =
    !existingWinnerPrediction ||
    existingWinnerPrediction.predicted_winner !== winnerPredictedWinner;
  const exactChanged =
    !existingExactPrediction ||
    Number(existingExactPrediction.predicted_home_score) !== exactHomeScore ||
    Number(existingExactPrediction.predicted_away_score) !== exactAwayScore;

  if (existingWinnerPrediction && winnerChanged && Number(existingWinnerPrediction.edit_count ?? 0) >= 1) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('La apuesta de ganador ya uso su unico cambio.'),
      })
    );
  }

  if (existingExactPrediction && exactChanged && Number(existingExactPrediction.edit_count ?? 0) >= 1) {
    redirect(
      buildPredictionPath(slug, {
        error: encodeMessage('La apuesta de marcador exacto ya uso su unico cambio.'),
      })
    );
  }

  if (!existingWinnerPrediction) {
    const { error } = await supabase.from('predictions').insert({
      user_id: user.id,
      match_id: matchId,
      bet_mode: 'winner' satisfies BetMode,
      predicted_winner: winnerPredictedWinner,
      predicted_home_score: null,
      predicted_away_score: null,
    });

    if (error) {
      redirect(
        buildPredictionPath(slug, {
          error: encodeMessage(error.message),
        })
      );
    }
  } else if (winnerChanged) {
    const { error } = await supabase
      .from('predictions')
      .update({
        predicted_winner: winnerPredictedWinner,
        predicted_home_score: null,
        predicted_away_score: null,
      })
      .eq('id', existingWinnerPrediction.id);

    if (error) {
      redirect(
        buildPredictionPath(slug, {
          error: encodeMessage(error.message),
        })
      );
    }
  }

  if (!existingExactPrediction) {
    const { error } = await supabase.from('predictions').insert({
      user_id: user.id,
      match_id: matchId,
      bet_mode: 'exact_score' satisfies BetMode,
      predicted_winner: getPredictedWinnerFromScore(exactHomeScore, exactAwayScore),
      predicted_home_score: exactHomeScore,
      predicted_away_score: exactAwayScore,
    });

    if (error) {
      redirect(
        buildPredictionPath(slug, {
          error: encodeMessage(error.message),
        })
      );
    }
  } else if (exactChanged) {
    const { error } = await supabase
      .from('predictions')
      .update({
        predicted_winner: getPredictedWinnerFromScore(exactHomeScore, exactAwayScore),
        predicted_home_score: exactHomeScore,
        predicted_away_score: exactAwayScore,
      })
      .eq('id', existingExactPrediction.id);

    if (error) {
      redirect(
        buildPredictionPath(slug, {
          error: encodeMessage(error.message),
        })
      );
    }
  }

  const updated = Boolean(
    (existingWinnerPrediction && winnerChanged) ||
      (existingExactPrediction && exactChanged)
  );

  redirect(`/guardada?match=${slug}&mode=combo&updated=${updated ? '1' : '0'}`);
}
