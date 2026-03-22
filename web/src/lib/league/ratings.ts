// Last Updated: 2026-03-22T15:55:00Z
import { PlayerPosition, PlayerAbility } from './types';

export interface RatingCategory {
  name: string;
  description: string;
}

export const POSITION_RATINGS: Record<PlayerPosition, RatingCategory[]> = {
  QB: [
    { name: 'Arm Strength', description: 'Raw passing power' },
    { name: 'Accuracy', description: 'Precision of throws' },
    { name: 'Vision', description: 'Ability to read the field' },
    { name: 'Mobility', description: 'Escaping pressure' },
    { name: 'Awareness', description: 'Avoiding mistakes' }
  ],
  RB: [
    { name: 'Speed', description: 'Straight line velocity' },
    { name: 'Power', description: 'Breaking tackles' },
    { name: 'Vision', description: 'Finding the hole' },
    { name: 'Hands', description: 'Catching from backfield' },
    { name: 'Ball Security', description: 'Fumble prevention' }
  ],
  WR: [
    { name: 'Speed', description: 'Deep threat ability' },
    { name: 'Hands', description: 'Catching reliability' },
    { name: 'Route Running', description: 'Creating separation' },
    { name: 'Release', description: 'Beating press coverage' },
    { name: 'Catch in Traffic', description: 'Holding on through contact' }
  ],
  TE: [
    { name: 'Catching', description: 'Receiving skills' },
    { name: 'Blocking', description: 'Pass and run protection' },
    { name: 'Speed', description: 'Seam threat potential' },
    { name: 'Route Running', description: 'Short and medium routes' },
    { name: 'Strength', description: 'Winning physical battles' }
  ],
  OL: [
    { name: 'Pass Block', description: 'Protecting the QB' },
    { name: 'Run Block', description: 'Creating lanes' },
    { name: 'Strength', description: 'Raw physical power' },
    { name: 'Footwork', description: 'Positioning and balance' },
    { name: 'IQ', description: 'Identifying blitzes' }
  ],
  DL: [
    { name: 'Block Shedding', description: 'Beating the OL' },
    { name: 'Tackling', description: 'Stopping the runner' },
    { name: 'Strength', description: 'Interior presence' },
    { name: 'Pursuit', description: 'Closing on ball carriers' },
    { name: 'Power Move', description: 'Bull rush capability' }
  ],
  EDGE: [
    { name: 'Finesse Move', description: 'Speed rush moves' },
    { name: 'Power Move', description: 'Strength rush moves' },
    { name: 'Speed', description: 'Edge closing speed' },
    { name: 'Block Shedding', description: 'Getting past the LT/RT' },
    { name: 'Tackling', description: 'Setting the edge' }
  ],
  LB: [
    { name: 'Tackling', description: 'Sound tackling technique' },
    { name: 'Coverage', description: 'Zone and man skills' },
    { name: 'Pursuit', description: 'Range and speed' },
    { name: 'Play Recognition', description: 'Diagnosing the play' },
    { name: 'Strength', description: 'Physicality at point of attack' }
  ],
  CB: [
    { name: 'Man Coverage', description: 'Sticking to receivers' },
    { name: 'Zone Coverage', description: 'Area awareness' },
    { name: 'Speed', description: 'Keeping up with vertical threats' },
    { name: 'Ball Skills', description: 'Getting hands on the ball' },
    { name: 'Press', description: 'Disrupting at the line' }
  ],
  S: [
    { name: 'Zone Coverage', description: 'Deep field security' },
    { name: 'Tackling', description: 'Last line of defense' },
    { name: 'Play Recognition', description: 'Field generalship' },
    { name: 'Speed', description: 'Range across the field' },
    { name: 'Ball Skills', description: 'Forcing turnovers' }
  ],
  K: [
    { name: 'Kick Power', description: 'Maximum field goal distance' },
    { name: 'Kick Accuracy', description: 'Precision on attempts' },
    { name: 'Kickoff', description: 'Depth of kickoff' },
    { name: 'Pressure', description: 'Performance in clutch' },
    { name: 'Consistency', description: 'Repeatability of swing' }
  ],
  P: [
    { name: 'Punt Power', description: 'Distance of punts' },
    { name: 'Punt Accuracy', description: 'Coffin corner potential' },
    { name: 'Hang Time', description: 'Allowing coverage to get downfield' },
    { name: 'Pressure', description: 'Holding up under rush' },
    { name: 'Consistency', description: 'Avoiding shanks' }
  ]
};

/**
 * Calculates Overall Rating based on the average of the 5 categories
 */
export function calculateOVR(abilities: PlayerAbility[]): number {
  if (!abilities || abilities.length === 0) return 60;
  const sum = abilities.reduce((acc, curr) => acc + curr.value, 0);
  return Math.round(sum / abilities.length);
}

/**
 * Generates an initial OVR using a weighted "bell curve" distribution
 */
export function generateWeightedOVR(): number {
  const roll = Math.random() * 100;
  
  // Elite: 90-99 (5%)
  if (roll > 95) return 90 + Math.floor(Math.random() * 10);
  // Above Average: 80-89 (20%)
  if (roll > 75) return 80 + Math.floor(Math.random() * 10);
  // Average: 65-79 (65%)
  if (roll > 10) return 65 + Math.floor(Math.random() * 15);
  // Low: 50-64 (10%)
  return 50 + Math.floor(Math.random() * 15);
}

/**
 * Generates 5 categories for a position that average out to the targetOVR
 */
export function generateInitialRatings(position: PlayerPosition, targetOVR: number): PlayerAbility[] {
  const categories = POSITION_RATINGS[position] || POSITION_RATINGS.QB;
  
  // Distribute points around the targetOVR
  const abilities: PlayerAbility[] = categories.map(cat => ({
    name: cat.name,
    value: 0,
    description: cat.description
  }));

  let remainingPoints = targetOVR * 5;
  
  // Fill 4 categories with some variance
  for (let i = 0; i < 4; i++) {
    const variance = Math.floor(Math.random() * 11) - 5; // -5 to +5
    const val = Math.max(0, Math.min(99, targetOVR + variance));
    abilities[i].value = val;
    remainingPoints -= val;
  }
  
  // Last category balances it out
  abilities[4].value = Math.max(0, Math.min(99, remainingPoints));
  
  // Final OVR could be slightly off target due to clamping, but is derived from average
  return abilities;
}
