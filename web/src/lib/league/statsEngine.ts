// Last Updated: 2026-03-22T23:15:00Z
import { Player, PlayerStats } from './types';

/**
 * Assigns statistics to players for a single game based on team score.
 * Fulfills the "Stat Realism" and "Pool-Based Distribution" requirements.
 * Ensures Passing TDs = Receiving TDs and total TDs align with score.
 */
export function assignStatsToPlayers(
  players: Player[],
  teamId: string,
  score: number,
  oppScore: number
): Player[] {
  const teamPlayers = players.filter(p => p.teamId === teamId);
  if (teamPlayers.length === 0) return players;

  // 1. Identify Position Groups
  const rbs = teamPlayers.filter(p => p.position === 'RB');
  const receivers = teamPlayers.filter(p => p.position === 'WR' || p.position === 'TE');
  
  // 2. Statistical Distribution Logic (Weighted by position-specific ratings)
  const distributePool = (subset: Player[], totalValue: number): Record<string, number> => {
    if (subset.length === 0 || totalValue <= 0) return {};
    const results: Record<string, number> = {};
    const totalRating = subset.reduce((sum, p) => sum + p.rating, 0);
    
    // For integer values (TDs), use a stochastic selection to ensure sum matches total
    if (Number.isInteger(totalValue) && totalValue < 30) {
      for (let i = 0; i < totalValue; i++) {
        let rand = Math.random() * totalRating;
        for (const p of subset) {
          rand -= p.rating;
          if (rand <= 0) {
            results[p.id] = (results[p.id] || 0) + 1;
            break;
          }
        }
      }
    } else {
      // For continuous values (Yards), use fractional shares with rounding
      subset.forEach(p => {
        results[p.id] = Math.round((p.rating / totalRating) * totalValue);
      });
    }
    return results;
  };

  // 3. Calculate Team-Level Stat Pools
  // Approx 10.5 yards per point scored (avg NFL)
  const totalPassingYards = Math.round((score * 9.5) + (Math.random() * 60));
  const totalRushingYards = Math.round((score * 5.5) + (Math.random() * 40));
  const totalOffensiveTDs = Math.floor(score / 7);
  
  // Split TDs: ~35% Rushing, ~65% Passing
  let rushingTdsCount = totalOffensiveTDs > 0 
    ? Math.min(totalOffensiveTDs, Math.floor(totalOffensiveTDs * (0.2 + Math.random() * 0.3) + (Math.random() < 0.2 ? 1 : 0)))
    : 0;

  // Rare case for scores like 6 points (1 TD, 0 XPs)
  if (totalOffensiveTDs === 0 && score >= 6 && Math.random() > 0.7) {
    rushingTdsCount = 1;
  }
  
  // Final Safety: Total TDs * 6 must never exceed score
  const passingTdsCount = Math.max(0, totalOffensiveTDs - rushingTdsCount);
  const totalTDs = rushingTdsCount + passingTdsCount;
  if (totalTDs * 6 > score) {
    // Should be impossible given floor(score/7), but for safety:
    rushingTdsCount = Math.floor(score / 6);
  }

  // 4. Distribute Pools to Players (Weighted by Rating)
  const rbYardsMap = distributePool(rbs, totalRushingYards);
  const rbTdsMap = distributePool(rbs, rushingTdsCount);
  const recYardsMap = distributePool(receivers, totalPassingYards);
  const recTdsMap = distributePool(receivers, passingTdsCount);

  // 5. Apply to all players
  return players.map(p => {
    if (p.teamId !== teamId) return p;

    // Deep copy stats
    const s: PlayerStats = { ...(p.stats || { gamesPlayed: 0 }) };
    s.gamesPlayed = (s.gamesPlayed || 0) + 1;

    switch (p.position) {
      case 'QB':
        // QBs take the full team passing pools
        s.passingYards = (s.passingYards || 0) + totalPassingYards;
        s.passingTds = (s.passingTds || 0) + passingTdsCount;
        s.completionPct = 60 + Math.floor(Math.random() * 15);
        break;

      case 'RB':
        s.rushingYards = (s.rushingYards || 0) + (rbYardsMap[p.id] || 0);
        s.rushingTds = (s.rushingTds || 0) + (rbTdsMap[p.id] || 0);
        break;

      case 'WR':
      case 'TE':
        s.receivingYards = (s.receivingYards || 0) + (recYardsMap[p.id] || 0);
        s.receivingTds = (s.receivingTds || 0) + (recTdsMap[p.id] || 0);
        s.receptions = (s.receptions || 0) + Math.round((recYardsMap[p.id] || 0) / 12);
        break;

      case 'K':
        const xpCount = Math.floor(score / 7);
        const fgCount = Math.floor((score % 7) / 3);
        s.points = (s.points || 0) + (xpCount * 1) + (fgCount * 3);
        s.fgMade = (s.fgMade || 0) + fgCount;
        s.xpMade = (s.xpMade || 0) + xpCount;
        break;

      case 'DL':
      case 'EDGE':
      case 'LB':
        s.tackles = (s.tackles || 0) + Math.floor(Math.random() * 6) + Math.floor(oppScore / 10);
        const sackProb = 0.98 - (p.rating / 1000);
        if (Math.random() > sackProb) s.sacks = (s.sacks || 0) + 1;
        if (Math.random() > 0.95) s.tacklesForLoss = (s.tacklesForLoss || 0) + 1;
        break;

      case 'CB':
      case 'S':
        s.tackles = (s.tackles || 0) + Math.floor(Math.random() * 4) + Math.floor(oppScore / 15);
        if (Math.random() > 0.98) s.interceptions = (s.interceptions || 0) + 1;
        if (Math.random() > 0.92) s.passDeflections = (s.passDeflections || 0) + 1;
        break;
    }

    return { ...p, stats: s };
  });
}
