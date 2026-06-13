import type { Match } from './types';

const PREDICTION_CLOSE_MINUTES = 10;

export function isPredictionOpen(match: Pick<Match, 'kickoffAt' | 'status'>) {
  if (match.status === 'live' || match.status === 'finished' || match.status === 'cancelled') {
    return false;
  }

  if (!match.kickoffAt) {
    return false;
  }

  const kickoffTime = new Date(match.kickoffAt).getTime();

  if (Number.isNaN(kickoffTime)) {
    return false;
  }

  return Date.now() < kickoffTime - PREDICTION_CLOSE_MINUTES * 60 * 1000;
}

export function getPredictionClosedMessage(match: Pick<Match, 'status'>) {
  if (match.status === 'live') {
    return 'El partido ya esta en vivo.';
  }

  if (match.status === 'finished') {
    return 'El partido ya finalizo.';
  }

  if (match.status === 'cancelled') {
    return 'El partido fue cancelado.';
  }

  return 'Las apuestas cierran 10 minutos antes del inicio.';
}
