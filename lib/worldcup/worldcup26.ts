import type { SupabaseClient } from '@supabase/supabase-js';
import type { Match } from '@/lib/quiniela/types';
import { buildScore, formatMatchDate, formatMatchTime } from '@/lib/quiniela/format';
import { translateTeamName } from '@/lib/quiniela/team-names';
import { parseVenueLocalDate, resolveVenueTimeZone } from '@/lib/quiniela/venue-time';

const WORLDCUP26_BASE_URL = process.env.WORLDCUP26_BASE_URL ?? 'http://worldcup26.ir/get';
const REQUEST_REVALIDATE_SECONDS = 60;
type UnknownRecord = Record<string, unknown>;

type WorldCup26Team = {
  id: string;
  nameEn: string;
  flag: string | null;
  fifaCode: string | null;
  group: string | null;
};

type WorldCup26Stadium = {
  id: string;
  nameEn: string;
  fifaName: string | null;
  cityEn: string | null;
  countryEn: string | null;
};

type NormalizedWorldCup26Game = {
  externalApiId: number;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string;
  stadium: string | null;
  venueTimeZone: string | null;
  stageLabel: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled';
  homeScore: number | null;
  awayScore: number | null;
  rawData: UnknownRecord;
};

type SyncSummary = {
  ok: boolean;
  syncedGames: number;
  updatedMatches: number;
  finishedMatches: number;
  recalculatedMatches: number;
  errors: string[];
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    return Object.values(value);
  }

  return [];
}

function stringValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
}

function nullableString(value: unknown) {
  const text = stringValue(value);
  return text || null;
}

function numberValue(value: unknown) {
  const text = stringValue(value);

  if (!text || text.toLowerCase() === 'null') {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapWorldCupStatus(game: UnknownRecord) {
  const finished = stringValue(game.finished).toLowerCase();
  const elapsed = stringValue(game.time_elapsed).toLowerCase();

  if (finished === 'true' || elapsed === 'finished') {
    return 'finished' as const;
  }

  if (elapsed && elapsed !== 'notstarted' && elapsed !== 'not started' && elapsed !== '0') {
    return 'live' as const;
  }

  return 'scheduled' as const;
}

async function fetchWorldCup26Resource(resource: 'games' | 'groups' | 'teams' | 'stadiums') {
  const response = await fetch(`${WORLDCUP26_BASE_URL}/${resource}`, {
    next: { revalidate: REQUEST_REVALIDATE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`WorldCup26 ${resource} respondio ${response.status}.`);
  }

  return await response.json() as unknown;
}

export async function getWorldCupGames() {
  const payload = asRecord(await fetchWorldCup26Resource('games'));
  return asArray(payload.games);
}

export async function getWorldCupGroups() {
  const payload = asRecord(await fetchWorldCup26Resource('groups'));
  return asArray(payload.groups);
}

export async function getWorldCupTeams() {
  const payload = asRecord(await fetchWorldCup26Resource('teams'));

  return asArray(payload.teams).map((item) => {
    const team = asRecord(item);

    return {
      id: stringValue(team.id),
      nameEn: stringValue(team.name_en),
      flag: nullableString(team.flag),
      fifaCode: nullableString(team.fifa_code),
      group: nullableString(team.groups),
    } satisfies WorldCup26Team;
  }).filter((team) => team.id && team.nameEn);
}

export async function getWorldCupStadiums() {
  const payload = asRecord(await fetchWorldCup26Resource('stadiums'));

  return asArray(payload.stadiums).map((item) => {
    const stadium = asRecord(item);

    return {
      id: stringValue(stadium.id),
      nameEn: stringValue(stadium.name_en),
      fifaName: nullableString(stadium.fifa_name),
      cityEn: nullableString(stadium.city_en),
      countryEn: nullableString(stadium.country_en),
    } satisfies WorldCup26Stadium;
  }).filter((stadium) => stadium.id && stadium.nameEn);
}

export function normalizeWorldCupGame({
  game,
  teamsById,
  stadiumsById,
}: {
  game: unknown;
  teamsById: Map<string, WorldCup26Team>;
  stadiumsById: Map<string, WorldCup26Stadium>;
}): NormalizedWorldCup26Game | null {
  const rawData = asRecord(game);
  const externalApiId = numberValue(rawData.id);

  if (externalApiId === null) {
    return null;
  }

  const homeTeamId = stringValue(rawData.home_team_id);
  const awayTeamId = stringValue(rawData.away_team_id);
  const homeTeamInfo = teamsById.get(homeTeamId);
  const awayTeamInfo = teamsById.get(awayTeamId);
  const homeTeam = stringValue(rawData.home_team_name_en) || homeTeamInfo?.nameEn || 'Local';
  const awayTeam = stringValue(rawData.away_team_name_en) || awayTeamInfo?.nameEn || 'Visitante';
  const stadium = stadiumsById.get(stringValue(rawData.stadium_id));
  const venueTimeZone = resolveVenueTimeZone({
    stadium: stadium?.fifaName ?? stadium?.nameEn ?? null,
    city: stadium?.cityEn ?? null,
    country: stadium?.countryEn ?? null,
  });
  const kickoffAt = parseVenueLocalDate(rawData.local_date, venueTimeZone);
  const status = mapWorldCupStatus(rawData);
  const stageType = stringValue(rawData.type);
  const group = stringValue(rawData.group);
  const matchday = stringValue(rawData.matchday);
  const stageLabel = stageType === 'group'
    ? `Grupo ${group}${matchday ? ` - Fecha ${matchday}` : ''}`
    : stageType || 'Mundial 2026';

  return {
    externalApiId,
    slug: `${slugify(homeTeam)}-${slugify(awayTeam)}-${externalApiId}`,
    homeTeam,
    awayTeam,
    homeFlag: homeTeamInfo?.flag ?? null,
    awayFlag: awayTeamInfo?.flag ?? null,
    kickoffAt,
    stadium: stadium?.fifaName ?? stadium?.nameEn ?? null,
    venueTimeZone,
    stageLabel,
    status,
    homeScore: numberValue(rawData.home_score),
    awayScore: numberValue(rawData.away_score),
    rawData,
  };
}

export function worldCupGameToMatch(game: NormalizedWorldCup26Game): Match {
  const live = game.status === 'live';
  const homeLabel = translateTeamName(game.homeTeam);
  const awayLabel = translateTeamName(game.awayTeam);

  return {
    id: game.slug,
    externalApiId: game.externalApiId,
    home: homeLabel || game.homeTeam,
    away: awayLabel || game.awayTeam,
    homeFlag: game.homeFlag ?? game.homeTeam.slice(0, 3).toUpperCase(),
    awayFlag: game.awayFlag ?? game.awayTeam.slice(0, 3).toUpperCase(),
    homeFlagUrl: game.homeFlag,
    awayFlagUrl: game.awayFlag,
    date: live ? 'EN VIVO' : formatMatchDate(game.kickoffAt, game.venueTimeZone),
    time: live ? 'Ahora' : formatMatchTime(game.kickoffAt, game.venueTimeZone),
    stadium: game.stadium ?? 'Sede por confirmar',
    venueTimeZone: game.venueTimeZone,
    group: game.stageLabel,
    winnerStake: 1,
    exactScoreStake: 2,
    live,
    score: buildScore(game.homeScore, game.awayScore),
    status: game.status,
    kickoffAt: game.kickoffAt,
  };
}

export async function getWorldCupMatches() {
  const [games, teams, stadiums] = await Promise.all([
    getWorldCupGames(),
    getWorldCupTeams(),
    getWorldCupStadiums(),
  ]);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const stadiumsById = new Map(stadiums.map((stadium) => [stadium.id, stadium]));

  return games
    .map((game) => normalizeWorldCupGame({ game, teamsById, stadiumsById }))
    .filter((game): game is NormalizedWorldCup26Game => Boolean(game));
}

export async function syncWorldCupGamesToSupabase(supabase: SupabaseClient): Promise<SyncSummary> {
  const summary: SyncSummary = {
    ok: true,
    syncedGames: 0,
    updatedMatches: 0,
    finishedMatches: 0,
    recalculatedMatches: 0,
    errors: [],
  };

  try {
    const games = await getWorldCupMatches();
    summary.syncedGames = games.length;
    summary.finishedMatches = games.filter((game) => game.status === 'finished').length;

    if (!games.length) {
      return summary;
    }

    const payload = games.map((game) => ({
      external_api_id: game.externalApiId,
      slug: game.slug,
      home_team: game.homeTeam,
      away_team: game.awayTeam,
      home_flag: game.homeFlag,
      away_flag: game.awayFlag,
      kickoff_at: game.kickoffAt,
      stadium: game.stadium,
      stage_label: game.stageLabel,
      status: game.status,
      home_score: game.homeScore,
      away_score: game.awayScore,
      source: 'worldcup26',
      raw_data: game.rawData,
    }));

    const { data, error } = await supabase
      .from('matches')
      .upsert(payload, { onConflict: 'external_api_id' })
      .select('id');

    if (error) {
      summary.ok = false;
      summary.errors.push(error.message);
      return summary;
    }

    summary.updatedMatches = data?.length ?? payload.length;
    return summary;
  } catch (error) {
    summary.ok = false;
    summary.errors.push(error instanceof Error ? error.message : 'Error desconocido en sync.');
    return summary;
  }
}
