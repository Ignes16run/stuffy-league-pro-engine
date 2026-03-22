// Last Updated: 2026-03-22T22:00:00Z
import { Game, Player, Team, PlayerStats } from './types';

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
  players: Player[],
  teams: Team[]
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

  reconcileTeamScore(game.homeScore, homeTeamId, updatedPlayers, report);
  reconcileTeamScore(game.awayScore, awayTeamId, updatedPlayers, report);

  // Final plausibility check for yards
  reconcileYardage(updatedPlayers, homeTeamId, report);
  reconcileYardage(updatedPlayers, awayTeamId, report);

  if (report.errors.length > 0) {
    console.warn(`[ValidationEngine] Found ${report.errors.length} issues in game ${game.id}:`, report.errors);
  }

  return { validatedPlayers: updatedPlayers, report };
}

/**
 * Reconciles individual team points with player-level scoring stats.
 */
function reconcileTeamScore(score: number, teamId: string, players: Player[], report: ValidationReport) {
  const teamPlayers = players.filter(p => p.teamId === teamId);
  
  // Calculate stats at the start of this reconciliation
  let passingTDs = 0;
  let rushingTDs = 0;
  let receivingTDs = 0;

  teamPlayers.forEach(p => {
    const s = p.stats;
    if (!s) return;
    passingTDs += (s.passingTds || 0);
    rushingTDs += (s.rushingTds || 0);
    receivingTDs += (s.receivingTds || 0);
  });

  const totalTDs = rushingTDs + receivingTDs; // Actual points from touchdowns

  // 1. Scoring Logic: Score = (TDs * 6) + KickerPoints
  const pointsFromTouchdowns = totalTDs * 6;
  const remainingPoints = score - pointsFromTouchdowns;

  // Safeguard: Total TDs vs passing TDs
  if (passingTDs !== receivingTDs) {
      report.errors.push(`TD Mismatch for ${teamId}: Passing (${passingTDs}) vs Receiving (${receivingTDs})`);
      syncTouchdownAttributions(teamId, players, passingTDs, receivingTDs, report);
  }

  // 2. Resolve Scoring Shortfall / Excess
  if (remainingPoints < 0) {
    report.errors.push(`Score Excess for ${teamId}: Score is ${score} but TDs provide ${pointsFromTouchdowns}`);
    adjustTouchdowns(teamId, players, Math.floor(remainingPoints / 6), report);
  } else if (remainingPoints > 0) {
    const expectedTDs = Math.floor(score / 6);
    const missingTDs = expectedTDs - totalTDs;
    
    if (missingTDs > 0) {
      report.errors.push(`Missing TDs for ${teamId}: Found ${totalTDs}, expected ${expectedTDs}`);
      adjustTouchdowns(teamId, players, missingTDs, report);
    }
    
    assignKickingPoints(teamId, players, score - (Math.floor(score / 6) * 6), report);
  }
}

function syncTouchdownAttributions(teamId: string, players: Player[], qbTDs: number, recTDs: number, report: ValidationReport) {
  const diff = qbTDs - recTDs;
  const receivers = players.filter(p => p.teamId === teamId && (p.position === 'WR' || p.position === 'TE'));
  
  if (diff > 0 && receivers.length > 0) {
    const topRec = receivers.sort((a,b) => b.rating - a.rating)[0];
    if (topRec.stats) {
      topRec.stats.receivingTds = (topRec.stats.receivingTds || 0) + diff;
      report.corrections.push(`Added ${diff} receiving TDs to ${topRec.name} to match QB.`);
    }
  }
}

function adjustTouchdowns(teamId: string, players: Player[], diff: number, report: ValidationReport) {
  if (diff === 0) return;
  const offensivePlayers = players.filter(p => p.teamId === teamId && ['QB', 'RB', 'WR', 'TE'].includes(p.position));
  
  if (diff > 0) {
    const scorer = offensivePlayers.sort((a,b) => b.rating - a.rating)[0];
    if (scorer.stats) {
       if (scorer.position === 'RB') {
           scorer.stats.rushingTds = (scorer.stats.rushingTds || 0) + diff;
       } else if (['WR', 'TE'].includes(scorer.position)) {
           scorer.stats.receivingTds = (scorer.stats.receivingTds || 0) + diff;
           const qb = players.find(p => p.teamId === teamId && p.position === 'QB');
           if (qb?.stats) qb.stats.passingTds = (qb.stats.passingTds || 0) + diff;
       }
       report.corrections.push(`Added ${diff} TDs to ${scorer.name} for score alignment.`);
    }
  } else {
    const scorer = offensivePlayers.find(p => (p.stats?.rushingTds || 0) > 0 || (p.stats?.receivingTds || 0) > 0);
    if (scorer?.stats) {
        if ((scorer.stats.rushingTds || 0) > 0) scorer.stats.rushingTds = (scorer.stats.rushingTds || 0) - 1;
        else if ((scorer.stats.receivingTds || 0) > 0) scorer.stats.receivingTds = (scorer.stats.receivingTds || 0) - 1;
        report.corrections.push(`Removed 1 TD from ${scorer.name} to fix score excess.`);
    }
  }
}

function assignKickingPoints(teamId: string, players: Player[], points: number, report: ValidationReport) {
  const kicker = players.find(p => p.teamId === teamId && p.position === 'K');
  if (kicker && kicker.stats) {
    kicker.stats.points = (kicker.stats.points || 0) + points;
    report.corrections.push(`Assigned ${points} kicking points to ${kicker.name}.`);
  }
}

function reconcileYardage(players: Player[], teamId: string, report: ValidationReport) {
  const qb = players.find(p => p.teamId === teamId && p.position === 'QB');
  const receivers = players.filter(p => p.teamId === teamId && (p.position === 'WR' || p.position === 'TE'));
  
  if (!qb || !qb.stats) return;

  const totalPassing = qb.stats.passingYards || 0;
  const totalReceiving = receivers.reduce((sum, r) => sum + (r.stats?.receivingYards || 0), 0);

  if (Math.abs(totalPassing - totalReceiving) > totalPassing * 0.15 && totalPassing > 0) {
    report.errors.push(`Yardage Inconsistency for ${teamId}: Passing (${totalPassing}) vs Receiving (${totalReceiving})`);
    const ratio = totalReceiving > 0 ? (totalPassing / totalReceiving) : 1;
    receivers.forEach(r => {
      if (r.stats) r.stats.receivingYards = Math.round((r.stats.receivingYards || 0) * ratio);
    });
    report.corrections.push(`Scaled receiving yards by ${ratio.toFixed(2)} for consistency.`);
  }
}
