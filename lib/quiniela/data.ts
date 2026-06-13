import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getWorldCupMatches, worldCupGameToMatch } from '@/lib/worldcup/worldcup26';
import { buildScore, formatMatchDate, formatMatchTime } from './format';
import { mockMatches, mockRankings } from './mock-data';
import type {
  ExistingPrediction,
  Match,
  RankingItem,
  UserDashboardSummary,
  Viewer,
} from './types';

function mapMatchRow(row: {
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
}): Match {
  const live = row.status === 'live';

  return {
    id: row.slug,
    recordId: row.id,
    externalApiId: row.external_api_id,
    home: row.home_team,
    away: row.away_team,
    homeFlag: row.home_flag ?? row.home_team.slice(0, 3).toUpperCase(),
    awayFlag: row.away_flag ?? row.away_team.slice(0, 3).toUpperCase(),
    homeFlagUrl: null,
    awayFlagUrl: null,
    date: live ? 'EN VIVO' : formatMatchDate(row.kickoff_at),
    time: live ? 'Ahora' : formatMatchTime(row.kickoff_at),
    stadium: row.stadium ?? 'Sede por confirmar',
    group: row.stage_label ?? 'Mundial 2026',
    winnerStake: row.winner_stake,
    exactScoreStake: row.exact_score_stake,
    live,
    score: buildScore(row.home_score, row.away_score),
    status: row.status,
    kickoffAt: row.kickoff_at,
  };
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
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
  };
}

export async function getMatches() {
  const worldCupMatches = await getWorldCupMatches()
    .then((games) => games.map(worldCupGameToMatch))
    .catch(() => []);
  const fallbackMatches = worldCupMatches.length
      ? worldCupMatches
      : mockMatches;

  if (!isSupabaseConfigured()) {
    return fallbackMatches;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return fallbackMatches;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, external_api_id, slug, home_team, away_team, home_flag, away_flag, kickoff_at, stadium, stage_label, winner_stake, exact_score_stake, status, home_score, away_score'
    )
    .order('kickoff_at', { ascending: true });

  if (error || !data?.length) {
    return fallbackMatches;
  }

  return data.map(mapMatchRow);
}

export async function getMatchBySlug(slug: string) {
  const worldCupMatches = await getWorldCupMatches()
    .then((games) => games.map(worldCupGameToMatch))
    .catch(() => []);
  const fallbackMatch =
    worldCupMatches.find((match) => match.id === slug) ??
    mockMatches.find((match) => match.id === slug) ??
    null;

  if (!isSupabaseConfigured()) {
    return fallbackMatch;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return fallbackMatch;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, external_api_id, slug, home_team, away_team, home_flag, away_flag, kickoff_at, stadium, stage_label, winner_stake, exact_score_stake, status, home_score, away_score'
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) {
    return fallbackMatch;
  }

  return mapMatchRow(data);
}

export async function getPredictionForViewer(matchRecordId?: string, viewerId?: string) {
  if (!matchRecordId || !viewerId) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('predictions')
    .select(
      'id, bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount, edit_count'
    )
    .eq('match_id', matchRecordId)
    .eq('user_id', viewerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const prediction: ExistingPrediction = {
    id: data.id,
    betMode: data.bet_mode,
    predictedWinner: data.predicted_winner,
    homeScore: data.predicted_home_score,
    awayScore: data.predicted_away_score,
    stakeAmount: data.stake_amount,
    editCount: data.edit_count,
    canEdit: data.edit_count < 1,
  };

  return prediction;
}

export async function getUserDashboardSummary(
  viewerId?: string
): Promise<UserDashboardSummary> {
  if (!viewerId || !isSupabaseConfigured()) {
    return {
      totalStaked: 0,
      predictionsCount: 0,
      editedPredictions: 0,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      totalStaked: 0,
      predictionsCount: 0,
      editedPredictions: 0,
    };
  }

  const { data, error } = await supabase
    .from('predictions')
    .select('stake_amount, edit_count')
    .eq('user_id', viewerId);

  if (error || !data) {
    return {
      totalStaked: 0,
      predictionsCount: 0,
      editedPredictions: 0,
    };
  }

  return {
    totalStaked: data.reduce((sum, item) => sum + Number(item.stake_amount ?? 0), 0),
    predictionsCount: data.length,
    editedPredictions: data.filter((item) => Number(item.edit_count ?? 0) > 0).length,
  };
}

export async function getRankings(): Promise<RankingItem[]> {
  if (!isSupabaseConfigured()) {
    return mockRankings;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return mockRankings;
  }

  const { data, error } = await supabase
    .from('leaderboard_overview')
    .select('position, display_name, total_staked, predictions_count')
    .order('position', { ascending: true })
    .limit(10);

  if (error || !data?.length) {
    return mockRankings;
  }

  return data.map((item) => ({
    position: item.position,
    name: item.display_name,
    totalStaked: item.total_staked,
    predictionsCount: item.predictions_count,
    medal: String(item.position),
  }));
}
