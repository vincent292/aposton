export type Match = {
  id: string;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  time: string;
  stadium: string;
  group: string;
  oddsWinner: string;
  oddsScore: string;
  live?: boolean;
  score?: string;
};

export const matches: Match[] = [
  {
    id: 'argentina-mexico',
    home: 'Argentina',
    away: 'México',
    homeFlag: '🇦🇷',
    awayFlag: '🇲🇽',
    date: '15 JUN 2026',
    time: '18:00',
    stadium: 'Estadio Azteca',
    group: 'Grupo A',
    oddsWinner: 'Bs 12.50',
    oddsScore: 'Bs 25.80',
  },
  {
    id: 'brasil-francia',
    home: 'Brasil',
    away: 'Francia',
    homeFlag: '🇧🇷',
    awayFlag: '🇫🇷',
    date: '20 JUN 2026',
    time: '16:00',
    stadium: 'Estadio Lusail',
    group: 'Clásico familiar',
    oddsWinner: 'Bs 14.20',
    oddsScore: 'Bs 28.90',
  },
  {
    id: 'portugal-alemania',
    home: 'Portugal',
    away: 'Alemania',
    homeFlag: '🇵🇹',
    awayFlag: '🇩🇪',
    date: 'EN VIVO',
    time: '65:23',
    stadium: 'Arena Internacional',
    group: 'Partido en vivo',
    oddsWinner: 'Bs 9.70',
    oddsScore: 'Bs 21.40',
    live: true,
    score: '1 - 1',
  },
  {
    id: 'espana-italia',
    home: 'España',
    away: 'Italia',
    homeFlag: '🇪🇸',
    awayFlag: '🇮🇹',
    date: '22 JUN 2026',
    time: '19:30',
    stadium: 'MetLife Stadium',
    group: 'Grupo B',
    oddsWinner: 'Bs 10.60',
    oddsScore: 'Bs 24.10',
  },
  {
    id: 'uruguay-eeuu',
    home: 'Uruguay',
    away: 'Estados Unidos',
    homeFlag: '🇺🇾',
    awayFlag: '🇺🇸',
    date: '24 JUN 2026',
    time: '20:00',
    stadium: 'SoFi Stadium',
    group: 'Grupo C',
    oddsWinner: 'Bs 11.80',
    oddsScore: 'Bs 22.30',
  },
];

export const rankings = [
  { position: 1, name: 'Carlos Ramírez', amount: 'Bs 56', trend: '+12', medal: '🏆' },
  { position: 2, name: 'María López', amount: 'Bs 52', trend: '+8', medal: '🥈' },
  { position: 3, name: 'Juan Pérez', amount: 'Bs -13', trend: '-2', medal: '🥉' },
  { position: 4, name: 'Pedro Sánchez', amount: 'Bs -20', trend: '-4', medal: '⚽' },
  { position: 5, name: 'Ana Torres', amount: 'Bs -34', trend: '-9', medal: '⚽' },
];
