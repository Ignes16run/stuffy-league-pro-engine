import React, { useState, useCallback } from 'react';
import { Game, Team, Player, NewsStory } from '@/lib/league/types';
import { generateRealisticFootballScore, getNewsModifiers } from '@/lib/league/utils';
// Updated: 2026-03-27T19:50Z

export function useLeagueSimulation(
  teams: Team[], 
  players: Player[], 
  games: Game[], 
  news: NewsStory[],
  setGames: React.Dispatch<React.SetStateAction<Game[]>>, 
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>, 
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>, 
  recalculateStats: (allGames: Game[], allPlayers: Player[]) => Player[]
) {
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateGames = useCallback((week: number) => {
    const updatedGames = [...games];
    const pointsMap = new Map<string, number>();

    const newsModifiers = getNewsModifiers(news, week - 1);

    games.filter(g => g.week === week && g.winnerId === undefined && !g.isTie).forEach(game => {
      const homeTeam = teams.find(t => t.id === game.homeTeamId);
      const awayTeam = teams.find(t => t.id === game.awayTeamId);
      if (homeTeam && awayTeam) {
        const homeMod = newsModifiers[homeTeam.id] || 0;
        const awayMod = newsModifiers[awayTeam.id] || 0;
        const score = generateRealisticFootballScore(homeTeam, awayTeam, players, homeMod, awayMod);
        const gameIndex = updatedGames.findIndex(g => g.id === game.id);
        const isTie = score.homeScore === score.awayScore;
        const winnerId = isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId);

        updatedGames[gameIndex] = {
          ...game, homeScore: score.homeScore, awayScore: score.awayScore,
          winnerId,
          isTie
        };

        // Award SP
        if (isTie) {
          pointsMap.set(game.homeTeamId, (pointsMap.get(game.homeTeamId) || 0) + 25);
          pointsMap.set(game.awayTeamId, (pointsMap.get(game.awayTeamId) || 0) + 25);
        } else {
          pointsMap.set(winnerId!, (pointsMap.get(winnerId!) || 0) + 10);
          const loserId = winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
          pointsMap.set(loserId, (pointsMap.get(loserId) || 0) + 50);
        }
      }
    });

    setGames(updatedGames);
    if (pointsMap.size > 0) {
      setTeams(prev => prev.map(t => ({
        ...t,
        stuffyPoints: (t.stuffyPoints || 0) + (pointsMap.get(t.id) || 0)
      })));
    }
    setPlayers(prev => recalculateStats(updatedGames, prev));
  }, [games, teams, players, news, setGames, setTeams, setPlayers, recalculateStats]);

  const simulateSeason = useCallback(async (numWeeks: number) => {
    setIsSimulating(true);
    const updatedGames = [...games];
    const pointsMap = new Map<string, number>();

    for (let w = 1; w <= numWeeks; w++) {
      const newsModifiers = getNewsModifiers(news, w - 1);
      updatedGames.filter(g => g.week === w && g.winnerId === undefined && !g.isTie).forEach(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeamId);
        const awayTeam = teams.find(t => t.id === game.awayTeamId);
        if (homeTeam && awayTeam) {
          const homeMod = newsModifiers[homeTeam.id] || 0;
          const awayMod = newsModifiers[awayTeam.id] || 0;
          const score = generateRealisticFootballScore(homeTeam, awayTeam, players, homeMod, awayMod);
          const gameIndex = updatedGames.findIndex(g => g.id === game.id);
          const isTie = score.homeScore === score.awayScore;
          const winnerId = isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId);

          updatedGames[gameIndex] = {
            ...game, homeScore: score.homeScore, awayScore: score.awayScore,
            winnerId,
            isTie
          };

          // Award SP
          if (isTie) {
            pointsMap.set(game.homeTeamId, (pointsMap.get(game.homeTeamId) || 0) + 25);
            pointsMap.set(game.awayTeamId, (pointsMap.get(game.awayTeamId) || 0) + 25);
          } else {
            pointsMap.set(winnerId!, (pointsMap.get(winnerId!) || 0) + 10);
            const loserId = winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
            pointsMap.set(loserId, (pointsMap.get(loserId) || 0) + 50);
          }
        }
      });
    }

    setGames(updatedGames);
    if (pointsMap.size > 0) {
      setTeams(prev => prev.map(t => ({
        ...t,
        stuffyPoints: (t.stuffyPoints || 0) + (pointsMap.get(t.id) || 0)
      })));
    }
    
    const finalPlayers = recalculateStats(updatedGames, players);
    setPlayers(finalPlayers);
    setIsSimulating(false);

    return { currentGames: updatedGames, currentPlayers: finalPlayers };
  }, [games, teams, players, news, setGames, setTeams, setPlayers, recalculateStats]);

  return {
    isSimulating,
    simulateGames,
    simulateSeason
  };
}
