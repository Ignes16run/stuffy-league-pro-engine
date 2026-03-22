// Last Updated: 2026-03-22T21:35:00Z
import { Player, PlayerPosition, PlayerStats, AwardType } from './types';

export type PositionGroup = 'OFFENSE' | 'DEFENSE' | 'SPECIAL_TEAMS';

export const POSITION_GROUPS: Record<PositionGroup, PlayerPosition[]> = {
  OFFENSE: ['QB', 'RB', 'WR', 'TE', 'OL'],
  DEFENSE: ['DL', 'EDGE', 'LB', 'CB', 'S'],
  SPECIAL_TEAMS: ['K', 'P']
} as const;

export interface PositionConfig {
  isEnabled: boolean;
  statCategories: (keyof PlayerStats)[];
  eligibleAwards: AwardType[];
}

export const POSITION_CONFIGS: Record<PlayerPosition, PositionConfig> = {
  QB: {
    isEnabled: true,
    statCategories: ['passingYards', 'passingTds', 'interceptionsThrown', 'completionPct', 'gamesPlayed'],
    eligibleAwards: ['MVP', 'OPOY']
  },
  RB: {
    isEnabled: true,
    statCategories: ['rushingYards', 'rushingTds', 'receptions', 'yards', 'touchdowns', 'gamesPlayed'],
    eligibleAwards: ['MVP', 'OPOY']
  },
  WR: {
    isEnabled: true,
    statCategories: ['receivingYards', 'receivingTds', 'receptions', 'yards', 'touchdowns', 'gamesPlayed'],
    eligibleAwards: ['MVP', 'OPOY']
  },
  TE: {
    isEnabled: true,
    statCategories: ['receivingYards', 'receivingTds', 'receptions', 'yards', 'touchdowns', 'gamesPlayed'],
    eligibleAwards: ['OPOY']
  },
  OL: {
    isEnabled: true,
    statCategories: ['gamesPlayed'],
    eligibleAwards: []
  },
  DL: {
    isEnabled: true,
    statCategories: ['tackles', 'sacks', 'tacklesForLoss', 'gamesPlayed'],
    eligibleAwards: ['DPOY']
  },
  EDGE: {
    isEnabled: true,
    statCategories: ['tackles', 'sacks', 'tacklesForLoss', 'gamesPlayed'],
    eligibleAwards: ['DPOY']
  },
  LB: {
    isEnabled: true,
    statCategories: ['tackles', 'sacks', 'interceptions', 'gamesPlayed'],
    eligibleAwards: ['DPOY']
  },
  CB: {
    isEnabled: true,
    statCategories: ['tackles', 'interceptions', 'passDeflections', 'gamesPlayed'],
    eligibleAwards: ['DPOY']
  },
  S: {
    isEnabled: true,
    statCategories: ['tackles', 'interceptions', 'passDeflections', 'gamesPlayed'],
    eligibleAwards: ['DPOY']
  },
  K: {
    isEnabled: true,
    statCategories: ['points', 'gamesPlayed'],
    eligibleAwards: ['STPOY']
  },
  P: {
    isEnabled: false, // Option A: Disable Punter
    statCategories: ['gamesPlayed'],
    eligibleAwards: ['STPOY']
  }
};

/**
 * Returns only positions that are currently enabled in the system
 */
export function getActivePositions(): PlayerPosition[] {
  return (Object.keys(POSITION_CONFIGS) as PlayerPosition[]).filter(
    pos => POSITION_CONFIGS[pos].isEnabled
  );
}

/**
 * Returns whether a position is eligible for a specific award
 */
export function isEligibleForAward(pos: PlayerPosition, awardType: string): boolean {
  const config = POSITION_CONFIGS[pos];
  if (!config || !config.isEnabled) return false;
  return config.eligibleAwards.includes(awardType as AwardType);
}

/**
 * Returns a weighted value based on a player's relevant rating for a stat
 */
export function getRatingInfluencedValue(player: Player, ratingName: string, base: number): number {
  const ability = player.abilities.find((a) => a.name === ratingName);
  const factor = ability ? (ability.value / 100) : (player.rating / 100);
  return Math.round(base * (0.8 + factor * 0.4)); // Range from 0.8 to 1.2 of base
}
