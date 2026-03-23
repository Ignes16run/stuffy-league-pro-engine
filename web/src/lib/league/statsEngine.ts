// Last Updated: 2026-03-22T21:05:00-04:00
import { Player, PlayerStats } from './types';

/**
 * Assigns statistics to players for a single game based on team score.
 * Fulfills the "Stat Realism" and "Pool-Based Distribution" requirements.
 * Accounts for Extra Points (XPs) with rating-based miss logic.
 * Now deterministic when a 'random' generator is provided.
 */
export function assignStatsToPlayers(
  players: Player[],
  teamId: string,
  score: number,
  oppScore: number,
  random: () => number = Math.random
): Player[] {
  const teamPlayers = players.filter(p => p.teamId === teamId);
  if (teamPlayers.length === 0) return players;

  // 1. Identify Position Groups
  const rbs = teamPlayers.filter(p => p.position === 'RB');
  const receivers = teamPlayers.filter(p => p.position === 'WR' || p.position === 'TE');
  const kicker = teamPlayers.find(p => p.position === 'K');
  
  // Defensive Groups
  const dLine = teamPlayers.filter(p => p.position === 'DL' || p.position === 'EDGE');
  const lbs = teamPlayers.filter(p => p.position === 'LB');
  const dbs = teamPlayers.filter(p => p.position === 'CB' || p.position === 'S');
  
  // 2. Statistical Distribution Logic
  const distributePool = (subset: Player[], totalValue: number): Record<string, number> => {
    if (subset.length === 0 || totalValue <= 0) return {};
    const results: Record<string, number> = {};
    const totalRating = subset.reduce((sum, p) => sum + p.rating, 0) || 1;
    
    // For small integer values, use weighted random selection for better variance
    if (Number.isInteger(totalValue) && totalValue < 30) {
      for (let i = 0; i < totalValue; i++) {
        let randVal = random() * totalRating;
        let assigned = false;
        for (const p of subset) {
          randVal -= p.rating;
          if (randVal <= 0) {
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
  
  while (totalTDs >= 0) {
    const rem = score - (totalTDs * 7);
    if (rem % 3 === 0) {
      break;
    }
    totalTDs--;
  }

  if (totalTDs < 0) {
    totalTDs = Math.floor(score / 7);
  }

  // 4. Extra Points Logic (Accounting for misses)
  let xpMade = 0;
  const kickerRating = kicker?.rating || 75;
  const missChance = Math.max(0.01, 0.15 - (kickerRating / 800)); // 75 OVR -> ~6% miss
  
  for (let i = 0; i < totalTDs; i++) {
    if (random() > missChance) xpMade++;
  }
  
  // Points reconciliation (Remainder goes to Kicker points pool)
  const ptsFromTDs = totalTDs * 6;
  const kickerPointsPool = score - ptsFromTDs; 
  const finalXpCount = Math.min(xpMade, kickerPointsPool);
  const finalFgCount = Math.floor((kickerPointsPool - finalXpCount) / 3);

  // 5. Calculate Offensive TD Split Pools
  let rushingTdsCount = totalTDs > 0 
    ? Math.floor(totalTDs * (0.2 + random() * 0.3) + (random() < 0.2 ? 1 : 0))
    : 0;
  
  if (rbs.length === 0) rushingTdsCount = 0;
  if (receivers.length === 0) rushingTdsCount = totalTDs;
  rushingTdsCount = Math.min(rushingTdsCount, totalTDs);
  const passingTdsCount = Math.max(0, totalTDs - rushingTdsCount);

  // 6. Yardage Pools
  const totalPassingYards = Math.round((score * 9.5) + (random() * 60));
  const totalRushingYards = Math.round((score * 5.5) + (random() * 40));

  // 7. Defensive Event Generation (Realism Enhancement)
  // Pressures: 8-18 per game (Boosted for leader targets)
  const totalPressures = 8 + Math.floor(random() * 11);
  
  // Conversion rules: Portion of pressures convert to sacks and TFLs
  const totalSacks = Math.min(totalPressures, Math.floor(totalPressures * (0.15 + random() * 0.15)));
  const totalTFLs = Math.min(totalPressures, 4 + Math.floor(random() * 6)); // User range 4-8
  
  // Interceptions: 0-3 per game (Rare but possible for league leader targets)
  const totalInterceptions = random() < 0.2 ? 0 : (random() < 0.6 ? 1 : (random() < 0.9 ? 2 : 3));
  
  // Pass Deflections: 4-10 per game
  const totalPassDeflections = 4 + Math.floor(random() * 7);

  // 8. Distribute Pools
  const rbYardsMap = distributePool(rbs, totalRushingYards);
  const rbTdsMap = distributePool(rbs, rushingTdsCount);
  const recYardsMap = distributePool(receivers, totalPassingYards);
  const recTdsMap = distributePool(receivers, passingTdsCount);

  // Defensive Distribution Matrices
  // Pressures: DL/EDGE (80%), LB (18%), DB (2% rare)
  const dLinePressureMap = distributePool(dLine, Math.floor(totalPressures * 0.80));
  const lbPressureMap = distributePool(lbs, Math.floor(totalPressures * 0.18));
  
  // Sacks Distribution (Strictly following pressures)
  const dLineSackMap = distributePool(dLine, Math.floor(totalSacks * 0.85));
  const lbSackMap = distributePool(lbs, Math.floor(totalSacks * 0.15));
  
  // TFL Distribution
  const dLineTflMap = distributePool(dLine, Math.floor(totalTFLs * 0.65));
  const lbTflMap = distributePool(lbs, Math.floor(totalTFLs * 0.30));
  const dbTflMap = distributePool(dbs, Math.floor(totalTFLs * 0.05));
  
  // Interception Distribution: CB (80%), S (15%), LB (5%)
  const cbGroup = dbs.filter(p => p.position === 'CB');
  const sGroup = dbs.filter(p => p.position === 'S');
  
  const cbIntMap = distributePool(cbGroup, Math.floor(totalInterceptions * 0.80));
  const sIntMap = distributePool(sGroup, Math.floor(totalInterceptions * 0.15));
  const lbIntMap = distributePool(lbs, Math.floor(totalInterceptions * 0.05));
  const dLineIntMap = distributePool(dLine, 0); // Simplified for calculation

  // 9. Apply
  return players.map(p => {
    if (p.teamId !== teamId) return p;

    const s: PlayerStats = { ...(p.stats || { gamesPlayed: 0 }) };
    s.gamesPlayed = (s.gamesPlayed || 0) + 1;

    switch (p.position) {
      case 'QB':
        s.passingYards = (s.passingYards || 0) + totalPassingYards;
        s.passingTds = (s.passingTds || 0) + passingTdsCount;
        s.completionPct = 60 + Math.floor(random() * 15);
        break;
      case 'RB':
        s.rushingYards = (s.rushingYards || 0) + (rbYardsMap[p.id] || 0);
        s.rushingTds = (s.rushingTds || 0) + (rbTdsMap[p.id] || 0);
        s.carries = (s.carries || 0) + 8 + Math.floor(random() * 12);
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
        s.tackles = (s.tackles || 0) + 1 + Math.floor(random() * 4);
        s.pressures = (s.pressures || 0) + (dLinePressureMap[p.id] || 0);
        s.sacks = (s.sacks || 0) + (dLineSackMap[p.id] || 0);
        s.tacklesForLoss = (s.tacklesForLoss || 0) + (dLineTflMap[p.id] || 0);
        s.interceptions = (s.interceptions || 0) + (dLineIntMap[p.id] || 0);
        break;
      case 'LB':
        s.tackles = (s.tackles || 0) + 4 + Math.floor(random() * 6) + Math.floor(oppScore / 10);
        s.pressures = (s.pressures || 0) + (lbPressureMap[p.id] || 0);
        s.sacks = (s.sacks || 0) + (lbSackMap[p.id] || 0);
        s.tacklesForLoss = (s.tacklesForLoss || 0) + (lbTflMap[p.id] || 0);
        s.interceptions = (s.interceptions || 0) + (lbIntMap[p.id] || 0);
        break;
      case 'CB':
      case 'S':
        s.tackles = (s.tackles || 0) + 2 + Math.floor(random() * 4) + Math.floor(oppScore / 15);
        s.interceptions = (s.interceptions || 0) + (cbIntMap[p.id] || sIntMap[p.id] || 0);
        s.passDeflections = (s.passDeflections || 0) + Math.round((totalPassDeflections / dbs.length) * (p.rating / 80));
        s.tacklesForLoss = (s.tacklesForLoss || 0) + (dbTflMap[p.id] || 0);
        // Rare pressure for DBs
        if (random() > 0.97) s.pressures = (s.pressures || 0) + 1;
        break;
    }

    return { ...p, stats: s };
  });
}
