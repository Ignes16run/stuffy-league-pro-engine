import { Player } from './types';

export type AwardType = 'MVP' | 'OPOY' | 'DPOY' | 'STPOY';

/**
 * Calculates a statistical "Award Score" to rank candidates.
 */
export function calculateAwardScore(player: Player, type: AwardType): number {
  const s = player.stats;
  if (!s) return 0;

  switch (type) {
    case 'MVP': {
      // High weight to volume and scoring
      const passing = ((s.passingYards || 0) / 25) + ((s.passingTds || 0) * 4) - ((s.interceptionsThrown || 0) * 2);
      const rushing = ((s.rushingYards || 0) / 10) + ((s.rushingTds || 0) * 6);
      const receiving = ((s.receivingYards || 0) / 10) + ((s.receivingTds || 0) * 6);
      const defensive = (s.tackles || 0) + ((s.sacks || 0) * 4) + ((s.interceptions || 0) * 6);
      
      // Bonus for high overall rating (represents "value")
      const ratingBonus = (player.rating - 70) * 2;
      
      return passing + rushing + receiving + defensive + ratingBonus;
    }
    
    case 'OPOY': {
      if (!['QB', 'RB', 'WR', 'TE'].includes(player.position)) return 0;
      const passing = ((s.passingYards || 0) / 20) + ((s.passingTds || 0) * 6);
      const rushing = ((s.rushingYards || 0) / 9) + ((s.rushingTds || 0) * 6);
      const receiving = ((s.receivingYards || 0) / 9) + ((s.receivingTds || 0) * 6);
      return passing + rushing + receiving;
    }
    
    case 'DPOY': {
      if (!['DL', 'EDGE', 'LB', 'CB', 'S'].includes(player.position)) return 0;
      return (s.tackles || 0) + 
             ((s.sacks || 0) * 5) + 
             ((s.tacklesForLoss || 0) * 3) + 
             ((s.interceptions || 0) * 8) + 
             ((s.passDeflections || 0) * 2);
    }
    
    case 'STPOY': {
      if (player.position !== 'K') return 0;
      // Points for kicker includes FGs and XPs
      return (s.points || 0);
    }
    
    default:
      return 0;
  }
}

/**
 * Returns the top 5 candidates for each award category.
 */
export function getAwardFinalists(players: Player[]): Record<AwardType, Player[]> {
  const categories: AwardType[] = ['MVP', 'OPOY', 'DPOY', 'STPOY'];
  const result: Partial<Record<AwardType, Player[]>> = {};

  categories.forEach(cat => {
    const scored = players
      .map(p => ({ player: p, score: calculateAwardScore(p, cat) }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score);
    
    result[cat] = scored.slice(0, 5).map(s => s.player);
  });

  return result as Record<AwardType, Player[]>;
}
