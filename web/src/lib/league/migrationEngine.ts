// Updated: 2026-03-31T16:34:00-04:00
import { Team, Player, Game, SeasonHistory, PlayoffGame, PlayerStats, NewsStory } from './types';
import { syncTeamStructures } from './structureEngine';

export const CURRENT_DATA_VERSION = 5;

export interface PersistedData {
  version?: number;
  teams: Team[];
  players: Player[];
  games: Game[];
  playoffGames: PlayoffGame[];
  currentWeek: number;
  numWeeks: number;
  history: SeasonHistory[];
  isAwardsPhase: boolean;
  awardFinalists: Record<string, Player[]>;
  selectedAwards: Record<string, string>;
// Updated: 2026-03-31T16:35:00-04:00
  awardResults: Record<string, unknown>;
  news: NewsStory[];
}

/**
 * Ensures all PlayerStats objects have necessary fields populated.
 * This is a common point of failure when new stats are added.
 */
function migratePlayerStats(stats: Partial<PlayerStats>): PlayerStats {
  const defaultStats: PlayerStats = {
    gamesPlayed: stats.gamesPlayed || 0,
    touchdowns: stats.touchdowns || 0,
    yards: stats.yards || 0,
    tackles: stats.tackles || 0,
    interceptions: stats.interceptions || 0,
    points: stats.points || 0,
    assists: stats.assists || 0,
    sacks: stats.sacks || 0,
    stuffyPointsEarned: stats.stuffyPointsEarned || 0,
    passingYards: stats.passingYards || 0,
    passingTds: stats.passingTds || 0,
    interceptionsThrown: stats.interceptionsThrown || 0,
    completionPct: stats.completionPct || 0,
    rushingYards: stats.rushingYards || 0,
    rushingTds: stats.rushingTds || 0,
    carries: stats.carries || 0,
    receivingYards: stats.receivingYards || 0,
    receivingTds: stats.receivingTds || 0,
    receptions: stats.receptions || 0,
    pressures: stats.pressures || 0,
    tacklesForLoss: stats.tacklesForLoss || 0,
    passDeflections: stats.passDeflections || 0,
    fgMade: stats.fgMade || 0,
    xpMade: stats.xpMade || 0,
  };

  return { ...defaultStats, ...stats };
}

/**
 * Main migration function.
 * Incremental migrations should be added here as the DATA_VERSION increases.
 */
// Updated: 2026-03-31T16:37:00-04:00
export function migrateData(data: unknown): PersistedData {
  if (!data) return {
    teams: [], players: [], games: [], playoffGames: [],
    currentWeek: 1, numWeeks: 14, history: [],
    isAwardsPhase: false, awardFinalists: {}, selectedAwards: {}, awardResults: {},
    news: []
  };

// Updated: 2026-03-31T16:38:00-04:00
  const migratedData = { ...(data as Partial<PersistedData>) };
  const version = migratedData.version || 0;

  console.log(`Checking data migration. Current version: ${version}, Target version: ${CURRENT_DATA_VERSION}`);

  // Migration to Version 1: Ensure Player Stats exist
  if (version < 1) {
    console.log(`Migrating data from version ${version} to 1...`);
    if (migratedData.players && Array.isArray(migratedData.players)) {
      migratedData.players = migratedData.players.map((p: Player) => ({
        ...p,
        stats: migratePlayerStats(p.stats || {}),
        careerStats: migratePlayerStats(p.careerStats || {}),
      }));
    }
    if (migratedData.isAwardsPhase === undefined) migratedData.isAwardsPhase = false;
    if (!migratedData.awardFinalists) migratedData.awardFinalists = {};
    if (!migratedData.selectedAwards) migratedData.selectedAwards = {};
    if (!migratedData.awardResults) migratedData.awardResults = {};
    migratedData.version = 1;
  }

  // Migration to Version 2: Add Conference/Division support
  if (version < 2) {
    console.log(`Migrating data from version ${version} to 2 (Conferences/Divisions)...`);
    if (migratedData.teams && Array.isArray(migratedData.teams)) {
      migratedData.teams = syncTeamStructures(migratedData.teams);
    }
    migratedData.version = 2;
  }

  // Migration to Version 3: Visual Overhaul Audit & Deep Stats Sync
  if (version < 3) {
    console.log(`Migrating data from version ${version} to 3 (Visual Overhaul & Stats Check)...`);
    
    // Ensure all players (new and old) have updated stats schema for things like pressures
    if (migratedData.players && Array.isArray(migratedData.players)) {
      migratedData.players = migratedData.players.map((p: Player) => ({
        ...p,
        stats: migratePlayerStats(p.stats || {}),
        careerStats: migratePlayerStats(p.careerStats || {}),
      }));
    }

    // Default any missing top-level arrays/objects
    if (!migratedData.history) migratedData.history = [];
    if (!migratedData.playoffGames) migratedData.playoffGames = [];
    
    migratedData.version = 3;
  }

  // Migration to Version 4: Narrative Engine (Daily Stuffy)
  if (version < 4) {
    console.log(`Migrating data from version ${version} to 4 (The Daily Stuffy News Engine)...`);
    if (!migratedData.news) migratedData.news = [];
    migratedData.version = 4;
  }

// Updated: 2026-03-31T16:40:00-04:00
  // Migration to Version 5: News GameId Backfill
  if (version < 5) {
    console.log(`Migrating data from version ${version} to 5 (News GameId Backfill)...`);
    const allGames = migratedData.games;
    if (migratedData.news && Array.isArray(migratedData.news) && allGames) {
      migratedData.news = migratedData.news.map((story: NewsStory) => {
        if (story.type === 'GAME_RECAP' && !story.gameId && story.relatedTeamIds) {
          const matchingGame = allGames.find((g: Game) => 
            g.week === story.week && 
            story.relatedTeamIds?.includes(g.homeTeamId) && 
            story.relatedTeamIds?.includes(g.awayTeamId)
          );
          if (matchingGame) return { ...story, gameId: matchingGame.id };
        }
        return story;
      });
    }
    migratedData.version = 5;
  }

  return migratedData as PersistedData;
}
