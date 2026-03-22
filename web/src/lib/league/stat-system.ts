export type StatCategory = 
  | 'passingYards' | 'passingTds' | 'interceptionsThrown'
  | 'receivingYards' | 'receivingTds' | 'receptions'
  | 'rushingYards' | 'rushingTds' | 'carries'
  | 'sacks' | 'tacklesForLoss' | 'tackles'
  | 'interceptions' | 'passDeflections'
  | 'yardsPerCarry';

export interface StatCeiling {
  basePerWeek: number;
  isVolume: boolean;
}

export const STAT_CEILINGS: Record<StatCategory, StatCeiling> = {
  // Quarterbacks (QB)
  passingYards: { basePerWeek: 280, isVolume: true }, // ~4200 / 15
  passingTds: { basePerWeek: 2.33, isVolume: true }, // ~35 / 15
  interceptionsThrown: { basePerWeek: 1.0, isVolume: true }, // ~15 / 15
  
  // Wide Receivers / Tight Ends (WR/TE)
  receivingYards: { basePerWeek: 93.33, isVolume: true }, // ~1400 / 15
  receivingTds: { basePerWeek: 0.8, isVolume: true }, // ~12 / 15
  receptions: { basePerWeek: 7.33, isVolume: true }, // ~110 / 15
  
  // Running Backs (RB)
  rushingYards: { basePerWeek: 100, isVolume: true }, // ~1500 / 15
  rushingTds: { basePerWeek: 0.933, isVolume: true }, // ~14 / 15
  carries: { basePerWeek: 18.2, isVolume: true }, // ~1500 / 5.5 / 15
  yardsPerCarry: { basePerWeek: 5.5, isVolume: false }, // ~5.5 (does not scale)
  
  // Defensive Line (DL) / Linebackers (LB) / Defensive Backs (DB)
  // Approximations per week across positions, adjusted at generation time 
  sacks: { basePerWeek: 0.933, isVolume: true }, // DL ~14, LB ~10
  tacklesForLoss: { basePerWeek: 1.33, isVolume: true }, // LB ~20, DL ~18
  tackles: { basePerWeek: 9.33, isVolume: true }, // LB ~140, DB ~85, DL ~65
  interceptions: { basePerWeek: 0.466, isVolume: true }, // DB ~7
  passDeflections: { basePerWeek: 1.2, isVolume: true }, // DB ~18
};

/**
 * Calculates the total seasonal soft ceiling for a stat.
 */
export function getSeasonCeiling(statCategory: StatCategory, numWeeks: number = 15): number {
  const ceilingDef = STAT_CEILINGS[statCategory];
  if (!ceilingDef) return 0;
  if (!ceilingDef.isVolume) return ceilingDef.basePerWeek;
  return Math.round(ceilingDef.basePerWeek * numWeeks);
}

/**
 * Returns a normally distributed value around 0, with standard deviation 1.
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); 
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Validates a generated stat for a given game to ensure it aligns with the 
 * soft ceilings using a natural distribution.
 * 
 * Distribution Rules:
 * - Most players: 60-95% of ceiling
 * - Top Performers: 95-110% of ceiling
 * - Rare Elite: up to 120% of ceiling
 */
export function applySoftCeiling(
  rawStat: number, 
  statCategory: StatCategory, 
  rating: number, // 0-100 player rating
  scoreWeight: number = 1, // 1 = average game, higher = high scoring game
  posSpecificMultiplier: number = 1.0 // For differentiating DL vs LB tackles etc.
): number {
  const ceilingDef = STAT_CEILINGS[statCategory];
  if (!ceilingDef) return rawStat;
  
  const basePerWeek = ceilingDef.basePerWeek * posSpecificMultiplier;
  
  // Avoid crushing 0 stats on defense
  if (rawStat === 0 && Math.random() > 0.1) return 0;
  if (rawStat === 0 && ceilingDef.basePerWeek < 1.0) return rawStat; // Hard to average <1 a game

  // Base expectation for this game based on the ceiling and the game score
  const expectedPacing = basePerWeek * scoreWeight;
  
  // 60-95% for most. Top performers get ~1.0. 
  // Map rating (60 -> 100) to multiplier (0.6 -> ~1.0)
  const normRating = Math.max(0.01, rating / 100);
  const ratingMultiplier = 0.5 + (0.55 * normRating); // 85 rating -> ~0.96
  
  const targetStat = expectedPacing * ratingMultiplier;
  
  // Normal distribution around the targetStat (stdDev 20% of target)
  const variance = randomNormal();
  const stdDev = Math.max(1, targetStat * 0.2); 
  
  let finalStat = targetStat + (variance * stdDev);
  
  // Determine if it's a rare elite game (only for 85+ rating)
  if (rating > 85 && Math.random() < 0.05) {
     finalStat = basePerWeek * (1.05 + Math.random() * 0.15); // Up to 120%
  } else if (rating <= 85) {
     // Harder cap for non-elites to ensure they don't naturally blow past the ceiling frequently
     finalStat = Math.min(finalStat, basePerWeek * 0.95);
  }

  // The final stat blends the game's raw simulated stat and the ceiling's realistic pacing
  return Math.max(0, Math.round((rawStat * 0.5) + (finalStat * 0.5)));
}
