// Last Updated: 2026-03-23T10:20:00-04:00
import { Team, Player, Game, SeasonHistory, PlayoffGame, PlayerStats } from './types';
import { syncTeamStructures } from './structureEngine';

export const CURRENT_DATA_VERSION = 3;

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
  awardResults: Record<string, any>;
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
export function migrateData(data: any): PersistedData {
  if (!data) return {
    teams: [], players: [], games: [], playoffGames: [],
    currentWeek: 1, numWeeks: 14, history: [],
    isAwardsPhase: false, awardFinalists: {}, selectedAwards: {}, awardResults: {}
  };

  const migratedData = { ...data };
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

  return migratedData as PersistedData;
}
