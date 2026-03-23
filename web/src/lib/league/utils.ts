// Last Updated: 2026-03-22T23:55:00Z
import { Team, Game, Standing, Player } from './types';

export function generateRoundRobinSchedule(teams: Team[], numWeeks: number = 0): Game[] {
  if (teams.length < 2) return [];

  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  const isOdd = n % 2 !== 0;
  const pool = isOdd ? [...teamIds, null] : [...teamIds];
  const numTeams = pool.length;
  const roundsPerCycle = numTeams - 1;
  const totalWeeks = numWeeks > 0 ? numWeeks : roundsPerCycle;

  const games: Game[] = [];
  for (let week = 1; week <= totalWeeks; week++) {
    const cycleRound = (week - 1) % roundsPerCycle;
    const currentPool = [...pool];
    for (let r = 0; r < cycleRound; r++) {
      currentPool.splice(1, 0, currentPool.pop()!);
    }
    for (let i = 0; i < numTeams / 2; i++) {
      const home = currentPool[i];
      const away = currentPool[numTeams - 1 - i];
      if (home !== null && away !== null) {
        games.push({ id: `game-w${week}-m${i}`, week: week, homeTeamId: home, awayTeamId: away });
      }
    }
  }
  return games;
}

export function calculateStandings(teams: Team[], games: Game[]): Standing[] {
  const stats: Record<string, { wins: number; losses: number; ties: number; streak: string; lastResult: string }> = {};
  teams.forEach(team => { stats[team.id] = { wins: 0, losses: 0, ties: 0, streak: '', lastResult: '' }; });
  const sortedGames = [...games].sort((a, b) => a.week - b.week);
  sortedGames.forEach(game => {
    if (!game.winnerId && !game.isTie) return;
    if (game.isTie) {
      ['homeTeamId', 'awayTeamId'].forEach(key => {
        const teamStats = stats[game[key as keyof Game] as string];
        teamStats.ties++;
        teamStats.streak = teamStats.lastResult === 'T' ? `T${(parseInt(teamStats.streak.slice(1)) || 1) + 1}` : 'T1';
        teamStats.lastResult = 'T';
      });
    } else if (game.winnerId) {
      const loserId = game.winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
      const winnerStats = stats[game.winnerId];
      winnerStats.wins++;
      winnerStats.streak = winnerStats.lastResult === 'W' ? `W${(parseInt(winnerStats.streak.slice(1)) || 1) + 1}` : 'W1';
      winnerStats.lastResult = 'W';
      const loserStats = stats[loserId];
      loserStats.losses++;
      loserStats.streak = loserStats.lastResult === 'L' ? `L${(parseInt(loserStats.streak.slice(1)) || 1) + 1}` : 'L1';
      loserStats.lastResult = 'L';
    }
  });
  const standings: Standing[] = teams.map(team => {
    const s = stats[team.id];
    const totalGames = s.wins + s.losses + s.ties;
    const winPercentage = totalGames === 0 ? 0 : (s.wins + 0.5 * s.ties) / totalGames;
    return { teamId: team.id, wins: s.wins, losses: s.losses, ties: s.ties, winPercentage, streak: s.streak || '-', rank: 0 };
  });
  standings.sort((a, b) => b.winPercentage !== a.winPercentage ? b.winPercentage - a.winPercentage : b.wins - a.wins);
  standings.forEach((s, i) => { s.rank = i + 1; });
  return standings;
}

export function generatePlayoffBracket(standings: Standing[], size: 4 | 8): any[] {
  const topTeams = standings.slice(0, size);
  const rounds = Math.log2(size);
  const games: any[] = [];
  for (let i = 0; i < size / 2; i++) {
    const seed1 = i + 1; const seed2 = size - i;
    games.push({ id: `playoff-1-${i}`, round: 1, matchupIndex: i, team1Id: topTeams[seed1 - 1]?.teamId, team2Id: topTeams[seed2 - 1]?.teamId, seed1, seed2 });
  }
  for (let r = 2; r <= rounds; r++) {
    const numGames = size / Math.pow(2, r);
    for (let i = 0; i < numGames; i++) { games.push({ id: `playoff-${r}-${i}`, round: r, matchupIndex: i }); }
  }
  return games;
}

export function generateRealisticFootballScore(home: Team, away: Team, players: Player[]): { homeScore: number, awayScore: number } {
  const getTeamOVR = (team: Team) => {
    const roster = players.filter(p => p.teamId === team.id);
    if (roster.length > 0) {
      return Math.round(roster.reduce((sum, p) => sum + p.rating, 0) / roster.length);
    }
    return team.overallRating || 70;
  };
  const homeOVR = getTeamOVR(home);
  const awayOVR = getTeamOVR(away);
  const homeIntensity = Math.floor(homeOVR / 4) + (Math.random() * 15) + 3;
  const awayIntensity = Math.floor(awayOVR / 4) + (Math.random() * 15);
  const getScore = (intensity: number) => {
    const tds = Math.floor(Math.random() * (intensity / 7 + 3));
    const fgs = Math.floor(Math.random() * (intensity / 10 + 2));
    let score = 0;
    for (let i = 0; i < tds; i++) {
        score += 6;
        const choice = Math.random();
        if (choice < 0.90) score += 1; else if (choice < 0.95) score += 2;
    }
    score += (fgs * 3);
    return score === 1 ? 0 : score;
  };
  return { homeScore: getScore(homeIntensity), awayScore: getScore(awayIntensity) };
}

export function isValidFootballScore(score: number): boolean {
  return score >= 0 && Number.isInteger(score) && score !== 1;
}

export function calculatePlayerRankings(players: Player[], stat: string, direction: 'high' | 'low' = 'high') {
  const sorted = [...players].sort((a, b) => {
    const valA = (a.stats[stat as keyof typeof a.stats] as number) || 0;
    const valB = (b.stats[stat as keyof typeof b.stats] as number) || 0;
    return direction === 'high' ? valB - valA : valA - valB;
  });
  const rankings: Record<string, number> = {};
  sorted.forEach((p, index) => { rankings[p.id] = index + 1; });
  return rankings;
}

export const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Creates a deterministic pseudo-random number generator (PRNG).
 * Uses a string seed (like gameId) to ensure identical results for repeated calls.
 */
export function createSeededRandom(seed: string) {
  let h = 0xdeadbeef;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(31, h) + seed.charCodeAt(i) | 0; }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
