// Last Updated: 2026-03-22T23:15:00Z
import { Player, Team, Game, PlayerStats } from './types';
import { getRatingInfluencedValue } from './position-system';

/**
 * Assigns statistics to players for a single game based on team score.
 * Fulfills the "Stat Realism" and "Pool-Based Distribution" requirements.
 */
export function assignStatsToPlayers(
  players: Player[],
  teamId: string,
  score: number,
  oppScore: number
): Player[] {
  // 1. Calculate Team Stat Pools based on Score (Realism Scaling)
  // Approx 10.5 yards per point scored (avg NFL is ~12 but we have soft ceilings)
  const basePassingYards = (score * 9.5) + (Math.random() * 60);
  const baseRushingYards = (score * 5.5) + (Math.random() * 40);
  
  const teamPlayers = players.filter(p => p.teamId === teamId);
  if (teamPlayers.length === 0) return players;

  // 2. Identify Key Position Groups
  const qbs = teamPlayers.filter(p => p.position === 'QB');
  const rbs = teamPlayers.filter(p => p.position === 'RB');
  const receivers = teamPlayers.filter(p => p.position === 'WR' || p.position === 'TE');
  
  // 3. Statistical Distribution Logic
  const calculateShareSet = (subset: Player[], totalValue: number, ratingAttr: string) => {
    const totalRating = subset.reduce((sum, p) => sum + p.rating, 0);
    return subset.map(p => ({
       id: p.id,
       shareValue: (p.rating / totalRating) * totalValue
    }));
  };

  const passShares = calculateShareSet(receivers, basePassingYards, 'Hands');
  const rushShares = calculateShareSet(rbs, baseRushingYards, 'Power');

  return players.map(p => {
    if (p.teamId !== teamId) return p;

    // Deep copy stats
    const s: PlayerStats = { ...(p.stats || { gamesPlayed: 0 }) };
    s.gamesPlayed = (s.gamesPlayed || 0) + 1;

    switch (p.position) {
      case 'QB':
        // QBs take all passing yards in this simplified model
        s.passingYards = (s.passingYards || 0) + getRatingInfluencedValue(p, 'Arm Strength', basePassingYards);
        s.passingTds = (s.passingTds || 0) + Math.floor(score / 9); // Scaled
        s.completionPct = getRatingInfluencedValue(p, 'Accuracy', 62);
        break;

      case 'RB':
        const rShare = rushShares.find(rs => rs.id === p.id)?.shareValue || 0;
        s.rushingYards = (s.rushingYards || 0) + Math.round(getRatingInfluencedValue(p, 'Vision', rShare));
        s.rushingTds = (s.rushingTds || 0) + (Math.random() > 0.8 ? 1 : 0); // Stochastic
        break;

      case 'WR':
      case 'TE':
        const recShare = passShares.find(ps => ps.id === p.id)?.shareValue || 0;
        s.receivingYards = (s.receivingYards || 0) + Math.round(getRatingInfluencedValue(p, 'Hands', recShare));
        s.receptions = (s.receptions || 0) + Math.round(recShare / 15);
        s.receivingTds = (s.receivingTds || 0) + (Math.random() > 0.85 ? 1 : 0);
        break;

      case 'K':
        // Kicking stats are critical for ST leaders
        const xpCount = Math.floor(score / 7);
        const fgCount = Math.floor((score % 7) / 3);
        s.points = (s.points || 0) + (xpCount * 1) + (fgCount * 3);
        // Add new category tracking if needed (for leaders)
        (s as any).fgMade = ((s as any).fgMade || 0) + fgCount;
        (s as any).xpMade = ((s as any).xpMade || 0) + xpCount;
        break;

      case 'DL':
      case 'EDGE':
      case 'LB':
        s.tackles = (s.tackles || 0) + getRatingInfluencedValue(p, 'Tackling', Math.floor(Math.random() * 6) + (oppScore / 10));
        const sackMove = p.position === 'DL' ? 'Power Move' : 'Power';
        const sackProb = 0.96 - (getRatingInfluencedValue(p, sackMove, p.rating) / 500);
        if (Math.random() > sackProb) s.sacks = (s.sacks || 0) + 1;
        const tflProb = 0.92 - (getRatingInfluencedValue(p, 'Pursuit', p.rating) / 400);
        if (Math.random() > tflProb) s.tacklesForLoss = (s.tacklesForLoss || 0) + 1;
        break;

      case 'CB':
      case 'S':
        s.tackles = (s.tackles || 0) + getRatingInfluencedValue(p, 'Tackling', Math.floor(Math.random() * 4) + (oppScore / 15));
        const intProb = 0.98 - (getRatingInfluencedValue(p, 'Ball Skills', p.rating) / 1000);
        if (Math.random() > intProb) s.interceptions = (s.interceptions || 0) + 1;
        const pdRating = p.position === 'CB' ? 'Man Coverage' : 'Zone Coverage';
        const pdProb = 0.88 - (getRatingInfluencedValue(p, pdRating, p.rating) / 300);
        if (Math.random() > pdProb) s.passDeflections = (s.passDeflections || 0) + 1;
        break;
    }

    return { ...p, stats: s };
  });
}
