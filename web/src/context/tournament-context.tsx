"use client";
// Last Updated: 2026-03-23T09:45:00-04:00

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Team, PlayoffGame, Player } from '@/lib/league/types';
import { generateUUID, createSeededRandom, generateRealisticFootballScore } from '@/lib/league/utils';
import { useLeague } from './league-context';

interface TournamentContextType {
  tournamentGames: PlayoffGame[];
  tournamentTeams: Team[];
  isStarted: boolean;
  bracketSize: number;
  winnerId: string | null;
  initTournament: (teams: Team[], size: number) => void;
  handlePick: (gameId: string, winnerId: string) => void;
  simulateRound: () => void;
  resetTournament: () => void;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const { players } = useLeague();
  const [tournamentGames, setTournamentGames] = useState<PlayoffGame[]>([]);
  const [tournamentTeams, setTournamentTeams] = useState<Team[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [bracketSize, setBracketSize] = useState(8);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('stuffy_tournament_data');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setTournamentGames(data.tournamentGames || []);
        setTournamentTeams(data.tournamentTeams || []);
        setIsStarted(data.isStarted || false);
        setBracketSize(data.bracketSize || 8);
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
      localStorage.setItem('stuffy_tournament_data', JSON.stringify(data));
    }
  }, [tournamentGames, tournamentTeams, isStarted, bracketSize, winnerId, isInitializing]);

  const initTournament = useCallback((teams: Team[], size: number) => {
    setTournamentTeams(teams);
    setBracketSize(size);
    setIsStarted(true);
    setWinnerId(null);

    const newGames: PlayoffGame[] = [];
    const numRounds = Math.log2(size);
    
    // Generate Round 1 Matchups
    for (let i = 0; i < size / 2; i++) {
      newGames.push({
        id: `r1-m${i}`,
        round: 1,
        matchupIndex: i,
        team1Id: teams[i]?.id,
        seed1: i + 1,
        team2Id: teams[size - 1 - i]?.id,
        seed2: size - i
      });
    }

    // Generate upcoming rounds
    for (let r = 2; r <= numRounds; r++) {
      const gamesInRound = size / Math.pow(2, r);
      for (let i = 0; i < gamesInRound; i++) {
        newGames.push({
          id: `r${r}-m${i}`,
          round: r,
          matchupIndex: i
        });
      }
    }

    setTournamentGames(newGames);
  }, []);

  const handlePick = useCallback((gameId: string, winnerId: string) => {
    const nextGames = [...tournamentGames];
    const gameIdx = nextGames.findIndex(g => g.id === gameId);
    if (gameIdx === -1) return;

    const game = nextGames[gameIdx];
    const team1 = tournamentTeams.find(t => t.id === game.team1Id);
    const team2 = tournamentTeams.find(t => t.id === game.team2Id);
    const isT1 = winnerId === game.team1Id;
    
    // Use players if available from league context for better simulation, 
    // otherwise it falls back to ratings in generateRealisticFootballScore
    const score = generateRealisticFootballScore(isT1 ? team1! : team2!, isT1 ? team2! : team1!, players);
    
    // Ensure no ties and winner has higher score
    const s1 = isT1 ? Math.max(score.homeScore, score.awayScore + 3) : Math.min(score.homeScore, score.awayScore - 3);
    const s2 = isT1 ? Math.min(score.awayScore, score.homeScore - 3) : Math.max(score.awayScore, score.homeScore + 3);

    nextGames[gameIdx] = {
      ...game,
      winnerId,
      team1Score: s1,
      team2Score: s2
    };

    // Advance to next round
    const nextRound = game.round + 1;
    const nextMatchIdx = Math.floor(game.matchupIndex / 2);
    const isSlot1 = game.matchupIndex % 2 === 0;
    
    const targetGame = nextGames.find(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
    if (targetGame) {
      if (isSlot1) {
        targetGame.team1Id = winnerId;
        targetGame.seed1 = winnerId === game.team1Id ? game.seed1 : game.seed2;
      } else {
        targetGame.team2Id = winnerId;
        targetGame.seed2 = winnerId === game.team1Id ? game.seed1 : game.seed2;
      }
    } else {
      // This was the championship
      setWinnerId(winnerId);
    }

    setTournamentGames(nextGames);
  }, [tournamentGames, tournamentTeams, players]);

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

    const gamesInRound = nextGames.filter(g => g.round === currentRound);
    
    gamesInRound.forEach(game => {
       if (game.winnerId || !game.team1Id || !game.team2Id) return;

       const t1 = tournamentTeams.find(t => t.id === game.team1Id);
       const t2 = tournamentTeams.find(t => t.id === game.team2Id);
       
       if (t1 && t2) {
          const score = generateRealisticFootballScore(t1, t2, players);
          
          let s1 = score.homeScore;
          let s2 = score.awayScore;
          
          if (s1 === s2) s1 += 1;
          
          const winnerId = s1 > s2 ? t1.id : t2.id;
          
          const gIdx = nextGames.findIndex(g => g.id === game.id);
          nextGames[gIdx] = {
            ...game,
            winnerId,
            team1Score: s1,
            team2Score: s2
          };

          // Advance
          const nextRound = currentRound + 1;
          const nextMatchIdx = Math.floor(game.matchupIndex / 2);
          const isSlot1 = game.matchupIndex % 2 === 0;
          const targetGame = nextGames.find(g => g.round === nextRound && g.matchupIndex === nextMatchIdx);
          
          if (targetGame) {
             if (isSlot1) {
                targetGame.team1Id = winnerId;
                targetGame.seed1 = winnerId === game.team1Id ? game.seed1 : game.seed2;
             } else {
                targetGame.team2Id = winnerId;
                targetGame.seed2 = winnerId === game.team1Id ? game.seed1 : game.seed2;
             }
          } else {
            setWinnerId(winnerId);
          }
       }
    });

    setTournamentGames(nextGames);
  }, [tournamentGames, tournamentTeams, players]);

  const resetTournament = useCallback(() => {
    setTournamentGames([]);
    setTournamentTeams([]);
    setIsStarted(false);
    setBracketSize(8);
    setWinnerId(null);
    localStorage.removeItem('stuffy_tournament_data');
  }, []);

  return (
    <TournamentContext.Provider value={{
      tournamentGames, tournamentTeams, isStarted, bracketSize, winnerId,
      initTournament, handlePick, simulateRound, resetTournament
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (context === undefined) throw new Error('useTournament must be used within a TournamentProvider');
  return context;
}
