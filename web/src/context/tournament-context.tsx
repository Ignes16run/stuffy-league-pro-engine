"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Team, Player } from '@/lib/league/types';
import { generateRealisticFootballScore } from '@/lib/league/utils';
import { useLeague } from './league-context';

export interface TournamentGame {
  id: string;
  round: number;
  matchupIndex: number;
  regionId?: string; // e.g., 'North', 'South', 'East', 'West', 'Final Four'
  regionalMatchupIndex?: number;
  team1Id?: string;
  team2Id?: string;
  winnerId?: string;
  seed1?: number;
  seed2?: number;
  team1Score?: number;
  team2Score?: number;
}

interface TournamentContextType {
  tournamentGames: TournamentGame[];
  tournamentTeams: Team[];
  isStarted: boolean;
  bracketSize: number;
  winnerId: string | null;
  initTournament: (teams: Team[], size: number, useSeeding: boolean) => void;
  handlePick: (gameId: string, winnerId: string) => void;
  simulateRound: () => void;
  simulateFullTournament: () => void;
  resetTournament: () => void;
}

const REGIONS = ['North', 'South', 'East', 'West'];

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const { players } = useLeague();
  const [tournamentGames, setTournamentGames] = useState<TournamentGame[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<Team[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [bracketSize, setBracketSize] = useState(32);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('stuffy_tournament_data_v2');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTournamentGames(data.tournamentGames || []);
        setTournamentTeams(data.tournamentTeams || []);
        setIsStarted(data.isStarted || false);
        setBracketSize(data.bracketSize || 32);
        setWinnerId(data.winnerId || null);
      } catch (e) {
        console.error('Failed to parse tournament data', e);
      }
    }
    setIsInitializing(false);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!isInitializing) {
      const data = { tournamentGames, tournamentTeams, isStarted, bracketSize, winnerId };
      localStorage.setItem('stuffy_tournament_data_v2', JSON.stringify(data));
    }
  }, [tournamentGames, tournamentTeams, isStarted, bracketSize, winnerId, isInitializing]);

  const initTournament = useCallback((teams: Team[], size: number, useSeeding: boolean) => {
    setTournamentTeams(teams);
    setBracketSize(size);
    setIsStarted(true);
    setWinnerId(null);

    const newGames: TournamentGame[] = [];
    const teamsPerRegion = size / 4;
    const roundsPerRegion = Math.log2(teamsPerRegion);
    
    // 1. Generate Regional Games
    REGIONS.forEach((region, rId) => {
      // Round 1
      for (let i = 0; i < teamsPerRegion / 2; i++) {
        const team1 = teams[(rId * teamsPerRegion) + i];
        const team2 = teams[(rId * teamsPerRegion) + teamsPerRegion - 1 - i];
        
        newGames.push({
          id: `reg-${rId}-r1-m${i}`,
          round: 1,
          matchupIndex: (rId * (teamsPerRegion / 2)) + i,
          regionId: region,
          regionalMatchupIndex: i,
          team1Id: team1?.id,
          seed1: useSeeding ? i + 1 : undefined,
          team2Id: team2?.id,
          seed2: useSeeding ? teamsPerRegion - i : undefined
        });
      }

      // Subsequent Regional Rounds
      for (let r = 2; r <= roundsPerRegion; r++) {
        const gamesInRound = teamsPerRegion / Math.pow(2, r);
        for (let i = 0; i < gamesInRound; i++) {
          newGames.push({
            id: `reg-${rId}-r${r}-m${i}`,
            round: r,
            matchupIndex: (rId * gamesInRound) + i,
            regionId: region,
            regionalMatchupIndex: i
          });
        }
      }
    });

    // 2. National Bracket (Final Four & Championship)
    const regionalFinalRound = roundsPerRegion;
    const finalFourRound = regionalFinalRound + 1;
    const championshipRound = finalFourRound + 1;

    // Final Four (2 games)
    newGames.push({ id: 'ff-m0', round: finalFourRound, matchupIndex: 0, regionId: 'Final Four', regionalMatchupIndex: 0 });
    newGames.push({ id: 'ff-m1', round: finalFourRound, matchupIndex: 1, regionId: 'Final Four', regionalMatchupIndex: 1 });

    // Championship
    newGames.push({ id: 'champ-m0', round: championshipRound, matchupIndex: 0, regionId: 'Championship', regionalMatchupIndex: 0 });

    setTournamentGames(newGames);
  }, []);

  const clearDownstreamLogic = useCallback((games: TournamentGame[], game: TournamentGame): TournamentGame[] => {
    const nextRound = game.round + 1;
    const nextMatchIdx = Math.floor(game.matchupIndex / 2);
    const isSlot1 = game.matchupIndex % 2 === 0;

    const targetIdx = games.findIndex(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
    if (targetIdx === -1) return games;

    const targetGame = games[targetIdx];
    const isChanged = isSlot1 ? !!targetGame.team1Id : !!targetGame.team2Id;

    if (isChanged) {
        const updatedGame = { ...targetGame };
        // Clear this slot
        if (isSlot1) {
            updatedGame.team1Id = undefined;
            updatedGame.seed1 = undefined;
        } else {
            updatedGame.team2Id = undefined;
            updatedGame.seed2 = undefined;
        }
        // Clear winner and scores if they existed
        updatedGame.winnerId = undefined;
        updatedGame.team1Score = undefined;
        updatedGame.team2Score = undefined;

        games[targetIdx] = updatedGame;

        // Recursively clear further downstream
        return clearDownstreamLogic(games, updatedGame);
    }

    return games;
  }, []);

  const simulateGameResult = useCallback((game: TournamentGame, teams: Team[], pl: Player[]) => {
    const t1 = teams.find(t => t.id === game.team1Id)!;
    const t2 = teams.find(t => t.id === game.team2Id)!;
    const score = generateRealisticFootballScore(t1, t2, pl);
    const s1 = score.homeScore === score.awayScore ? score.homeScore + 1 : score.homeScore;
    const s2 = score.awayScore;
    return { winnerId: s1 > s2 ? t1.id : t2.id, s1, s2 };
  }, []);

  const handlePick = useCallback((gameId: string, winnerId: string) => {
    let nextGames = [...tournamentGames];
    const gameIdx = nextGames.findIndex(g => g.id === gameId);
    if (gameIdx === -1) return;

    const game = nextGames[gameIdx];
    const isNewWinner = game.winnerId !== winnerId;
    
    // If winner is changing, clear downstream path first
    if (isNewWinner && game.winnerId) {
       nextGames = clearDownstreamLogic(nextGames, game);
    }

    const team1 = tournamentTeams.find(t => t.id === game.team1Id);
    const team2 = tournamentTeams.find(t => t.id === game.team2Id);
    const isT1 = winnerId === game.team1Id;
    
    const score = generateRealisticFootballScore(isT1 ? team1! : team2!, isT1 ? team2! : team1!, players);
    const s1 = isT1 ? Math.max(score.homeScore, score.awayScore + 3) : Math.min(score.homeScore, score.awayScore - 3);
    const s2 = isT1 ? Math.min(score.awayScore, score.homeScore - 3) : Math.max(score.awayScore, score.homeScore + 3);

    nextGames[gameIdx] = { ...game, winnerId, team1Score: s1, team2Score: s2 };

    // Advance
    const nextRound = game.round + 1;
    const nextMatchIdx = Math.floor(game.matchupIndex / 2);
    const isSlot1 = game.matchupIndex % 2 === 0;
    
    const targetIdx = nextGames.findIndex(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
    if (targetIdx !== -1) {
      const nextGame = { ...nextGames[targetIdx] };
      if (isSlot1) {
        nextGame.team1Id = winnerId;
        nextGame.seed1 = winnerId === game.team1Id ? game.seed1 : game.seed2;
      } else {
        nextGame.team2Id = winnerId;
        nextGame.seed2 = winnerId === game.team1Id ? game.seed1 : game.seed2;
      }
      nextGames[targetIdx] = nextGame;
    } else {
      setWinnerId(winnerId);
    }

    setTournamentGames(nextGames);
  }, [tournamentGames, tournamentTeams, players, clearDownstreamLogic]);

  const simulateRound = useCallback(() => {
    const nextGames = [...tournamentGames];
    const rounds = Array.from(new Set(nextGames.map(g => g.round))).sort((a, b) => a - b);
    
    let currentRound = 1;
    for (const r of rounds) {
      if (nextGames.filter(g => g.round === r).some(g => !g.winnerId && g.team1Id && g.team2Id)) {
        currentRound = r;
        break;
      }
    }

    const gamesInRound = nextGames.filter(g => g.round === currentRound && !g.winnerId && g.team1Id && g.team2Id);
    
    gamesInRound.forEach(game => {
       const { winnerId, s1, s2 } = simulateGameResult(game, tournamentTeams, players);
       const gIdx = nextGames.findIndex(g => g.id === game.id);
       nextGames[gIdx] = { ...game, winnerId, team1Score: s1, team2Score: s2 };

       // Advance
       const nextRound = currentRound + 1;
       const nextMatchIdx = Math.floor(game.matchupIndex / 2);
       const isSlot1 = game.matchupIndex % 2 === 0;
       const targetIdx = nextGames.findIndex(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
       
       if (targetIdx !== -1) {
          const nextGame = { ...nextGames[targetIdx] };
          if (isSlot1) {
             nextGame.team1Id = winnerId;
             nextGame.seed1 = winnerId === game.team1Id ? game.seed1 : game.seed2;
          } else {
             nextGame.team2Id = winnerId;
             nextGame.seed2 = winnerId === game.team1Id ? game.seed1 : game.seed2;
          }
          nextGames[targetIdx] = nextGame;
       } else {
         setWinnerId(winnerId);
       }
    });

    setTournamentGames(nextGames);
  }, [tournamentGames, tournamentTeams, players, simulateGameResult]);

  const simulateFullTournament = useCallback(() => {
     const nextGames = [...tournamentGames];
     const maxRound = Math.max(...nextGames.map(g => g.round));

     for (let r = 1; r <= maxRound; r++) {
         const gamesInRound = nextGames.filter(g => g.round === r);
         // Filter only those ready to be played
         const readyGames = gamesInRound.filter(g => !g.winnerId && g.team1Id && g.team2Id);
         
         readyGames.forEach(game => {
            const { winnerId, s1, s2 } = simulateGameResult(game, tournamentTeams, players);
            const gIdx = nextGames.findIndex(g => g.id === game.id);
            nextGames[gIdx] = { ...game, winnerId, team1Score: s1, team2Score: s2 };

            // Advance
            const nextRound = r + 1;
            const nextMatchIdx = Math.floor(game.matchupIndex / 2);
            const isSlot1 = game.matchupIndex % 2 === 0;
            const targetIdx = nextGames.findIndex(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
            
            if (targetIdx !== -1) {
                const nextGame = { ...nextGames[targetIdx] };
                if (isSlot1) {
                   nextGame.team1Id = winnerId;
                   nextGame.seed1 = winnerId === game.team1Id ? game.seed1 : game.seed2;
                } else {
                   nextGame.team2Id = winnerId;
                   nextGame.seed2 = winnerId === game.team1Id ? game.seed1 : game.seed2;
                }
                nextGames[targetIdx] = nextGame;
            } else {
                setWinnerId(winnerId);
            }
         });
     }
     setTournamentGames(nextGames);
  }, [tournamentGames, tournamentTeams, players, simulateGameResult]);

  const resetTournament = useCallback(() => {
    setTournamentGames([]);
    setTournamentTeams([]);
    setIsStarted(false);
    setBracketSize(32);
    setWinnerId(null);
    localStorage.removeItem('stuffy_tournament_data_v2');
  }, []);

  const value = useMemo(() => ({
    tournamentGames, tournamentTeams, isStarted, bracketSize, winnerId,
    initTournament, handlePick, simulateRound, simulateFullTournament, resetTournament
  }), [tournamentGames, tournamentTeams, isStarted, bracketSize, winnerId, initTournament, handlePick, simulateRound, simulateFullTournament, resetTournament]);

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) throw new Error('useTournament must be used within a TournamentProvider');
  return context;
}
