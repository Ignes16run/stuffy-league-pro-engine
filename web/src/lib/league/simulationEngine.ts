// Last Updated: 2026-03-22T22:10:00Z
import { Game, Player, Team, PlayerStats, AwardType } from './types';
import { generateRealisticFootballScore } from './utils';
import { assignStatsToPlayers } from './statsEngine';
import { validateGameStats } from './validationEngine';
import { validateAwardCandidates } from './awardsEngine';

/**
 * Orchestration engine for season-level simulations and finalizations.
 * Decoupled from React context for better testability and modularity.
 */
export const SimulationEngine = {

  /**
   * Simulates all unplayed games in a season.
   */
  async simulateSeason(
    games: Game[],
    teams: Team[],
    players: Player[]
  ): Promise<{ updatedPlayers: Player[], updatedGames: Game[] }> {
    const unplayedGames = games.filter(g => !g.winnerId && !g.isTie);
    let currentPlayers = [...players];
    const updatedGamesList: Game[] = [];

    for (const game of unplayedGames) {
      const home = teams.find(t => t.id === game.homeTeamId);
      const away = teams.find(t => t.id === game.awayTeamId);
      
      if (home && away) {
        const { homeScore, awayScore } = generateRealisticFootballScore(home, away, currentPlayers);
        const winnerId = homeScore > awayScore ? home.id : (awayScore > homeScore ? away.id : undefined);
        const updatedGame = { ...game, homeScore, awayScore, winnerId, isTie: homeScore === awayScore };
        updatedGamesList.push(updatedGame);
        
        // 1. Assign raw stats
        const preGamePlayers = [...currentPlayers];
        currentPlayers = assignStatsToPlayers(currentPlayers, home.id, homeScore, awayScore);
        currentPlayers = assignStatsToPlayers(currentPlayers, away.id, awayScore, homeScore);
        const postGamePlayers = [...currentPlayers];

        // 2. Post-game validation and correction (Delta-aware)
        const { validatedPlayers } = validateGameStats(updatedGame, postGamePlayers, preGamePlayers);
        currentPlayers = validatedPlayers;
      }
    }

    return { updatedPlayers: currentPlayers, updatedGames: updatedGamesList };
  },

  /**
   * Resets all season statistics and game results.
   */
  resetSeason(games: Game[], players: Player[]): { resetPlayers: Player[], resetGames: Game[] } {
    const resetGames = games.map(g => ({ ...g, homeScore: undefined, awayScore: undefined, winnerId: undefined, isTie: false }));
    const resetPlayers = players.map(p => ({ 
      ...p, 
      stats: { 
        gamesPlayed: 0, 
        points: 0, 
        tackles: 0, 
        yards: 0, 
        touchdowns: 0, 
        passingYards: 0,
        passingTds: 0,
        rushingYards: 0,
        rushingTds: 0,
        receivingYards: 0,
        receivingTds: 0,
        pressures: 0,
        tacklesForLoss: 0,
        interceptions: 0
      } as PlayerStats 
    }));
    return { resetPlayers, resetGames };
  },

  /**
   * Finalizes the current season, archiving stats into career stats and resetting season stats.
   */
  finalizeSeason(
    players: Player[],
    awardResults: Record<string, { winner: Player, narrative: string }>,
    currentYear: number
  ): { finalPlayers: Player[] } {
    const seasonId = currentYear.toString();
    
    const finalPlayers = players.map(p => {
      // 1. Migrate stats to career
      const career = { ...(p.stats || {}) } as Record<string, number>;
      const oldCareer = (p.careerStats ? { ...p.careerStats } : { gamesPlayed: 0 }) as Record<string, number>;
      
      Object.keys(career).forEach(k => {
          if (typeof career[k] === 'number') oldCareer[k] = (oldCareer[k] || 0) + career[k];
      });

      // 2. Add awards
      const newAwards = [...(p.awards || [])];
      const newAwardsHistory = [...(p.awardsHistory || [])];
      let narrativeText = '';

      Object.entries(awardResults).forEach(([cat, res]) => {
          if (res.winner.id === p.id) {
              narrativeText = narrativeText ? `${narrativeText} Also, ${res.narrative}` : res.narrative;
              newAwards.push({ year: currentYear, awardType: cat as AwardType, playerTeam: p.teamId, statsAtTime: { ...p.stats } });
              newAwardsHistory.push({ awardType: cat as AwardType, seasonId });
          }
      });

      return { 
          ...p, 
          careerStats: oldCareer as unknown as PlayerStats, 
          stats: { 
            gamesPlayed: 0, 
            points: 0, 
            tackles: 0, 
            yards: 0, 
            touchdowns: 0, 
            passingYards: 0,
            passingTds: 0,
            rushingYards: 0,
            rushingTds: 0,
            receivingYards: 0,
            receivingTds: 0,
            pressures: 0,
            tacklesForLoss: 0,
            interceptions: 0
          } as PlayerStats, 
          awards: newAwards,
          awardsHistory: newAwardsHistory,
          profile: narrativeText || p.profile 
      };
    });

    return { finalPlayers };
  },

  /**
   * Calculates award finalists based on the current season stats.
   */
  getAwardFinalists(players: Player[]): Record<string, Player[]> {
    const categories: AwardType[] = ['MVP', 'OPOY', 'DPOY', 'STPOY'];
    const sanitizedFinalists: Record<string, Player[]> = {};
    
    categories.forEach(cat => {
        sanitizedFinalists[cat] = validateAwardCandidates(players, cat);
    });

    return sanitizedFinalists;
  }
};
