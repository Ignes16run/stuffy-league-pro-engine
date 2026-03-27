/**
 * tickerEngine.ts — Logic for generating dynamic broadcast ticker items
 * 
 * Part of the Stuffy League Pro UI Polish Pass.
 * Created: 2026-03-26
 */

import { Game, Team, Player } from './types';
import { calculateStandings } from './utils';

export interface TickerItem {
  category: string;
  content: string;
  color?: string;
}

/**
 * Generates a list of ticker items based on current league state.
 */
export function generateTickerItems(
  games: Game[],
  teams: Team[],
  players: Player[],
  currentWeek: number,
  activeGameId: string | null
): TickerItem[] {
  const items: TickerItem[] = [];

  // 1. SCORES (Completed games this week)
  const completedThisWeek = games.filter(g => g.week === currentWeek && g.homeScore !== undefined && g.id !== activeGameId);
  if (completedThisWeek.length > 0) {
    completedThisWeek.forEach(g => {
      const home = teams.find(t => t.id === g.homeTeamId);
      const away = teams.find(t => t.id === g.awayTeamId);
      if (home && away) {
        items.push({
          category: 'FINAL',
          content: `${away.name} ${g.awayScore} - ${home.name} ${g.homeScore}`,
          color: 'text-emerald-400'
        });
      }
    });
  }

  // 2. UPCOMING (Remaining games this week)
  const upcomingThisWeek = games.filter(g => g.week === currentWeek && g.homeScore === undefined && g.id !== activeGameId);
  if (upcomingThisWeek.length > 0) {
    upcomingThisWeek.slice(0, 4).forEach(g => {
      const home = teams.find(t => t.id === g.homeTeamId);
      const away = teams.find(t => t.id === g.awayTeamId);
      if (home && away) {
        items.push({
          category: 'UPCOMING',
          content: `${away.name} @ ${home.name}`
        });
      }
    });
  }

  // 3. LEADERS (Best stats)
  const playerStats = players.filter(p => (p.stats.gamesPlayed || 0) > 0);
  
  // Passing Leaders
  const passingLeaders = [...playerStats]
    .filter(p => (p.stats.passingYards || 0) > 0)
    .sort((a, b) => (b.stats.passingYards || 0) - (a.stats.passingYards || 0))
    .slice(0, 5);
    
  if (passingLeaders.length > 0) {
    const content = passingLeaders.map((p, index) => {
      const team = teams.find(t => t.id === p.teamId);
      return `#${index + 1} ${p.name} (${team?.name}): ${p.stats.passingYards} YDS`;
    }).join(' • ');

    items.push({
      category: 'SEASON PASSING LEADERS',
      content,
      color: 'text-cyan-400'
    });
  }

  // Rushing Leaders
  const rushingLeaders = [...playerStats]
    .filter(p => (p.stats.rushingYards || 0) > 0)
    .sort((a, b) => (b.stats.rushingYards || 0) - (a.stats.rushingYards || 0))
    .slice(0, 5);

  if (rushingLeaders.length > 0) {
    const content = rushingLeaders.map((p, index) => {
      const team = teams.find(t => t.id === p.teamId);
      return `#${index + 1} ${p.name} (${team?.name}): ${p.stats.rushingYards} YDS`;
    }).join(' • ');

    items.push({
      category: 'SEASON RUSHING LEADERS',
      content,
      color: 'text-rose-400'
    });
  }

  // Sack Leaders
  const sackLeaders = [...playerStats]
    .filter(p => (p.stats.sacks || 0) > 0)
    .sort((a, b) => (b.stats.sacks || 0) - (a.stats.sacks || 0))
    .slice(0, 5);

  if (sackLeaders.length > 0) {
    const content = sackLeaders.map((p, index) => {
      const team = teams.find(t => t.id === p.teamId);
      return `#${index + 1} ${p.name} (${team?.name}): ${p.stats.sacks} SACKS`;
    }).join(' • ');

    items.push({
      category: 'SEASON SACK LEADERS',
      content,
      color: 'text-amber-400'
    });
  }

  // 4. STANDINGS (Top teams)
  const standings = calculateStandings(teams, games);
  const topTeams = standings.slice(0, 4);
  topTeams.forEach(s => {
    const team = teams.find(t => t.id === s.teamId);
    if (team) {
       items.push({
         category: 'STANDINGS',
         content: `${team.name} (${s.wins}-${s.losses}-${s.ties})`,
       });
    }
  });

  // Fallback if empty
  if (items.length === 0) {
    items.push({ category: 'BROADCAST', content: 'STUFFY LEAGUE ELITE: LIVE COVERAGE '});
    items.push({ category: 'BROADCAST', content: 'NEXT GEN SPORTS ENGINE v6.2' });
  }

  return items;
}
