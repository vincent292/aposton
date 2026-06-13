export type BetMode = 'winner' | 'exact_score';
export type PredictedWinner = 'home' | 'draw' | 'away';

export type Match = {
  id: string;
  recordId?: string;
  externalApiId?: number | null;
  home: string;
  away: string;
  homeFlag: string;
  awayFlag: string;
  homeFlagUrl?: string | null;
  awayFlagUrl?: string | null;
  date: string;
  time: string;
  stadium: string;
  group: string;
  winnerStake: number;
  exactScoreStake: number;
  live?: boolean;
  score?: string;
  status?: string;
  kickoffAt?: string;
};

export type MatchLiveStat = {
  label: string;
  homeValue: string;
  awayValue: string;
  homePercent: number;
};

export type MatchLineupPlayer = {
  name: string;
  number?: number | null;
  position?: string | null;
};

export type MatchLineup = {
  teamName: string;
  formation?: string | null;
  players: MatchLineupPlayer[];
};

export type MatchEvent = {
  time: string;
  teamName: string;
  type: string;
  detail?: string | null;
  playerName?: string | null;
};

export type MatchLiveDetails = {
  statistics: MatchLiveStat[];
  lineups: MatchLineup[];
  events: MatchEvent[];
};

export type MatchFeedView = 'live' | 'today' | 'all';

export type MatchFeed = {
  matches: Match[];
  view: MatchFeedView;
  date: string;
  notice?: string | null;
};

export type ExistingPrediction = {
  id: string;
  betMode: BetMode;
  predictedWinner: PredictedWinner | null;
  homeScore: number | null;
  awayScore: number | null;
  stakeAmount: number;
  editCount: number;
  canEdit: boolean;
};

export type Viewer = {
  id: string;
  email: string | null;
  fullName: string | null;
};

export type RankingItem = {
  position: number;
  name: string;
  totalStaked: number;
  predictionsCount: number;
  medal: string;
};

export type UserDashboardSummary = {
  totalStaked: number;
  predictionsCount: number;
  editedPredictions: number;
};
