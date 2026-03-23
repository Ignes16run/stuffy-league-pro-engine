import { Game, Team, Standing, SeasonHistory } from './types';

export interface GameStoryline {
  type: 'Rivalry' | 'UpsetWatch' | 'Streak' | 'FirstMeeting' | 'PlayoffRematch';
  label: string;
  color: string; // Tailored color strings for UI
}

/**
 * Checks if two teams are rivals based on their model data.
 */
export function isRivalry(game: Game, teams: Team[]): boolean {
  const home = teams.find(t => t.id === game.homeTeamId);
  const away = teams.find(t => t.id === game.awayTeamId);
  
  if (!home || !away) return false;
  
  const homeIsAwayRival = away.rivalTeamIds?.includes(home.id);
  const awayIsHomeRival = home.rivalTeamIds?.includes(away.id);
  
  return !!(homeIsAwayRival || awayIsHomeRival);
}

/**
 * Checks for wide rating gaps that suggest an upset.
 */
export function isUpsetWatch(home: Team, away: Team): boolean {
  const hRating = home.overallRating || 80;
  const aRating = away.overallRating || 80;
  return Math.abs(hRating - aRating) >= 10;
}

/**
 * Checks if this is a rematch of last year's finals (or playoffs).
 */
export function isPlayoffRematch(game: Game, history: SeasonHistory[]): boolean {
  if (history.length === 0) return false;
  // SeasonHistory only stores final standings and champion currently.
  // We'll skip deep rematch logic unless we expand history, 
  // but we can check if it's against the defending champ.
  return awayIsDefendingChamp(game, history) || homeIsDefendingChamp(game, history);
}

function homeIsDefendingChamp(game: Game, history: SeasonHistory[]): boolean {
  const lastChampId = history[history.length - 1]?.championId;
  return !!lastChampId && game.homeTeamId === lastChampId;
}

function awayIsDefendingChamp(game: Game, history: SeasonHistory[]): boolean {
  const lastChampId = history[history.length - 1]?.championId;
  return !!lastChampId && game.awayTeamId === lastChampId;
}

/**
 * Main engine function to derive game storylines on-the-fly.
 */
export function generateGameStorylines(
  game: Game, 
  teams: Team[], 
  standings: Standing[] = [], 
  history: SeasonHistory[] = []
): GameStoryline[] {
  const storylines: GameStoryline[] = [];
  const home = teams.find(t => t.id === game.homeTeamId);
  const away = teams.find(t => t.id === game.awayTeamId);

  if (!home || !away) return storylines;

  // 1. Rivalry
  if (isRivalry(game, teams)) {
    storylines.push({ 
      type: 'Rivalry', 
      label: 'Rivalry Game', 
      color: 'bg-rose-500 text-white' 
    });
  }

  // 2. Upset Watch
  if (isUpsetWatch(home, away)) {
    storylines.push({ 
      type: 'UpsetWatch', 
      label: 'Upset Watch', 
      color: 'bg-amber-500 text-white' 
    });
  }

  // 3. Defending Champ / Dynasty
  if (homeIsDefendingChamp(game, history) || awayIsDefendingChamp(game, history)) {
    storylines.push({ 
      type: 'PlayoffRematch', 
      label: 'Defending Champ', 
      color: 'bg-indigo-600 text-white' 
    });
  }

  // 4. Standings Momentum (Top 3 matchup)
  if (standings.length > 0) {
    const hStanding = standings.find(s => s.teamId === home.id);
    const aStanding = standings.find(s => s.teamId === away.id);
    if (hStanding && aStanding && hStanding.rank <= 3 && aStanding.rank <= 3) {
      storylines.push({ 
        type: 'Streak', 
        label: 'Clash of Titans', 
        color: 'bg-emerald-600 text-white' 
      });
    }
  }

  return storylines;
}
