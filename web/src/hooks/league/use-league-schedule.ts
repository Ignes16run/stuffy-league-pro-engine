"use client";
import { useState, useCallback } from 'react';
import { Game, PlayoffGame, SeasonHistory, Team, Player } from '@/lib/league/types';
import { NUM_WEEKS_DEFAULT } from '@/lib/league/constants';
import { recalculateStats } from '@/lib/league/utils';

export function useLeagueSchedule() {
  const [games, setGames] = useState<Game[]>([]);
  const [playoffGames, setPlayoffGames] = useState<PlayoffGame[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [numWeeks, setNumWeeks] = useState(NUM_WEEKS_DEFAULT);
  const [history, setHistory] = useState<SeasonHistory[]>([]);

  const advanceWeek = useCallback(() => {
    if (currentWeek < numWeeks) setCurrentWeek(prev => prev + 1);
  }, [currentWeek, numWeeks]);

  const updateGameResult = useCallback((
    gameId: string, 
    homeScore: number, 
    awayScore: number, 
    winnerId: string | 'tie' | null,
    setGames: React.Dispatch<React.SetStateAction<Game[]>>,
    setPlayers: React.Dispatch<React.SetStateAction<Player[]>>,
    setTeams: React.Dispatch<React.SetStateAction<Team[]>>
  ) => {
    setGames(prev => {
      const updatedGames = [...prev];
      const gameIndex = updatedGames.findIndex(g => g.id === gameId);
      if (gameIndex === -1) return prev;

      const isTie = winnerId === 'tie';
      const finalWinnerId = isTie ? undefined : (winnerId || undefined);

      updatedGames[gameIndex] = {
        ...updatedGames[gameIndex],
        homeScore, awayScore, winnerId: finalWinnerId, isTie
      };

      // Trigger side effects
      setPlayers(pPrev => recalculateStats(updatedGames, pPrev));
      setTeams(tPrev => tPrev.map(t => {
        if (t.id === updatedGames[gameIndex].homeTeamId || t.id === updatedGames[gameIndex].awayTeamId) {
          let spToAdd = 10;
          if (isTie) spToAdd = 25;
          else if (finalWinnerId === t.id) spToAdd = 50; // Win gives 50
          return { ...t, stuffyPoints: (t.stuffyPoints || 0) + spToAdd };
        }
        return t;
      }));

      return updatedGames;
    });
  }, []);

  return {
    games,
    setGames,
    playoffGames,
    setPlayoffGames,
    currentWeek,
    setCurrentWeek,
    numWeeks,
    setNumWeeks,
    history,
    setHistory,
    advanceWeek,
    updateGameResult
  };
}
