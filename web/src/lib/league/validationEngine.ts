// Last Updated: 2026-03-22T23:35:00Z
import { Game, Player, PlayerStats } from './types';

export interface ValidationReport {
  gameId: string;
  errors: string[];
  corrections: string[];
}

/**
 * Validates and corrects player statistics based on the final game score.
 * Delta-aware: Compares current players with their pre-game state to isolate current game performance.
 */
export function validateGameStats(
  game: Game,
  currentPlayers: Player[],
  prevPlayers: Player[]
): { validatedPlayers: Player[]; report: ValidationReport } {
  const report: ValidationReport = {
    gameId: game.id,
    errors: [],
    corrections: []
  };

  if (game.homeScore === undefined || game.awayScore === undefined) {
      return { validatedPlayers: currentPlayers, report };
  }

  const updatedPlayers = [...currentPlayers];
  const homeId = game.homeTeamId || '';
  const awayId = game.awayTeamId || '';

  reconcileTeamScore(game.homeScore, homeId, updatedPlayers, prevPlayers, report);
  reconcileTeamScore(game.awayScore, awayId, updatedPlayers, prevPlayers, report);

  return { validatedPlayers: updatedPlayers, report };
}

function getDelta(pId: string, current: Player[], prev: Player[]): PlayerStats {
  const currStats = (current.find(p => p.id === pId)?.stats || {}) as Record<string, number>;
  const prevStats = (prev.find(p => p.id === pId)?.stats || {}) as Record<string, number>;
  
  const delta: Record<string, number> = {};
  Object.keys(currStats).forEach(key => {
    if (typeof currStats[key] === 'number') {
      delta[key] = currStats[key] - (prevStats[key] || 0);
    }
  });
  return delta as unknown as PlayerStats;
}

function reconcileTeamScore(score: number, teamId: string, current: Player[], prev: Player[], report: ValidationReport) {
  if (!teamId) return;
  const teamPlayers = current.filter(p => p.teamId === teamId);
  
  let totalTDs = 0;
  let kickerPoints = 0;

  teamPlayers.forEach(p => {
    const delta = getDelta(p.id, current, prev);
    totalTDs += (delta.rushingTds || 0) + (delta.receivingTds || 0);
    if (p.position === 'K') kickerPoints = (delta.points || 0);
  });

  // Calculate score using the 6-points-per-TD model plus any kicking points (XPs+FGs)
  const actualCalcScore = (totalTDs * 6) + kickerPoints;

  if (actualCalcScore !== score) {
    report.errors.push(`Score Mismatch for ${teamId}: Stats show ${actualCalcScore}, but result was ${score}`);
    const diff = score - actualCalcScore;
    const kicker = teamPlayers.find(p => p.position === 'K');
    if (kicker && kicker.stats) {
      kicker.stats.points = (kicker.stats.points || 0) + diff;
      report.corrections.push(`Adjusted Kicker ${kicker.name} by ${diff} pts to match game score.`);
    }
  }
}
