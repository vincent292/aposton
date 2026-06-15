import type { PredictedWinner } from './types';

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();
const isoDateFormatterCache = new Map<string, Intl.DateTimeFormat>();

const currencyFormatter = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function getDateFormatter(timeZone?: string | null) {
  const cacheKey = timeZone ?? 'default';

  if (!dateFormatterCache.has(cacheKey)) {
    dateFormatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat('es-BO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...(timeZone ? { timeZone } : {}),
      })
    );
  }

  return dateFormatterCache.get(cacheKey)!;
}

function getTimeFormatter(timeZone?: string | null) {
  const cacheKey = timeZone ?? 'default';

  if (!timeFormatterCache.has(cacheKey)) {
    timeFormatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat('es-BO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...(timeZone ? { timeZone } : {}),
      })
    );
  }

  return timeFormatterCache.get(cacheKey)!;
}

function getIsoDateFormatter(timeZone?: string | null) {
  const cacheKey = timeZone ?? 'default';

  if (!isoDateFormatterCache.has(cacheKey)) {
    isoDateFormatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(timeZone ? { timeZone } : {}),
      })
    );
  }

  return isoDateFormatterCache.get(cacheKey)!;
}

export function formatMatchDate(value: string, timeZone?: string | null) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return getDateFormatter(timeZone)
    .format(date)
    .replace('.', '')
    .replace(',', '')
    .toUpperCase();
}

export function formatMatchTime(value: string, timeZone?: string | null) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return getTimeFormatter(timeZone).format(date);
}

export function formatMatchCalendarDate(value: string, timeZone?: string | null) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return getIsoDateFormatter(timeZone).format(date);
}

export function formatCurrency(amount: number) {
  return `Bs ${currencyFormatter.format(amount)}`;
}

export function getPredictedWinnerFromScore(
  homeScore: number,
  awayScore: number
): PredictedWinner {
  if (homeScore > awayScore) {
    return 'home';
  }

  if (awayScore > homeScore) {
    return 'away';
  }

  return 'draw';
}

export function buildScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return undefined;
  }

  return `${homeScore} - ${awayScore}`;
}

export function formatPredictedWinner(
  value: PredictedWinner | null,
  labels: { home: string; away: string }
) {
  if (value === 'home') {
    return labels.home;
  }

  if (value === 'away') {
    return labels.away;
  }

  if (value === 'draw') {
    return 'Empate';
  }

  return 'Sin definir';
}
