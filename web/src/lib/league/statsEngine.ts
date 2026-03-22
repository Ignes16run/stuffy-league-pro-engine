// Last Updated: 2026-03-22T23:50:00Z
import { Player, PlayerStats } from './types';

/**
 * Assigns statistics to players for a single game based on team score.
 * Fulfills the "Stat Realism" and "Pool-Based Distribution" requirements.
 * Accounts for Extra Points (XPs) with rating-based miss logic.
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
  const kicker = teamPlayers.find(p => p.position === 'K');
  
  // 2. Statistical Distribution Logic
  const distributePool = (subset: Player[], totalValue: number): Record<string, number> => {
    if (subset.length === 0 || totalValue <= 0) return {};
    const results: Record<string, number> = {};
    const totalRating = subset.reduce((sum, p) => sum + p.rating, 0) || 1;
    
    if (Number.isInteger(totalValue) && totalValue < 50) {
      for (let i = 0; i < totalValue; i++) {
        let rand = Math.random() * totalRating;
        let assigned = false;
        for (const p of subset) {
          rand -= p.rating;
          if (rand <= 0) {
            results[p.id] = (results[p.id] || 0) + 1;
            assigned = true;
            break;
          }
        }
        if (!assigned && subset.length > 0) {
          results[subset[0].id] = (results[subset[0].id] || 0) + 1;
        }
      }
    } else {
      subset.forEach(p => {
        results[p.id] = Math.round((p.rating / totalRating) * totalValue);
      });
    }
    return results;
  };

  // 3. Score Deconstruction (Diophantine Solver)
  let totalTDs = Math.floor(score / 7);
  let fgCount = 0;
  
  while (totalTDs >= 0) {
    const rem = score - (totalTDs * 7);
    if (rem % 3 === 0) {
      fgCount = rem / 3;
      break;
    }
    totalTDs--;
  }

  if (totalTDs < 0) {
    totalTDs = Math.floor(score / 7);
    fgCount = Math.floor((score - totalTDs * 7) / 3);
  }

  // 4. Extra Points Logic (Accounting for misses)
  let xpMade = 0;
  const kickerRating = kicker?.rating || 75;
  const missChance = Math.max(0.01, 0.15 - (kickerRating / 800)); // 75 OVR -> ~6% miss
  
  for (let i = 0; i < totalTDs; i++) {
    if (Math.random() > missChance) xpMade++;
  }
  
  // Points reconciliation (Remainder goes to Kicker points pool)
  const ptsFromTDs = totalTDs * 6;
  const kickerPointsPool = score - ptsFromTDs; 
  // We use xpMade as the 'intended' stat, but we must reach kickerPointsPool
  const finalXpCount = Math.min(xpMade, kickerPointsPool);
  const finalFgCount = Math.floor((kickerPointsPool - finalXpCount) / 3);
  const leftoverPoints = kickerPointsPool - finalXpCount - (finalFgCount * 3);

  // 5. Calculate TD Split Pools
  let rushingTdsCount = totalTDs > 0 
    ? Math.floor(totalTDs * (0.2 + Math.random() * 0.3) + (Math.random() < 0.2 ? 1 : 0))
    : 0;
  
  if (rbs.length === 0) rushingTdsCount = 0;
  if (receivers.length === 0) rushingTdsCount = totalTDs;
  rushingTdsCount = Math.min(rushingTdsCount, totalTDs);
  const passingTdsCount = Math.max(0, totalTDs - rushingTdsCount);

  // 6. Yardage Pools
  const totalPassingYards = Math.round((score * 9.5) + (Math.random() * 60));
  const totalRushingYards = Math.round((score * 5.5) + (Math.random() * 40));

  // 7. Distribute
  const rbYardsMap = distributePool(rbs, totalRushingYards);
  const rbTdsMap = distributePool(rbs, rushingTdsCount);
  const recYardsMap = distributePool(receivers, totalPassingYards);
  const recTdsMap = distributePool(receivers, passingTdsCount);

  // 8. Apply
  return players.map(p => {
    if (p.teamId !== teamId) return p;

    const s: PlayerStats = { ...(p.stats || { gamesPlayed: 0 }) };
    s.gamesPlayed = (s.gamesPlayed || 0) + 1;

    switch (p.position) {
      case 'QB':
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
        s.points = (s.points || 0) + kickerPointsPool;
        s.fgMade = (s.fgMade || 0) + finalFgCount;
        s.xpMade = (s.xpMade || 0) + finalXpCount;
        break;
      case 'DL':
      case 'EDGE':
      case 'LB':
        s.tackles = (s.tackles || 0) + Math.floor(Math.random() * 6) + Math.floor(oppScore / 10);
        if (Math.random() > (0.98 - (p.rating / 1000))) s.sacks = (s.sacks || 0) + 1;
        break;
      case 'CB':
      case 'S':
        s.tackles = (s.tackles || 0) + Math.floor(Math.random() * 4) + Math.floor(oppScore / 15);
        if (Math.random() > 0.98) s.interceptions = (s.interceptions || 0) + 1;
        break;
    }

    return { ...p, stats: s };
  });
}
