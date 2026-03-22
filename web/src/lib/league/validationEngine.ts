// Last Updated: 2026-03-22T23:25:00Z
import { Game, Player } from './types';

export interface ValidationReport {
  gameId: string;
  errors: string[];
  corrections: string[];
}

/**
 * Validates and corrects player statistics based on the final game score.
 * Ensures logical consistency across all positions and teams.
 */
export function validateGameStats(
  game: Game,
  players: Player[]
): { validatedPlayers: Player[]; report: ValidationReport } {
  const report: ValidationReport = {
    gameId: game.id,
    errors: [],
    corrections: []
  };

  if (game.homeScore === undefined || game.awayScore === undefined) {
      return { validatedPlayers: players, report };
  }

  const updatedPlayers = [...players];
  const homeTeamId = game.homeTeamId;
  const awayTeamId = game.awayTeamId;

  reconcileTeamScore(game.homeScore, homeTeamId || '', updatedPlayers, report);
  reconcileTeamScore(game.awayScore, awayTeamId || '', updatedPlayers, report);

  // Final plausibility check for yards
  reconcileYardage(updatedPlayers, homeTeamId || '', report);
  reconcileYardage(updatedPlayers, awayTeamId || '', report);

  if (report.errors.length > 0) {
    console.warn(`[ValidationEngine] Found ${report.errors.length} issues in game ${game.id}:`, report.errors);
  }

  return { validatedPlayers: updatedPlayers, report };
}

/**
 * Reconciles individual team points with player-level scoring stats (TD=6, XP=1, FG=3).
 */
function reconcileTeamScore(score: number, teamId: string, players: Player[], report: ValidationReport) {
  if (!teamId) return;
  const teamPlayers = players.filter(p => p.teamId === teamId);
  
  let totalTDs = 0;
  let qbPassingTDs = 0;
  let recTDs = 0;
  let kickerPoints = 0;

  teamPlayers.forEach(p => {
    const s = p.stats;
    if (!s) return;
    if (p.position === 'QB') qbPassingTDs = (s.passingTds || 0);
    if (['WR', 'TE'].includes(p.position)) recTDs += (s.receivingTds || 0);
    totalTDs += (s.rushingTds || 0) + (s.receivingTds || 0);
    if (p.position === 'K') kickerPoints = (s.points || 0);
  });

  // 1. TD Mismatch Check
  if (qbPassingTDs !== recTDs) {
    report.errors.push(`TD Mismatch: QB Pass (${qbPassingTDs}) vs WR/TE Rec (${recTDs})`);
    // Correction handled in statsEngine mostly, but if we're here, we sync to QB
    const diff = qbPassingTDs - recTDs;
    const receivers = teamPlayers.filter(p => ['WR', 'TE'].includes(p.position));
    if (receivers.length > 0) {
      receivers[0].stats!.receivingTds = (receivers[0].stats!.receivingTds || 0) + diff;
      report.corrections.push(`Synced receivers to match QB Passing TDs.`);
    }
  }

  // 2. Score Alignment Check
  const calculatedScore = (totalTDs * 6) + kickerPoints;
  if (calculatedScore !== score) {
    report.errors.push(`Score Mismatch: Calc (${calculatedScore}) vs Game (${score})`);
    const diff = score - calculatedScore;
    const kicker = teamPlayers.find(p => p.position === 'K');
    if (kicker && kicker.stats) {
      kicker.stats.points = (kicker.stats.points || 0) + diff;
      report.corrections.push(`Adjusted kicking points by ${diff} to align with game score.`);
    }
  }
}

function reconcileYardage(players: Player[], teamId: string, report: ValidationReport) {
  if (!teamId) return;
  const qb = players.find(p => p.teamId === teamId && p.position === 'QB');
  const receivers = players.filter(p => p.teamId === teamId && (p.position === 'WR' || p.position === 'TE'));
  
  if (!qb || !qb.stats) return;

  const totalPassing = qb.stats.passingYards || 0;
  const totalReceiving = receivers.reduce((sum, r) => sum + (r.stats?.receivingYards || 0), 0);

  if (Math.abs(totalPassing - totalReceiving) > 10 && totalPassing > 0) {
    report.errors.push(`Yardage Mismatch: QB Passing (${totalPassing}) vs Receivers (${totalReceiving})`);
    // We favor the QB total as the 'Truth' and update receivers
    if (receivers.length > 0) {
      const scale = totalPassing / (totalReceiving || 1);
      receivers.forEach(r => {
        if (r.stats) r.stats.receivingYards = Math.round((r.stats.receivingYards || 0) * scale);
      });
      report.corrections.push(`Scaled receiving yards to match QB Passing yards.`);
    }
  }
}
