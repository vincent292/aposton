import type { PredictedWinner } from './types';

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/La_Paz',
});

const timeFormatter = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/La_Paz',
});

const currencyFormatter = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMatchDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter
    .format(date)
    .replace('.', '')
    .replace(',', '')
    .toUpperCase();
}

export function formatMatchTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return timeFormatter.format(date);
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
