const DEFAULT_WORLD_CUP_OFFSET = '-04:00';

const STADIUM_TIMEZONE_RULES = [
  { match: ['estadio azteca', 'mexico city stadium', 'mexico city'], timeZone: 'America/Mexico_City' },
  { match: ['estadio akron', 'estadio guadalajara', 'guadalajara', 'zapopan'], timeZone: 'America/Mexico_City' },
  { match: ['estadio bbva', 'estadio monterrey', 'monterrey', 'guadalupe'], timeZone: 'America/Monterrey' },
  { match: ['at&t stadium', 'dallas stadium', 'arlington', 'dallas'], timeZone: 'America/Chicago' },
  { match: ['nrg stadium', 'houston stadium', 'houston'], timeZone: 'America/Chicago' },
  { match: ['arrowhead stadium', 'kansas city stadium', 'kansas city'], timeZone: 'America/Chicago' },
  { match: ['mercedes-benz stadium', 'atlanta stadium', 'atlanta'], timeZone: 'America/New_York' },
  { match: ['hard rock stadium', 'miami stadium', 'miami gardens', 'miami'], timeZone: 'America/New_York' },
  { match: ['gillette stadium', 'boston stadium', 'foxborough', 'boston'], timeZone: 'America/New_York' },
  { match: ['lincoln financial field', 'philadelphia stadium', 'philadelphia'], timeZone: 'America/New_York' },
  { match: ['metlife stadium', 'new york/new jersey stadium', 'east rutherford'], timeZone: 'America/New_York' },
  { match: ['bmo field', 'toronto stadium', 'toronto'], timeZone: 'America/Toronto' },
  { match: ['bc place vancouver', 'bc place', 'vancouver'], timeZone: 'America/Vancouver' },
  { match: ['lumen field', 'seattle stadium', 'seattle'], timeZone: 'America/Los_Angeles' },
  { match: ['levi\'s stadium', 'san francisco bay area stadium', 'santa clara', 'san francisco bay area'], timeZone: 'America/Los_Angeles' },
  { match: ['sofi stadium', 'los angeles stadium', 'inglewood', 'los angeles'], timeZone: 'America/Los_Angeles' },
] as const;

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function normalizeText(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getDateTimeFormatter(timeZone: string) {
  const cacheKey = `date-time:${timeZone}`;

  if (!dateFormatterCache.has(cacheKey)) {
    dateFormatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    );
  }

  return dateFormatterCache.get(cacheKey)!;
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const formatter = getDateTimeFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)])
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;

  const zonedUtcTimestamp = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return zonedUtcTimestamp - date.getTime();
}

function buildIsoFromLocalParts(
  year: string,
  month: string,
  day: string,
  hour: string,
  minute: string
) {
  return `${year}-${month}-${day}T${hour}:${minute}:00${DEFAULT_WORLD_CUP_OFFSET}`;
}

export function resolveVenueTimeZone({
  stadium,
  city,
  country,
}: {
  stadium?: string | null;
  city?: string | null;
  country?: string | null;
}) {
  const haystack = [stadium, city, country].map(normalizeText).filter(Boolean).join(' | ');

  if (!haystack) {
    return null;
  }

  const rule = STADIUM_TIMEZONE_RULES.find((item) =>
    item.match.some((candidate) => haystack.includes(candidate))
  );

  return rule?.timeZone ?? null;
}

export function parseVenueLocalDate(value: unknown, timeZone?: string | null) {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);

  if (!match) {
    return new Date().toISOString();
  }

  const [, month, day, year, hour, minute] = match;

  if (!timeZone) {
    return buildIsoFromLocalParts(year, month, day, hour, minute);
  }

  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0
  );

  let zonedTimestamp = utcGuess - getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone);
  const recalculatedOffset = getTimeZoneOffsetMilliseconds(new Date(zonedTimestamp), timeZone);
  zonedTimestamp = utcGuess - recalculatedOffset;

  return new Date(zonedTimestamp).toISOString();
}
