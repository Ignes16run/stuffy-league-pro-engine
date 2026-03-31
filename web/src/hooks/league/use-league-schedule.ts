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

  const updatePlayoffResult = useCallback((
    gameId: string, 
    team1Score: number, 
    team2Score: number, 
    winnerId: string,
    setPlayoffGames: React.Dispatch<React.SetStateAction<PlayoffGame[]>>
  ) => {
    setPlayoffGames(prev => {
      const nextGames = prev.map(g => ({ ...g })); // Deepish copy
      const game = nextGames.find(g => g.id === gameId);
      if (!game) return prev;

      game.team1Score = team1Score;
      game.team2Score = team2Score;
      game.winnerId = winnerId;

      const nextRound = game.round + 1;
      const nextMatchIdx = Math.floor(game.matchupIndex / 2);
      const isSlot1 = game.matchupIndex % 2 === 0;

      const targetGame = nextGames.find(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
      if (targetGame) {
        const oldWinnerId = isSlot1 ? targetGame.team1Id : targetGame.team2Id;
        
        if (isSlot1) {
          targetGame.team1Id = game.winnerId;
          targetGame.seed1 = game.winnerId === game.team1Id ? game.seed1 : game.seed2;
        } else {
          targetGame.team2Id = game.winnerId;
          targetGame.seed2 = game.winnerId === game.team1Id ? game.seed1 : game.seed2;
        }

        if (oldWinnerId && oldWinnerId !== game.winnerId) {
          const clear = (gs: PlayoffGame[], r: number, m: number) => {
            const target = gs.find(g => g.round === r && g.matchupIndex === m);
            if (!target) return;
            target.winnerId = undefined;
            target.team1Score = undefined;
            target.team2Score = undefined;
            const nR = r + 1;
            const nM = Math.floor(m / 2);
            const t = gs.find(g => g.round === nR && g.matchupIndex === nM);
            if (t) {
              if (m % 2 === 0) { t.team1Id = undefined; t.seed1 = undefined; }
              else { t.team2Id = undefined; t.seed2 = undefined; }
              clear(gs, nR, nM);
            }
          };
          clear(nextGames, nextRound, nextMatchIdx);
        }
      }
      return nextGames;
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
    updateGameResult,
    updatePlayoffResult
  };
}
