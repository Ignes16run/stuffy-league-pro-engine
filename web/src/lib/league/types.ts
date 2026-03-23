// Last Updated: 2026-03-21T14:48:00-04:00
export type StuffyIcon = 'TeddyBear' | 'Bunny' | 'Elephant' | 'Cat' | 'Dog' | 'Panda' | 'Lion' | 'Monkey';

export interface Team {
  id: string;
  name: string;
  icon: StuffyIcon;
  logoUrl?: string;
  logoPrompt?: string;
  primaryColor: string;
  secondaryColor: string;
  offenseRating?: number;
  defenseRating?: number;
  specialTeamsRating?: number;
  overallRating?: number;
  stuffyPoints?: number;
  allTimeWins?: number;
  championships?: number;
  rivalTeamIds?: string[];
}

export interface Game {
  id: string;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  winnerId?: string; // undefined means not played yet
  homeScore?: number;
  awayScore?: number;
  isTie?: boolean;
}

export interface Standing {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  streak: string;
  rank: number;
}

export interface PlayoffGame {
  id: string;
  round: number; // 1: Quarterfinals, 2: Semifinals, 3: Championship
  matchupIndex: number;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  seed1?: number;
  seed2?: number;
  team1Score?: number;
  team2Score?: number;
}

export interface SeasonHistory {
  year: number;
  championId: string;
  finalStandings: Standing[];
}

export interface LeagueState {
  teams: Team[];
  players: Player[];
  games: Game[];
  playoffGames: PlayoffGame[];
  currentWeek: number;
  history: SeasonHistory[];
  recentNarrativesUsed: NarrativeMemoryEntry[];
}

export type AwardType = 'MVP' | 'OPOY' | 'DPOY' | 'STPOY' | 'CHAMPION';

export interface AwardsHistoryEntry {
  awardType: AwardType;
  seasonId: string; // Year or unique ID
}

export interface NarrativeMemoryEntry {
  templateId: string;
  seasonId: string;
}

export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'EDGE' | 'CB' | 'S' | 'LB' | 'K' | 'P';

export interface PlayerStats {
  gamesPlayed: number;
  touchdowns?: number;
  yards?: number;
  tackles?: number;
  interceptions?: number;
  points?: number;
  assists?: number;
  sacks?: number;
  stuffyPointsEarned?: number;
  // QB Specific
  passingYards?: number;
  passingTds?: number;
  interceptionsThrown?: number;
  completionPct?: number;
  
  // RB Specific
  rushingYards?: number;
  rushingTds?: number;
  carries?: number;
  
  // WR / TE Specific
  receivingYards?: number;
  receivingTds?: number;
  receptions?: number;

  // Defensive Specific (DL, LB, DB)
  pressures?: number;
  tacklesForLoss?: number;
  passDeflections?: number;
  fgMade?: number;
  xpMade?: number;
}

export interface PlayerAward {
  year: number;
  awardType: 'MVP' | 'OPOY' | 'DPOY' | 'STPOY' | 'CHAMPION';
  playerTeam: string; // Team name or ID at time of award
  statsAtTime?: Partial<PlayerStats>;
}

export interface PlayerAbility {
  name: string;
  value: number;
  description: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  profilePicture?: string;
  profile?: string; // Character profile/bio
  archetype?: string; 
  jerseyNumber?: string;
  position: PlayerPosition;
  rating: number; // 0-100 overall
  abilities: PlayerAbility[];
  stats: PlayerStats; // Current season stats
  careerStats?: PlayerStats; // All-time totals
  awards?: PlayerAward[];
  awardsHistory?: AwardsHistoryEntry[];
}
