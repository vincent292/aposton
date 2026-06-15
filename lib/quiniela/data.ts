import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getWorldCupMatches, worldCupGameToMatch } from '@/lib/worldcup/worldcup26';
import { createOptionalServiceSupabaseClient } from '@/lib/supabase/service';
import { buildScore, formatMatchDate, formatMatchTime } from './format';
import { isPredictionOpen } from './rules';
import { translateTeamName } from './team-names';
import { resolveVenueTimeZone } from './venue-time';
import type {
  DashboardMatch,
  ExistingPrediction,
  FamilyDependent,
  Match,
  MatchPredictionSet,
  PredictionHistoryItem,
  RankingItem,
  UserDashboardSummary,
  Viewer,
} from './types';

type MatchRow = {
  id: string;
  external_api_id: number | null;
  slug: string;
  home_team: string;
  away_team: string;
  home_flag: string | null;
  away_flag: string | null;
  kickoff_at: string;
  stadium: string | null;
  stage_label: string | null;
  winner_stake: number;
  exact_score_stake: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
  source?: string | null;
};

type PredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  bet_mode: 'winner' | 'exact_score';
  predicted_winner: 'home' | 'draw' | 'away' | null;
  predicted_home_score: number | null;
  predicted_away_score: number | null;
  stake_amount: number;
  edit_count: number;
};

type MatchSettlementRow = {
  match_id: string;
  winner_pool: number;
  exact_score_pool: number;
  winner_hits: number;
  exact_score_hits: number;
};

const WORLD_CUP_FALLBACK_TIMEOUT_MS = 1800;

function mapMatchRow(row: MatchRow): Match {
  const live = row.status === 'live';
  const venueTimeZone = resolveVenueTimeZone({ stadium: row.stadium ?? null });
  const homeLabel = translateTeamName(row.home_team);
  const awayLabel = translateTeamName(row.away_team);

  return {
    id: row.slug,
    recordId: row.id,
    externalApiId: row.external_api_id,
    home: homeLabel || row.home_team,
    away: awayLabel || row.away_team,
    homeFlag: row.home_flag ?? row.home_team.slice(0, 3).toUpperCase(),
    awayFlag: row.away_flag ?? row.away_team.slice(0, 3).toUpperCase(),
    homeFlagUrl: null,
    awayFlagUrl: null,
    date: live ? 'EN VIVO' : formatMatchDate(row.kickoff_at, venueTimeZone),
    time: live ? 'Ahora' : formatMatchTime(row.kickoff_at, venueTimeZone),
    stadium: row.stadium ?? 'Sede por confirmar',
    venueTimeZone,
    group: row.stage_label ?? 'Mundial 2026',
    winnerStake: row.winner_stake,
    exactScoreStake: row.exact_score_stake,
    live,
    score: buildScore(row.home_score, row.away_score),
    status: row.status,
    kickoffAt: row.kickoff_at,
  };
}

function isWorldCup2026MatchRow(row: MatchRow) {
  return Boolean(row.external_api_id) || row.source === 'worldcup26';
}

function isWorldCup2026MatchRecord(
  row:
    | Pick<MatchRow, 'external_api_id' | 'source'>
    | { external_api_id?: number | null; source?: string | null }
) {
  return Boolean(row.external_api_id) || row.source === 'worldcup26';
}

function isSyncedMatchRow(row: MatchRow) {
  return isWorldCup2026MatchRow(row);
}

function getActualWinner(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return null;
  }

  if (homeScore > awayScore) {
    return 'home' as const;
  }

  if (awayScore > homeScore) {
    return 'away' as const;
  }

  return 'draw' as const;
}

function getPredictionOutcome({
  prediction,
  match,
  settlement,
}: {
  prediction: Pick<
    PredictionRow,
    | 'bet_mode'
    | 'predicted_winner'
    | 'predicted_home_score'
    | 'predicted_away_score'
  >;
  match?: Pick<MatchRow, 'status' | 'home_score' | 'away_score'> | null;
  settlement?: MatchSettlementRow | null;
}) {
  if (!match || match.status !== 'finished' || !settlement) {
    return { wonAmount: 0, isHit: false };
  }

  const actualWinner = getActualWinner(match.home_score, match.away_score);

  if (!actualWinner) {
    return { wonAmount: 0, isHit: false };
  }

  if (prediction.bet_mode === 'winner' && prediction.predicted_winner === actualWinner) {
    const hits = Number(settlement.winner_hits ?? 0);
    const pool = Number(settlement.winner_pool ?? 0);

    return {
      wonAmount: hits > 0 ? pool / hits : 0,
      isHit: true,
    };
  }

  if (
    prediction.bet_mode === 'exact_score' &&
    Number(prediction.predicted_home_score) === Number(match.home_score) &&
    Number(prediction.predicted_away_score) === Number(match.away_score)
  ) {
    const hits = Number(settlement.exact_score_hits ?? 0);
    const pool = Number(settlement.exact_score_pool ?? 0);

    return {
      wonAmount: hits > 0 ? pool / hits : 0,
      isHit: true,
    };
  }

  return { wonAmount: 0, isHit: false };
}

function sortMatchesByCurrentValue<T extends Match>(matches: T[]) {
  return [...matches].sort((left, right) => {
    const leftPriority =
      left.status === 'live' ? 0 : left.status === 'scheduled' ? 1 : 2;
    const rightPriority =
      right.status === 'live' ? 0 : right.status === 'scheduled' ? 1 : 2;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    const leftTime = left.kickoffAt ? new Date(left.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.kickoffAt ? new Date(right.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;

    return leftTime - rightTime;
  });
}

async function getWorldCupGamesWithTimeout() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      getWorldCupMatches(),
      new Promise<Awaited<ReturnType<typeof getWorldCupMatches>>>((resolve) => {
        timeoutId = setTimeout(() => resolve([]), WORLD_CUP_FALLBACK_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return [];
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function getWorldCupMatchesWithTimeout() {
  const games = await getWorldCupGamesWithTimeout();
  return games.map(worldCupGameToMatch);
}

async function getStoredMatches() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return [] as MatchRow[];
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, external_api_id, slug, home_team, away_team, home_flag, away_flag, kickoff_at, stadium, stage_label, winner_stake, exact_score_stake, status, home_score, away_score, source'
    )
    .order('kickoff_at', { ascending: true });

  if (error || !data?.length) {
    return [] as MatchRow[];
  }

  return data.filter(isWorldCup2026MatchRow);
}

async function ensureStoredMatchBySlug(slug: string) {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const worldCupGames = await getWorldCupMatches();
  const game = worldCupGames.find((item) => item.slug === slug);

  if (!game) {
    return null;
  }

  const { data: syncedMatchId, error: syncError } = await supabase.rpc('upsert_worldcup_match', {
    p_external_api_id: game.externalApiId,
    p_slug: game.slug,
    p_home_team: game.homeTeam,
    p_away_team: game.awayTeam,
    p_home_flag: game.homeFlag,
    p_away_flag: game.awayFlag,
    p_kickoff_at: game.kickoffAt,
    p_stadium: game.stadium,
    p_stage_label: game.stageLabel,
    p_status: game.status,
    p_home_score: game.homeScore,
    p_away_score: game.awayScore,
    p_raw_data: game.rawData,
  });

  if (syncError || !syncedMatchId) {
    return null;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, external_api_id, slug, home_team, away_team, home_flag, away_flag, kickoff_at, stadium, stage_label, winner_stake, exact_score_stake, status, home_score, away_score, source'
    )
    .eq('id', syncedMatchId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMatchRow(data);
}

async function getViewerPredictionsMap(viewerId?: string) {
  if (!viewerId || !isSupabaseConfigured()) {
    return new Map<string, MatchPredictionSet>();
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return new Map<string, MatchPredictionSet>();
  }

  const { data, error } = await supabase
    .from('predictions')
    .select(
      'id, match_id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount, edit_count'
    )
    .eq('user_id', viewerId);

  if (error || !data?.length) {
    return new Map<string, MatchPredictionSet>();
  }

  const predictionsByMatchId = new Map<string, MatchPredictionSet>();

  for (const item of data) {
    const prediction: ExistingPrediction = {
      id: item.id,
      betMode: item.bet_mode,
      predictedWinner: item.predicted_winner,
      homeScore: item.predicted_home_score,
      awayScore: item.predicted_away_score,
      stakeAmount: item.stake_amount,
      editCount: item.edit_count,
      canEdit: item.edit_count < 1,
    };
    const current = predictionsByMatchId.get(item.match_id) ?? {
      winner: null,
      exactScore: null,
    };

    if (item.bet_mode === 'winner') {
      current.winner = prediction;
    } else {
      current.exactScore = prediction;
    }

    predictionsByMatchId.set(item.match_id, current);
  }

  return predictionsByMatchId;
}

export async function getDashboardMatches(viewerId?: string): Promise<DashboardMatch[]> {
  const [storedRows, predictionsByMatchId, worldCupMatches] = await Promise.all([
    getStoredMatches(),
    getViewerPredictionsMap(viewerId),
    getWorldCupMatchesWithTimeout(),
  ]);

  const storedByExternalId = new Map(
    storedRows
      .filter((row) => row.external_api_id !== null)
      .map((row) => [row.external_api_id as number, row])
  );
  const storedBySlug = new Map(storedRows.map((row) => [row.slug, row]));

  const mergedWorldCupMatches = worldCupMatches.map((match) => {
    const storedRow =
      (match.externalApiId !== null && match.externalApiId !== undefined
        ? storedByExternalId.get(match.externalApiId)
        : null) ?? storedBySlug.get(match.id);

    if (!storedRow) {
      return match;
    }

    return {
      ...match,
      recordId: storedRow.id,
      winnerStake: storedRow.winner_stake,
      exactScoreStake: storedRow.exact_score_stake,
      status: storedRow.status,
      score: buildScore(storedRow.home_score, storedRow.away_score) ?? match.score,
    };
  });

  const worldCupSlugs = new Set(mergedWorldCupMatches.map((match) => match.id));
  const storedOnlyMatches = storedRows
    .map(mapMatchRow)
    .filter((match) => !worldCupSlugs.has(match.id));

  const baseMatches = mergedWorldCupMatches.length
    ? [...mergedWorldCupMatches, ...storedOnlyMatches]
    : storedOnlyMatches;

  return sortMatchesByCurrentValue(baseMatches).map((match) => ({
    ...match,
    viewerPredictions:
      match.recordId
        ? predictionsByMatchId.get(match.recordId) ?? { winner: null, exactScore: null }
        : { winner: null, exactScore: null },
    predictionOpen: isPredictionOpen(match),
  }));
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, document_number')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    documentNumber: profile?.document_number ?? null,
  };
}

export async function getMatches() {
  if (!isSupabaseConfigured()) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    return worldCupMatches;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    return worldCupMatches;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, external_api_id, slug, home_team, away_team, home_flag, away_flag, kickoff_at, stadium, stage_label, winner_stake, exact_score_stake, status, home_score, away_score'
    )
    .order('kickoff_at', { ascending: true });

  if (error || !data?.length) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    return worldCupMatches;
  }

  return data.filter(isWorldCup2026MatchRow).map(mapMatchRow);
}

export async function getMatchBySlug(slug: string) {
  if (!isSupabaseConfigured()) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    const fallbackMatch = worldCupMatches.find((match) => match.id === slug) ?? null;

    return fallbackMatch;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    const fallbackMatch = worldCupMatches.find((match) => match.id === slug) ?? null;

    return fallbackMatch;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, external_api_id, slug, home_team, away_team, home_flag, away_flag, kickoff_at, stadium, stage_label, winner_stake, exact_score_stake, status, home_score, away_score'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (!error && data) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    const liveMatch = worldCupMatches.find(
      (match) => match.id === slug || match.externalApiId === data.external_api_id
    );

    if (liveMatch) {
      return {
        ...liveMatch,
        recordId: data.id,
        winnerStake: data.winner_stake,
        exactScoreStake: data.exact_score_stake,
        status: data.status,
        score: buildScore(data.home_score, data.away_score) ?? liveMatch.score,
      };
    }

    return mapMatchRow(data);
  }

  const ensuredMatch = await ensureStoredMatchBySlug(slug);

  if (ensuredMatch) {
    return ensuredMatch;
  }

  if (error || !data) {
    const worldCupMatches = await getWorldCupMatchesWithTimeout();
    const fallbackMatch = worldCupMatches.find((match) => match.id === slug) ?? null;

    return fallbackMatch;
  }

  return mapMatchRow(data);
}

export async function ensureMatchRecordBySlug(slug: string) {
  const match = await getMatchBySlug(slug);
  return match?.recordId ?? null;
}

export async function getPredictionsForViewer(matchRecordId?: string, viewerId?: string) {
  if (!matchRecordId || !viewerId) {
    return {
      winner: null,
      exactScore: null,
    } satisfies MatchPredictionSet;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      winner: null,
      exactScore: null,
    } satisfies MatchPredictionSet;
  }

  const { data, error } = await supabase
    .from('predictions')
    .select(
      'id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount, edit_count'
    )
    .eq('match_id', matchRecordId)
    .eq('user_id', viewerId)
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    return {
      winner: null,
      exactScore: null,
    } satisfies MatchPredictionSet;
  }

  const predictionSet: MatchPredictionSet = {
    winner: null,
    exactScore: null,
  };

  for (const item of data) {
    const prediction: ExistingPrediction = {
      id: item.id,
      betMode: item.bet_mode,
      predictedWinner: item.predicted_winner,
      homeScore: item.predicted_home_score,
      awayScore: item.predicted_away_score,
      stakeAmount: item.stake_amount,
      editCount: item.edit_count,
      canEdit: item.edit_count < 1,
    };

    if (item.bet_mode === 'winner') {
      predictionSet.winner = prediction;
    } else {
      predictionSet.exactScore = prediction;
    }
  }

  return predictionSet;
}

export async function getUserDashboardSummary(
  viewerId?: string
): Promise<UserDashboardSummary> {
  if (!viewerId || !isSupabaseConfigured()) {
    return {
      totalStaked: 0,
      totalWon: 0,
      balance: 0,
      predictionsCount: 0,
      editedPredictions: 0,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      totalStaked: 0,
      totalWon: 0,
      balance: 0,
      predictionsCount: 0,
      editedPredictions: 0,
    };
  }

  const { data, error } = await supabase
    .from('predictions')
    .select(
      'match_id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount, edit_count'
    )
    .eq('user_id', viewerId);

  if (error || !data) {
    return {
      totalStaked: 0,
      totalWon: 0,
      balance: 0,
      predictionsCount: 0,
      editedPredictions: 0,
    };
  }

  const matchIds = [...new Set(data.map((item) => item.match_id).filter(Boolean))];
  const [matchesResult, settlementsResult] = await Promise.all([
    matchIds.length
      ? supabase
          .from('matches')
          .select('id, status, home_score, away_score, external_api_id, source')
          .in('id', matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length
      ? supabase
          .from('match_settlements')
          .select('match_id, winner_pool, exact_score_pool, winner_hits, exact_score_hits')
          .in('match_id', matchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const matchesById = new Map(
    (matchesResult.data ?? []).map((item) => [item.id, item])
  );
  const settlementsByMatchId = new Map(
    (settlementsResult.data ?? []).map((item) => [item.match_id, item])
  );

  const totalStaked = data.reduce((sum, item) => {
    const match = matchesById.get(item.match_id);
    return match && isWorldCup2026MatchRecord(match)
      ? sum + Number(item.stake_amount ?? 0)
      : sum;
  }, 0);
  const totalWon = data.reduce((sum, item) => {
    const match = matchesById.get(item.match_id);

    if (!match || !isWorldCup2026MatchRecord(match)) {
      return sum;
    }

    const outcome = getPredictionOutcome({
      prediction: item,
      match,
      settlement: settlementsByMatchId.get(item.match_id),
    });

    return sum + outcome.wonAmount;
  }, 0);

  return {
    totalStaked,
    totalWon,
    balance: totalWon - totalStaked,
    predictionsCount: data.filter((item) => {
      const match = matchesById.get(item.match_id);
      return Boolean(match && isWorldCup2026MatchRecord(match));
    }).length,
    editedPredictions: data.filter((item) => {
      const match = matchesById.get(item.match_id);
      return Boolean(
        match && isWorldCup2026MatchRecord(match) && Number(item.edit_count ?? 0) > 0
      );
    }).length,
  };
}

export async function getRankings(): Promise<RankingItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const serviceSupabase = createOptionalServiceSupabaseClient();

  if (!serviceSupabase) {
    return [];
  }

  const [profilesResult, predictionsResult, matchesResult, settlementsResult] = await Promise.all([
    serviceSupabase.from('profiles').select('id, full_name, created_at'),
    serviceSupabase
      .from('predictions')
      .select(
        'id, user_id, match_id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount, edit_count'
      ),
    serviceSupabase.from('matches').select('id, status, home_score, away_score, external_api_id, source'),
    serviceSupabase
      .from('match_settlements')
      .select('match_id, winner_pool, exact_score_pool, winner_hits, exact_score_hits'),
  ]);

  if (
    profilesResult.error ||
    predictionsResult.error ||
    matchesResult.error ||
    settlementsResult.error ||
    !profilesResult.data?.length
  ) {
    return [];
  }

  const matchesById = new Map((matchesResult.data ?? []).map((item) => [item.id, item]));
  const settlementsByMatchId = new Map(
    (settlementsResult.data ?? []).map((item) => [item.match_id, item])
  );
  const predictionsByUserId = new Map<string, PredictionRow[]>();

  for (const prediction of (predictionsResult.data ?? []) as PredictionRow[]) {
    const current = predictionsByUserId.get(prediction.user_id) ?? [];
    current.push(prediction);
    predictionsByUserId.set(prediction.user_id, current);
  }

  const ranking = profilesResult.data
    .map((profile) => {
      const predictions = predictionsByUserId.get(profile.id) ?? [];
      let totalStaked = 0;
      let totalWon = 0;
      let winnerHits = 0;
      let exactHits = 0;

      for (const prediction of predictions) {
        const match = matchesById.get(prediction.match_id);

        if (!match || !isWorldCup2026MatchRecord(match)) {
          continue;
        }

        totalStaked += Number(prediction.stake_amount ?? 0);

        const outcome = getPredictionOutcome({
          prediction,
          match,
          settlement: settlementsByMatchId.get(prediction.match_id),
        });

        totalWon += outcome.wonAmount;

        if (outcome.isHit) {
          if (prediction.bet_mode === 'exact_score') {
            exactHits += 1;
          } else {
            winnerHits += 1;
          }
        }
      }

      return {
        name: profile.full_name?.trim() || 'Jugador sin nombre',
        totalWon,
        totalStaked,
        balance: totalWon - totalStaked,
        predictionsCount: predictions.length,
        winnerHits,
        exactHits,
        createdAt: profile.created_at,
      };
    })
    .sort((left, right) => {
      if (right.totalWon !== left.totalWon) {
        return right.totalWon - left.totalWon;
      }

      const rightHits = right.winnerHits + right.exactHits;
      const leftHits = left.winnerHits + left.exactHits;

      if (rightHits !== leftHits) {
        return rightHits - leftHits;
      }

      if (right.balance !== left.balance) {
        return right.balance - left.balance;
      }

      if (right.predictionsCount !== left.predictionsCount) {
        return right.predictionsCount - left.predictionsCount;
      }

      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    })
    .map((item, index) => ({
      position: index + 1,
      name: item.name,
      totalWon: item.totalWon,
      totalStaked: item.totalStaked,
      balance: item.balance,
      predictionsCount: item.predictionsCount,
      winnerHits: item.winnerHits,
      exactHits: item.exactHits,
      medal: String(index + 1),
    }));

  return ranking;
}

export async function getViewerPredictionHistory(
  viewerId?: string
): Promise<PredictionHistoryItem[]> {
  if (!viewerId || !isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('predictions')
    .select(
      `id, match_id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount, edit_count,
      matches!inner(
        slug, home_team, away_team, kickoff_at, stadium, status, home_score, away_score, external_api_id, source
      )`
    )
    .eq('user_id', viewerId);

  if (error || !data?.length) {
    return [];
  }

  const matchIds = [...new Set(data.map((item) => item.match_id))];
  const { data: settlements } = matchIds.length
    ? await supabase
        .from('match_settlements')
        .select('match_id, winner_pool, exact_score_pool, winner_hits, exact_score_hits')
        .in('match_id', matchIds)
    : { data: [] as MatchSettlementRow[] };

  const settlementsByMatchId = new Map(
    (settlements ?? []).map((item) => [item.match_id, item])
  );

  return data
    .map<PredictionHistoryItem | null>((item) => {
      const match = Array.isArray(item.matches) ? item.matches[0] : item.matches;

      if (!match) {
        return null;
      }

      if (!isWorldCup2026MatchRecord(match)) {
        return null;
      }

      const outcome = getPredictionOutcome({
        prediction: item,
        match: {
          status: match.status,
          home_score: match.home_score,
          away_score: match.away_score,
        },
        settlement: settlementsByMatchId.get(item.match_id),
      });

      return {
        id: item.id,
        matchSlug: match.slug,
        matchLabel: `${translateTeamName(match.home_team) || match.home_team} vs ${translateTeamName(match.away_team) || match.away_team}`,
        stadium: match.stadium ?? 'Sede por confirmar',
        date: formatMatchDate(
          match.kickoff_at,
          resolveVenueTimeZone({ stadium: match.stadium ?? null })
        ),
        time: formatMatchTime(
          match.kickoff_at,
          resolveVenueTimeZone({ stadium: match.stadium ?? null })
        ),
        kickoffAt: match.kickoff_at,
        venueTimeZone: resolveVenueTimeZone({ stadium: match.stadium ?? null }),
        status: match.status,
        betMode: item.bet_mode,
        predictedWinner: item.predicted_winner,
        homeScore: item.predicted_home_score,
        awayScore: item.predicted_away_score,
        stakeAmount: item.stake_amount,
        editCount: item.edit_count,
        canEdit: item.edit_count < 1 && isPredictionOpen({ kickoffAt: match.kickoff_at, status: match.status }),
        wonAmount: outcome.wonAmount,
        isHit: outcome.isHit,
      } satisfies PredictionHistoryItem;
    })
    .filter((item): item is PredictionHistoryItem => Boolean(item))
    .sort((left, right) => new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime());
}

export async function getViewerDependents(viewerId?: string): Promise<FamilyDependent[]> {
  if (!viewerId || !isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('family_dependents')
    .select('id, full_name, document_number, relationship, created_at')
    .eq('guardian_user_id', viewerId)
    .order('created_at', { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    fullName: item.full_name,
    documentNumber: item.document_number,
    relationship: item.relationship,
    createdAt: item.created_at,
  }));
}
