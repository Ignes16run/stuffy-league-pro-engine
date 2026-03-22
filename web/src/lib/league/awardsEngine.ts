// Last Updated: 2026-03-22T21:45:00Z
import { Player, AwardType } from './types';
import { isEligibleForAward, POSITION_CONFIGS } from './position-system';

/**
 * Calculates a statistical score for award candidates.
 */
export function calculateAwardScore(player: Player, type: AwardType): number {
  if (!isEligibleForAward(player.position, type)) return 0;
  
  const s = player.stats;
  if (!s) return 0;

  switch (type) {
    case 'MVP': {
      // Generalistic "Best Player" score
      const passing = ((s.passingYards || 0) / 25) + ((s.passingTds || 0) * 4) - ((s.interceptionsThrown || 0) * 2);
      const rushing = ((s.rushingYards || 0) / 10) + ((s.rushingTds || 0) * 6);
      const receiving = ((s.receivingYards || 0) / 10) + ((s.receivingTds || 0) * 6);
      const defensive = (s.tackles || 0) + ((s.sacks || 0) * 5) + ((s.interceptions || 0) * 8);
      const ratingBonus = (player.rating - 70) * 2;
      return passing + rushing + receiving + defensive + ratingBonus;
    }
    
    case 'OPOY': {
      const passing = ((s.passingYards || 0) / 20) + ((s.passingTds || 0) * 6);
      const rushing = ((s.rushingYards || 0) / 9) + ((s.rushingTds || 0) * 6);
      const receiving = ((s.receivingYards || 0) / 9) + ((s.receivingTds || 0) * 6);
      return passing + rushing + receiving;
    }
    
    case 'DPOY': {
      return (s.tackles || 0) + 
             ((s.sacks || 0) * 6) + 
             ((s.tacklesForLoss || 0) * 3) + 
             ((s.interceptions || 0) * 10) + 
             ((s.passDeflections || 0) * 2);
    }
    
    case 'STPOY': {
      // Points for kicker (normalized value)
      return (s.points || 0) + (s.gamesPlayed > 0 ? 1 : 0);
    }
    
    default:
      return 0;
  }
}

/**
 * Returns top 5 candidates for every major category.
 */
export function getAwardFinalists(players: Player[]): Partial<Record<AwardType, Player[]>> {
  const categories: AwardType[] = ['MVP', 'OPOY', 'DPOY', 'STPOY'];
  const result: Partial<Record<AwardType, Player[]>> = {};

  categories.forEach(cat => {
    let candidates = players
      .map(p => ({ player: p, score: calculateAwardScore(p, cat) }))
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score);
    
    // Validation: STPOY Freeze Fix (ensure at least 3 valid candidates)
    if (candidates.length < 3) {
      candidates = players
        .filter(p => isEligibleForAward(p.position, cat))
        .map(p => ({ player: p, score: p.rating }))
        .sort((a, b) => b.score - a.score);
    }
    
    result[cat] = candidates.slice(0, 5).map(c => c.player);
  });

  return result;
}

/**
 * Helper to identify the primary metric used for an award.
 */
export function getStatForAward(player: Player, awardType: AwardType): string {
  const s = player.stats;
  if (!s) return "Not and active athlete";

  switch (awardType) {
    case 'MVP': return `${s.passingTds || 0 + (s.touchdowns || 0)} Total TDs`;
    case 'OPOY': return `${(s.passingYards || 0) + (s.yards || 0)} Total Yards`;
    case 'DPOY': return `${s.tackles || 0} Tackles, ${s.sacks || 0} Sacks`;
    case 'STPOY': return `${s.points || 0} Points`;
    default: return "";
  }
}

/**
 * Defensive check for Candidate pool validity.
 */
export function validateAwardCandidates(players: Player[], awardType: AwardType): Player[] {
  const finalists = getAwardFinalists(players)[awardType] || [];
  if (finalists.length === 0) {
      // Strict Fallback for data integrity
      return players
        .filter(p => isEligibleForAward(p.position, awardType))
        .slice(0, 3);
  }
  return finalists;
}
