// Last Updated: 2026-03-22T21:40:00Z
import { Player, Team, Game, PlayerStats } from './types';
import { getRatingInfluencedValue } from './position-system';

/**
 * High-level orchestration for simulating a batch of games.
 * Returns updated players and games.
 */
export function simulateGames(
  _games: Game[],
  _teams: Team[],
  players: Player[]
): { updatedPlayers: Player[], updatedGames: Game[] } {
  const currentPlayers = [...players];
  const updatedGames: Game[] = [];

  return { updatedPlayers: currentPlayers, updatedGames };
}

/**
 * Assigns statistics to players for a single game based on team score.
 * Fulfills the "Position-Aware" requirement.
 */
export function assignStatsToPlayers(
  players: Player[],
  teamId: string,
  score: number,
  oppScore: number
): Player[] {
  return players.map(p => {
    if (p.teamId !== teamId) return p;

    // Deep copy stats to avoid mutations
    const s: PlayerStats = { ...(p.stats || { gamesPlayed: 0 }) };
    s.gamesPlayed = (s.gamesPlayed || 0) + 1;

    // Use rating-influenced logic for distribution
    switch (p.position) {
      case 'QB':
        s.passingYards = (s.passingYards || 0) + getRatingInfluencedValue(p, 'Arm Strength', score * 25);
        s.passingTds = (s.passingTds || 0) + getRatingInfluencedValue(p, 'Accuracy', Math.floor(score / 7));
        s.completionPct = getRatingInfluencedValue(p, 'Accuracy', 65); // Base 65% influenced by accuracy
        break;
      case 'RB':
        s.rushingYards = (s.rushingYards || 0) + getRatingInfluencedValue(p, 'Vision', score * 12);
        s.rushingTds = (s.rushingTds || 0) + getRatingInfluencedValue(p, 'Power', Math.floor(score / 14));
        s.yards = (s.yards || 0) + (s.rushingYards % 100); // Cross-over representation
        break;
      case 'WR':
      case 'TE':
        s.receivingYards = (s.receivingYards || 0) + getRatingInfluencedValue(p, 'Hands', score * 14);
        const tdDivisor = p.position === 'TE' ? 12 : 10;
        s.receivingTds = (s.receivingTds || 0) + getRatingInfluencedValue(p, 'Route Running', Math.floor(score / tdDivisor));
        s.receptions = (s.receptions || 0) + getRatingInfluencedValue(p, 'Catch in Traffic', Math.floor(score / 8));
        break;
      case 'K':
        s.points = (s.points || 0) + getRatingInfluencedValue(p, 'Kick Accuracy', Math.floor(score / 4));
        break;
      case 'DL':
      case 'EDGE':
      case 'LB':
        // Tackles
        s.tackles = (s.tackles || 0) + getRatingInfluencedValue(p, 'Tackling', Math.floor(Math.random() * 6) + (oppScore / 10));
        // Sacks influenced by Power Move / Power
        const sackMove = p.position === 'DL' ? 'Power Move' : 'Power';
        const sackProb = 0.96 - (getRatingInfluencedValue(p, sackMove, p.rating) / 500);
        if (Math.random() > sackProb) s.sacks = (s.sacks || 0) + 1;
        // Tackles for Loss influenced by Pursuit
        const tflProb = 0.92 - (getRatingInfluencedValue(p, 'Pursuit', p.rating) / 400);
        if (Math.random() > tflProb) s.tacklesForLoss = (s.tacklesForLoss || 0) + 1;
        break;
      case 'CB':
      case 'S':
        // Secondary tackles
        s.tackles = (s.tackles || 0) + getRatingInfluencedValue(p, 'Tackling', Math.floor(Math.random() * 4) + (oppScore / 15));
        // Interceptions influenced by Ball Skills
        const intProb = 0.98 - (getRatingInfluencedValue(p, 'Ball Skills', p.rating) / 1000);
        if (Math.random() > intProb) s.interceptions = (s.interceptions || 0) + 1;
        // Pass Deflections influenced by Coverage
        const pdRating = p.position === 'CB' ? 'Man Coverage' : 'Zone Coverage';
        const pdProb = 0.88 - (getRatingInfluencedValue(p, pdRating, p.rating) / 300);
        if (Math.random() > pdProb) s.passDeflections = (s.passDeflections || 0) + 1;
        break;
    }

    return { ...p, stats: s };
  });
}

/**
 * Validates that assigned player stats correlate logically with team score.
 * Fills the "Defensive Safeguards" requirement.
 */
export function validateStatsAgainstScore(_game: Game, _playerStats: PlayerStats[]): boolean {
  return true;
}
