import { Team, Game, Standing } from './types';

export function generateRoundRobinSchedule(teams: Team[], numWeeks: number = 0): Game[] {
  if (teams.length < 2) return [];

  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  const isOdd = n % 2 !== 0;
  const pool = isOdd ? [...teamIds, null] : [...teamIds];
  const numTeams = pool.length;
  const roundsPerCycle = numTeams - 1;
  
  // If numWeeks is not specified or 0, default to one full cycle
  const totalWeeks = numWeeks > 0 ? numWeeks : roundsPerCycle;

  const games: Game[] = [];

  for (let week = 1; week <= totalWeeks; week++) {
    // Calculate which round of the cycle we are in (0-indexed)
    const cycleRound = (week - 1) % roundsPerCycle;
    
    // We need to rotate the pool to the correct state for this round
    // A more efficient way is to calculate the rotation for each week
    const currentPool = [...pool];
    for (let r = 0; r < cycleRound; r++) {
      currentPool.splice(1, 0, currentPool.pop()!);
    }

    for (let i = 0; i < numTeams / 2; i++) {
      const home = currentPool[i];
      const away = currentPool[numTeams - 1 - i];

      if (home !== null && away !== null) {
        games.push({
          id: `game-w${week}-m${i}`,
          week: week,
          homeTeamId: home,
          awayTeamId: away,
        });
      }
    }
  }

  return games;
}

export function calculateStandings(teams: Team[], games: Game[]): Standing[] {
  const stats: Record<string, { wins: number; losses: number; ties: number; streak: string; lastResult: string }> = {};

  teams.forEach(team => {
    stats[team.id] = { wins: 0, losses: 0, ties: 0, streak: '', lastResult: '' };
  });

  // Sort games by week to calculate streak correctly
  const sortedGames = [...games].sort((a, b) => a.week - b.week);

  sortedGames.forEach(game => {
    if (!game.winnerId && !game.isTie) return;

    if (game.isTie) {
      // Home Team Tie
      const homeStats = stats[game.homeTeamId];
      homeStats.ties++;
      if (homeStats.lastResult === 'T') {
        const currentStreak = parseInt(homeStats.streak.slice(1)) || 1;
        homeStats.streak = `T${currentStreak + 1}`;
      } else {
        homeStats.streak = 'T1';
      }
      homeStats.lastResult = 'T';

      // Away Team Tie
      const awayStats = stats[game.awayTeamId];
      awayStats.ties++;
      if (awayStats.lastResult === 'T') {
        const currentStreak = parseInt(awayStats.streak.slice(1)) || 1;
        awayStats.streak = `T${currentStreak + 1}`;
      } else {
        awayStats.streak = 'T1';
      }
      awayStats.lastResult = 'T';
    } else if (game.winnerId) {
      const loserId = game.winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;

      // Winner
      const winnerStats = stats[game.winnerId];
      winnerStats.wins++;
      if (winnerStats.lastResult === 'W') {
        const currentStreak = parseInt(winnerStats.streak.slice(1)) || 1;
        winnerStats.streak = `W${currentStreak + 1}`;
      } else {
        winnerStats.streak = 'W1';
      }
      winnerStats.lastResult = 'W';

      // Loser
      const loserStats = stats[loserId];
      loserStats.losses++;
      if (loserStats.lastResult === 'L') {
        const currentStreak = parseInt(loserStats.streak.slice(1)) || 1;
        loserStats.streak = `L${currentStreak + 1}`;
      } else {
        loserStats.streak = 'L1';
      }
      loserStats.lastResult = 'L';
    }
  });

  const standings: Standing[] = teams.map(team => {
    const s = stats[team.id];
    const totalGames = s.wins + s.losses + s.ties;
    // Win percentage: (Wins + 0.5 * Ties) / Total Games
    const winPercentage = totalGames === 0 ? 0 : (s.wins + 0.5 * s.ties) / totalGames;
    return {
      teamId: team.id,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      winPercentage,
      streak: s.streak || '-',
      rank: 0,
    };
  });

  // Sort by win percentage, then wins
  standings.sort((a, b) => {
    if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
    return b.wins - a.wins;
  });

  // Assign ranks
  standings.forEach((s, i) => {
    s.rank = i + 1;
  });

  return standings;
}

export function generatePlayoffBracket(standings: Standing[], size: 4 | 8): any[] {
  const topTeams = standings.slice(0, size);
  const rounds = Math.log2(size);
  const games: any[] = [];

  // Initial round (Quarterfinals or Semifinals)
  for (let i = 0; i < size / 2; i++) {
    const seed1 = i + 1;
    const seed2 = size - i;
    games.push({
      id: `playoff-1-${i}`,
      round: 1,
      matchupIndex: i,
      team1Id: topTeams[seed1 - 1]?.teamId,
      team2Id: topTeams[seed2 - 1]?.teamId,
      seed1,
      seed2,
    });
  }

  // Subsequent rounds (empty for now)
  for (let r = 2; r <= rounds; r++) {
    const numGames = size / Math.pow(2, r);
    for (let i = 0; i < numGames; i++) {
      games.push({
        id: `playoff-${r}-${i}`,
        round: r,
        matchupIndex: i,
      });
    }
  }

  return games;
}
