import { buildScore, formatMatchDate, formatMatchTime } from '@/lib/quiniela/format';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Match,
  MatchEvent,
  MatchFeed,
  MatchFeedView,
  MatchLineup,
  MatchLiveDetails,
  MatchLiveStat,
} from '@/lib/quiniela/types';

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_SEASON = Number(process.env.API_FOOTBALL_SEASON ?? 2026);
const WORLD_CUP_TIMEZONE = 'America/La_Paz';
const LIVE_REVALIDATE_SECONDS = 60;

const TEAM_NAME_ALIASES: Record<string, string> = {
  brasil: 'brazil',
  espana: 'spain',
  estadosunidos: 'usa',
  eeuu: 'usa',
  unitedstates: 'usa',
  coreadelsur: 'southkorea',
  costademarfil: 'ivorycoast',
};

type ApiFootballFixture = {
  fixtureId: number;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  homeLogo: string | null;
  awayLogo: string | null;
  kickoffAt: string;
  stadium: string;
  stageLabel: string;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  homeScore: number | null;
  awayScore: number | null;
};

type ApiFootballResponse = {
  errors?: Record<string, string> | string[] | [];
  response?: Array<{
    fixture?: {
      id?: number;
      date?: string;
      venue?: { name?: string | null } | null;
      status?: {
        short?: string | null;
        long?: string | null;
        elapsed?: number | null;
      } | null;
    } | null;
    league?: {
      round?: string | null;
    } | null;
    teams?: {
      home?: { name?: string | null; code?: string | null; logo?: string | null } | null;
      away?: { name?: string | null; code?: string | null; logo?: string | null } | null;
    } | null;
    goals?: {
      home?: number | null;
      away?: number | null;
    } | null;
  }>;
};

type FixtureFetchResult = {
  fixtures: ApiFootballFixture[];
  notice?: string | null;
};

type ApiFootballSyncSummary = {
  ok: boolean;
  skipped?: boolean;
  checkedMatches: number;
  fetchedFixtures: number;
  updatedMatches: number;
  finishedMatches: number;
  recalculatedMatches: number;
  errors: string[];
  notice?: string | null;
};

type ApiFootballStatisticsResponse = {
  response?: Array<{
    team?: { name?: string | null } | null;
    statistics?: Array<{ type?: string | null; value?: string | number | null }>;
  }>;
};

type ApiFootballLineupsResponse = {
  response?: Array<{
    team?: { name?: string | null } | null;
    formation?: string | null;
    startXI?: Array<{
      player?: {
        name?: string | null;
        number?: number | null;
        pos?: string | null;
      } | null;
    }>;
  }>;
};

type ApiFootballEventsResponse = {
  response?: Array<{
    time?: { elapsed?: number | null; extra?: number | null } | null;
    team?: { name?: string | null } | null;
    player?: { name?: string | null } | null;
    type?: string | null;
    detail?: string | null;
  }>;
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeTeamName(value: string) {
  const compact = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return TEAM_NAME_ALIASES[compact] ?? compact;
}

function buildFixtureSlug(homeTeam: string, awayTeam: string, fixtureId: number) {
  const homeSlug = slugify(homeTeam);
  const awaySlug = slugify(awayTeam);
  return homeSlug && awaySlug ? `${homeSlug}-${awaySlug}-${fixtureId}` : `fixture-${fixtureId}`;
}

function isLiveStatus(statusShort: string) {
  return ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'].includes(statusShort);
}

function isFinishedStatus(statusShort: string) {
  return ['FT', 'AET', 'PEN'].includes(statusShort);
}

function buildCountryFlagUrl(code?: string | null) {
  const normalized = code?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  return `https://media.api-sports.io/flags/${normalized}.svg`;
}

function getBoliviaDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: WORLD_CUP_TIMEZONE,
  });

  return formatter.format(new Date());
}

function parseNumericStat(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  const clean = value.replace('%', '').trim();
  const parsed = Number(clean);

  return Number.isFinite(parsed) ? parsed : null;
}

function resolveTeamVisual(logo: string | null, code: string, fallback: string) {
  if (logo) {
    return logo;
  }

  const flagUrl = buildCountryFlagUrl(code);

  if (flagUrl) {
    return flagUrl;
  }

  return code || fallback;
}

function toAppStatus(statusShort: string) {
  if (isLiveStatus(statusShort)) {
    return 'live';
  }

  if (isFinishedStatus(statusShort)) {
    return 'finished';
  }

  return 'scheduled';
}

function getActualWinner(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return null;
  }

  if (homeScore > awayScore) {
    return 'home';
  }

  if (awayScore > homeScore) {
    return 'away';
  }

  return 'draw';
}

async function recalculateMatchSettlement(
  supabase: SupabaseClient,
  matchId: string,
  fixture: ApiFootballFixture
) {
  const actualWinner = getActualWinner(fixture.homeScore, fixture.awayScore);

  if (!actualWinner || fixture.homeScore === null || fixture.awayScore === null) {
    return false;
  }

  const { data, error } = await supabase
    .from('predictions')
    .select('bet_mode, predicted_winner, predicted_home_score, predicted_away_score, stake_amount')
    .eq('match_id', matchId);

  if (error) {
    throw new Error(error.message);
  }

  const predictions = data ?? [];
  const winnerPool = predictions
    .filter((prediction) => prediction.bet_mode === 'winner')
    .reduce((sum, prediction) => sum + Number(prediction.stake_amount ?? 0), 0);
  const exactScorePool = predictions
    .filter((prediction) => prediction.bet_mode === 'exact_score')
    .reduce((sum, prediction) => sum + Number(prediction.stake_amount ?? 0), 0);
  const winnerHits = predictions.filter(
    (prediction) =>
      prediction.bet_mode === 'winner' && prediction.predicted_winner === actualWinner
  ).length;
  const exactScoreHits = predictions.filter(
    (prediction) =>
      prediction.bet_mode === 'exact_score' &&
      Number(prediction.predicted_home_score) === fixture.homeScore &&
      Number(prediction.predicted_away_score) === fixture.awayScore
  ).length;

  const { error: settlementError } = await supabase
    .from('match_settlements')
    .upsert({
      match_id: matchId,
      winner_pool: winnerPool,
      exact_score_pool: exactScorePool,
      winner_hits: winnerHits,
      exact_score_hits: exactScoreHits,
      total_predictions: predictions.length,
      settled_at: new Date().toISOString(),
    });

  if (settlementError) {
    throw new Error(settlementError.message);
  }

  return true;
}

function mapFixtureToMatch(fixture: ApiFootballFixture): Match {
  const live = isLiveStatus(fixture.statusShort);

  return {
    id: fixture.slug,
    externalApiId: fixture.fixtureId,
    home: fixture.homeTeam,
    away: fixture.awayTeam,
    homeFlag: resolveTeamVisual(
      fixture.homeLogo,
      fixture.homeCode,
      fixture.homeTeam.slice(0, 3).toUpperCase()
    ),
    awayFlag: resolveTeamVisual(
      fixture.awayLogo,
      fixture.awayCode,
      fixture.awayTeam.slice(0, 3).toUpperCase()
    ),
    homeFlagUrl: fixture.homeLogo ?? buildCountryFlagUrl(fixture.homeCode),
    awayFlagUrl: fixture.awayLogo ?? buildCountryFlagUrl(fixture.awayCode),
    date: live ? 'EN VIVO' : formatMatchDate(fixture.kickoffAt),
    time: live ? `${fixture.elapsed ?? 0}'` : formatMatchTime(fixture.kickoffAt),
    stadium: fixture.stadium,
    group: fixture.stageLabel,
    winnerStake: 1,
    exactScoreStake: 2,
    live,
    score: buildScore(fixture.homeScore, fixture.awayScore),
    status: toAppStatus(fixture.statusShort),
    kickoffAt: fixture.kickoffAt,
  };
}

function enrichMatchWithFixture(match: Match, fixture: ApiFootballFixture): Match {
  const live = isLiveStatus(fixture.statusShort);

  return {
    ...match,
    externalApiId: match.externalApiId ?? fixture.fixtureId,
    homeFlag: resolveTeamVisual(fixture.homeLogo, fixture.homeCode, match.homeFlag),
    awayFlag: resolveTeamVisual(fixture.awayLogo, fixture.awayCode, match.awayFlag),
    homeFlagUrl: fixture.homeLogo ?? buildCountryFlagUrl(fixture.homeCode) ?? match.homeFlagUrl ?? null,
    awayFlagUrl: fixture.awayLogo ?? buildCountryFlagUrl(fixture.awayCode) ?? match.awayFlagUrl ?? null,
    date: live ? 'EN VIVO' : formatMatchDate(fixture.kickoffAt),
    time: live ? `${fixture.elapsed ?? 0}'` : formatMatchTime(fixture.kickoffAt),
    stadium: fixture.stadium || match.stadium,
    group: fixture.stageLabel || match.group,
    live,
    score: buildScore(fixture.homeScore, fixture.awayScore) ?? match.score,
    status: toAppStatus(fixture.statusShort),
    kickoffAt: fixture.kickoffAt,
  };
}

function mapApiResponseToFixtures(payload: ApiFootballResponse): ApiFootballFixture[] {
  return (payload.response ?? [])
    .map((item) => {
      const fixtureId = item.fixture?.id;
      const kickoffAt = item.fixture?.date;
      const homeTeam = item.teams?.home?.name?.trim();
      const awayTeam = item.teams?.away?.name?.trim();

      if (!fixtureId || !kickoffAt || !homeTeam || !awayTeam) {
        return null;
      }

      return {
        fixtureId,
        slug: buildFixtureSlug(homeTeam, awayTeam, fixtureId),
        homeTeam,
        awayTeam,
        homeCode: item.teams?.home?.code?.trim() ?? '',
        awayCode: item.teams?.away?.code?.trim() ?? '',
        homeLogo: item.teams?.home?.logo?.trim() ?? null,
        awayLogo: item.teams?.away?.logo?.trim() ?? null,
        kickoffAt,
        stadium: item.fixture?.venue?.name?.trim() || 'Sede por confirmar',
        stageLabel: item.league?.round?.trim() || 'Mundial 2026',
        statusShort: item.fixture?.status?.short?.trim() || 'NS',
        statusLong: item.fixture?.status?.long?.trim() || 'Not Started',
        elapsed: item.fixture?.status?.elapsed ?? null,
        homeScore: item.goals?.home ?? null,
        awayScore: item.goals?.away ?? null,
      };
    })
    .filter((item): item is ApiFootballFixture => Boolean(item))
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
}

function mapApiErrorsToNotice(errors: ApiFootballResponse['errors']) {
  if (!errors) {
    return null;
  }

  if (Array.isArray(errors)) {
    return errors.length ? errors.join(' ') : null;
  }

  const values = Object.values(errors);
  return values.length ? values.join(' ') : null;
}

async function fetchWorldCupFixturesByParams(params: URLSearchParams): Promise<FixtureFetchResult> {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();

  if (!apiKey) {
    return {
      fixtures: [],
      notice: 'Falta API_FOOTBALL_KEY en .env.',
    };
  }

  try {
    const response = await fetch(`${API_FOOTBALL_BASE_URL}/fixtures?${params.toString()}`, {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: { revalidate: LIVE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return {
        fixtures: [],
        notice: `API-Football respondio ${response.status}.`,
      };
    }

    const payload = (await response.json()) as ApiFootballResponse;
    return {
      fixtures: mapApiResponseToFixtures(payload),
      notice: mapApiErrorsToNotice(payload.errors),
    };
  } catch {
    return {
      fixtures: [],
      notice: 'No se pudo conectar con API-Football.',
    };
  }
}

export async function fetchWorldCupFixtures() {
  const params = new URLSearchParams({
    league: String(WORLD_CUP_LEAGUE_ID),
    season: String(WORLD_CUP_SEASON),
    timezone: WORLD_CUP_TIMEZONE,
  });
  const { fixtures } = await fetchWorldCupFixturesByParams(params);
  return fixtures;
}

export async function syncApiFootballLiveMatchesToSupabase(
  supabase: SupabaseClient,
  candidates: Array<{
    id: string;
    external_api_id: number | null;
    home_team: string;
    away_team: string;
    source: string | null;
  }>
): Promise<ApiFootballSyncSummary> {
  const summary: ApiFootballSyncSummary = {
    ok: true,
    checkedMatches: candidates.length,
    fetchedFixtures: 0,
    updatedMatches: 0,
    finishedMatches: 0,
    recalculatedMatches: 0,
    errors: [],
  };

  if (!candidates.length) {
    return {
      ...summary,
      skipped: true,
      notice: 'No live or upcoming matches',
    };
  }

  const params = new URLSearchParams({
    league: String(WORLD_CUP_LEAGUE_ID),
    season: String(WORLD_CUP_SEASON),
    timezone: WORLD_CUP_TIMEZONE,
    date: getBoliviaDate(),
  });
  const { fixtures, notice } = await fetchWorldCupFixturesByParams(params);
  summary.fetchedFixtures = fixtures.length;
  summary.notice = notice;

  if (notice) {
    summary.errors.push(notice);
  }

  if (!fixtures.length) {
    return summary;
  }

  const fixtureByExternalId = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const fixtureByTeams = new Map(
    fixtures.map((fixture) => [
      `${normalizeTeamName(fixture.homeTeam)}:${normalizeTeamName(fixture.awayTeam)}`,
      fixture,
    ])
  );

  for (const match of candidates) {
    const fixtureById =
      match.source === 'api-football' && match.external_api_id
        ? fixtureByExternalId.get(match.external_api_id)
        : null;
    const fixtureByName = fixtureByTeams.get(
      `${normalizeTeamName(match.home_team)}:${normalizeTeamName(match.away_team)}`
    );
    const fixture = fixtureById ?? fixtureByName;

    if (!fixture) {
      continue;
    }

    const nextStatus = toAppStatus(fixture.statusShort);
    const { error } = await supabase
      .from('matches')
      .update({
        external_api_id: fixture.fixtureId,
        home_flag: resolveTeamVisual(fixture.homeLogo, fixture.homeCode, match.home_team.slice(0, 3).toUpperCase()),
        away_flag: resolveTeamVisual(fixture.awayLogo, fixture.awayCode, match.away_team.slice(0, 3).toUpperCase()),
        kickoff_at: fixture.kickoffAt,
        stadium: fixture.stadium,
        stage_label: fixture.stageLabel,
        status: nextStatus,
        home_score: fixture.homeScore,
        away_score: fixture.awayScore,
        source: 'api-football',
        raw_data: fixture,
      })
      .eq('id', match.id);

    if (error) {
      summary.ok = false;
      summary.errors.push(error.message);
      continue;
    }

    summary.updatedMatches += 1;

    if (nextStatus === 'finished') {
      summary.finishedMatches += 1;
      const recalculated = await recalculateMatchSettlement(supabase, match.id, fixture);
      summary.recalculatedMatches += recalculated ? 1 : 0;
    }
  }

  return summary;
}

export async function fetchWorldCupMatchFeed({
  view = 'live',
  date = getBoliviaDate(),
}: {
  view?: MatchFeedView;
  date?: string;
} = {}): Promise<MatchFeed> {
  const params = new URLSearchParams({
    league: String(WORLD_CUP_LEAGUE_ID),
    timezone: WORLD_CUP_TIMEZONE,
  });

  if (view === 'live') {
    params.set('live', 'all');
  } else {
    params.set('season', String(WORLD_CUP_SEASON));

    if (view === 'today') {
      params.set('date', date);
    }
  }

  const { fixtures, notice } = await fetchWorldCupFixturesByParams(params);
  const seasonNotice =
    !fixtures.length && !notice && view !== 'live' && WORLD_CUP_SEASON === 2026
      ? 'API-Football no devolvio partidos para 2026. En planes gratis suele limitar temporadas recientes; prueba API_FOOTBALL_SEASON=2022 para validar datos historicos.'
      : notice;

  return {
    matches: mapApiFixturesToMatches(fixtures),
    view,
    date,
    notice: seasonNotice,
  };
}

async function fetchApiFootball<T>(path: string) {
  const apiKey = process.env.API_FOOTBALL_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(`${API_FOOTBALL_BASE_URL}${path}`, {
      headers: {
        'x-apisports-key': apiKey,
      },
      next: { revalidate: LIVE_REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function mergeApiScoresIntoMatches(matches: Match[], fixtures: ApiFootballFixture[]) {
  if (!fixtures.length) {
    return matches;
  }

  const byExternalId = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const byTeams = new Map(
    fixtures.map((fixture) => [
      `${normalizeTeamName(fixture.homeTeam)}:${normalizeTeamName(fixture.awayTeam)}`,
      fixture,
    ])
  );

  return matches.map((match) => {
    const byId = match.externalApiId ? byExternalId.get(match.externalApiId) : null;
    const byName = byTeams.get(
      `${normalizeTeamName(match.home)}:${normalizeTeamName(match.away)}`
    );
    const fixture = byId ?? byName;

    return fixture ? enrichMatchWithFixture(match, fixture) : match;
  });
}

export function mapApiFixturesToMatches(fixtures: ApiFootballFixture[]) {
  return fixtures.map(mapFixtureToMatch);
}

export function findApiFixtureMatchBySlug(matches: Match[], slug: string) {
  return matches.find((match) => match.id === slug) ?? null;
}

export async function getMatchLiveDetails(fixtureId?: number | null): Promise<MatchLiveDetails> {
  if (!fixtureId) {
    return {
      statistics: [],
      lineups: [],
      events: [],
    };
  }

  const [statisticsPayload, lineupsPayload, eventsPayload] = await Promise.all([
    fetchApiFootball<ApiFootballStatisticsResponse>(`/fixtures/statistics?fixture=${fixtureId}`),
    fetchApiFootball<ApiFootballLineupsResponse>(`/fixtures/lineups?fixture=${fixtureId}`),
    fetchApiFootball<ApiFootballEventsResponse>(`/fixtures/events?fixture=${fixtureId}`),
  ]);

  const statistics = mapStatisticsPayload(statisticsPayload);
  const lineups = mapLineupsPayload(lineupsPayload);
  const events = mapEventsPayload(eventsPayload);

  return { statistics, lineups, events };
}

function mapStatisticsPayload(payload: ApiFootballStatisticsResponse | null): MatchLiveStat[] {
  const teams = payload?.response ?? [];

  if (teams.length < 2) {
    return [] as MatchLiveStat[];
  }

  const [homeStats, awayStats] = teams;
  const awayMap = new Map(
    (awayStats.statistics ?? []).map((item) => [item.type?.trim() ?? '', item.value ?? null])
  );

  return (homeStats.statistics ?? [])
    .map((item) => {
      const label = item.type?.trim();

      if (!label) {
        return null;
      }

      const homeValue = item.value ?? '0';
      const awayValue = awayMap.get(label) ?? '0';
      const homeNumeric = parseNumericStat(homeValue);
      const awayNumeric = parseNumericStat(awayValue);
      const total = (homeNumeric ?? 0) + (awayNumeric ?? 0);
      const homePercent =
        total > 0 ? Math.max(8, Math.min(92, Math.round(((homeNumeric ?? 0) / total) * 100))) : 50;

      return {
        label,
        homeValue: String(homeValue),
        awayValue: String(awayValue),
        homePercent,
      } satisfies MatchLiveStat;
    })
    .filter((item): item is MatchLiveStat => Boolean(item))
    .slice(0, 6);
}

function mapLineupsPayload(payload: ApiFootballLineupsResponse | null): MatchLineup[] {
  const lineups: MatchLineup[] = [];

  for (const item of payload?.response ?? []) {
    const teamName = item.team?.name?.trim();

    if (!teamName) {
      continue;
    }

    lineups.push({
      teamName,
      formation: item.formation ?? null,
      players: (item.startXI ?? [])
        .map((playerItem) => ({
          name: playerItem.player?.name?.trim() ?? '',
          number: playerItem.player?.number ?? null,
          position: playerItem.player?.pos ?? null,
        }))
        .filter((player) => Boolean(player.name)),
    });
  }

  return lineups;
}

function mapEventsPayload(payload: ApiFootballEventsResponse | null): MatchEvent[] {
  const events: MatchEvent[] = [];

  for (const item of payload?.response ?? []) {
    const elapsed = item.time?.elapsed;
    const extra = item.time?.extra;
    const teamName = item.team?.name?.trim() ?? '';
    const type = item.type?.trim() ?? 'Evento';
    const detail = item.detail?.trim() ?? null;
    const playerName = item.player?.name?.trim() ?? null;

    if (!elapsed || !teamName) {
      continue;
    }

    events.push({
      time: extra ? `${elapsed}+${extra}'` : `${elapsed}'`,
      teamName,
      type,
      detail,
      playerName,
    });
  }

  return events.slice(-10).reverse();
}
