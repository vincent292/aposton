const TEAM_NAME_TRANSLATIONS: Record<string, string> = {
  'Mexico': 'Mexico',
  'South Africa': 'Sudafrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Republica Checa',
  'Canada': 'Canada',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Qatar': 'Catar',
  'Switzerland': 'Suiza',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haiti',
  'Scotland': 'Escocia',
  'United States': 'Estados Unidos',
  'Paraguay': 'Paraguay',
  'Australia': 'Australia',
  'Turkey': 'Turquia',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Netherlands': 'Paises Bajos',
  'Japan': 'Japon',
  'Sweden': 'Suecia',
  'Tunisia': 'Tunez',
  'Belgium': 'Belgica',
  'Egypt': 'Egipto',
  'Iran': 'Iran',
  'New Zealand': 'Nueva Zelanda',
  'Spain': 'Espana',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  'Uruguay': 'Uruguay',
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  'Portugal': 'Portugal',
  'Democratic Republic of the Congo': 'Republica Democratica del Congo',
  'Uzbekistan': 'Uzbekistan',
  'Colombia': 'Colombia',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panama',
};

const directTranslations = new Map(
  Object.entries(TEAM_NAME_TRANSLATIONS).map(([english, spanish]) => [
    normalizeNameKey(english),
    spanish,
  ])
);

function normalizeNameKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function translateKnockoutLabel(value: string) {
  const winnerMatch = value.match(/^Winner Match (\d+)$/i);

  if (winnerMatch) {
    return `Ganador Partido ${winnerMatch[1]}`;
  }

  const loserMatch = value.match(/^Loser Match (\d+)$/i);

  if (loserMatch) {
    return `Perdedor Partido ${loserMatch[1]}`;
  }

  const winnerGroup = value.match(/^Winner Group ([A-Z])$/i);

  if (winnerGroup) {
    return `Ganador Grupo ${winnerGroup[1].toUpperCase()}`;
  }

  const runnerUpGroup = value.match(/^Runner-up Group ([A-Z])$/i);

  if (runnerUpGroup) {
    return `Segundo Grupo ${runnerUpGroup[1].toUpperCase()}`;
  }

  const thirdGroup = value.match(/^3rd Group ([A-Z/]+)$/i);

  if (thirdGroup) {
    return `Tercero Grupo ${thirdGroup[1].toUpperCase()}`;
  }

  return value;
}

export function translateTeamName(value?: string | null) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const direct = directTranslations.get(normalizeNameKey(trimmed));

  if (direct) {
    return direct;
  }

  return translateKnockoutLabel(trimmed);
}
