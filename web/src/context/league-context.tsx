"use client";
// Last Updated: 2026-03-23T00:05:00Z

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Team, Game, PlayoffGame, SeasonHistory, Player, PlayerStats,
  PlayerAward, NarrativeMemoryEntry, AwardsHistoryEntry,
  PlayerPosition, PlayerAbility, AwardType
} from '@/lib/league/types';
import { 
  generateRoundRobinSchedule, 
  calculateStandings, 
  generateRealisticFootballScore, 
  generateUUID,
  createSeededRandom 
} from '@/lib/league/utils';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/context/auth-context';
import { generateTeamRoster, migratePlayerRatings } from '@/lib/league/players';
import { selectNarrativeTemplate, generateNarrative } from '@/lib/league/narratives';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { getStatForAward } from '@/lib/league/awardsEngine';
import { PersistenceEngine } from '@/lib/league/persistenceEngine';
import { SimulationEngine } from '@/lib/league/simulationEngine';
import { assignStatsToPlayers } from '@/lib/league/statsEngine';
import { validateGameStats } from '@/lib/league/validationEngine';

interface LeagueContextType {
  teams: Team[];
  players: Player[];
  games: Game[];
  playoffGames: PlayoffGame[];
  history: SeasonHistory[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentWeek: number;
  addTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (team: Team) => Promise<void>;
  createLeague: (name: string) => Promise<void>;
  setCurrentWeek: (week: number) => void;
  advanceWeek: () => void;
  simulateGames: (week: number) => void;
  resetLeague: () => Promise<void>;
  saveToSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
  simulateSeason: () => void;
  resetPredictions: () => void;
  handlePick: (gameId: string, winnerId: string | 'tie' | null) => void;
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setGames: React.Dispatch<React.SetStateAction<Game[]>>;
  setPlayoffGames: React.Dispatch<React.SetStateAction<PlayoffGame[]>>;
  syncPlayoffGames: (bracket: PlayoffGame[]) => Promise<void>;
  setHistory: React.Dispatch<React.SetStateAction<SeasonHistory[]>>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [playoffGames, setPlayoffGames] = useState<PlayoffGame[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [history, setHistory] = useState<SeasonHistory[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentNarrativesUsed, setRecentNarrativesUsed] = useState<NarrativeMemoryEntry[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // --- STAT RECALCULATION ENGINE ---
  /**
   * Rebuilds all player statistics from scratch based on the current state of games.
   * Ensures idempotency and prevents stat compounding.
   */
  const recalculateStats = useCallback((allGames: Game[], allPlayers: Player[]) => {
    // 1. Reset everyone to zero
    let playersPool = allPlayers.map(p => ({
      ...p,
      stats: { gamesPlayed: 0 } as PlayerStats
    }));

    // 2. Identify all completed games (Picks or Sims)
    const completedGames = allGames
      .filter(g => (g.homeScore !== undefined && g.awayScore !== undefined))
      .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id));

    // 3. Deterministically replay each game's stat generation
    completedGames.forEach(game => {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      
      // Use gameId as seed to ensure consistency
      const random = createSeededRandom(game.id);
      
      // Home
      playersPool = assignStatsToPlayers(playersPool, game.homeTeamId, homeScore, awayScore, random);
      // Away
      playersPool = assignStatsToPlayers(playersPool, game.awayTeamId, awayScore, homeScore, random);
    });

    return playersPool;
  }, []);

  // Sync effect to handle initialization and initial stat population
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('stuffy_league_data');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            setTeams(data.teams || []);
            setPlayers(data.players || []);
            setGames(data.games || []);
            setPlayoffGames(data.playoffGames || []);
            setCurrentWeek(data.currentWeek || 1);
            setHistory(data.history || []);
          } catch (e) {
            console.error('Failed to parse saved data', e);
          }
        }
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // Persistence effect
  useEffect(() => {
    if (!isInitializing) {
      const data = { teams, players, games, playoffGames, currentWeek, history };
      localStorage.setItem('stuffy_league_data', JSON.stringify(data));
    }
  }, [teams, players, games, playoffGames, currentWeek, history, isInitializing]);

  const addTeam = async (team: Omit<Team, 'id'>) => {
    const newTeam = { ...team, id: generateUUID() };
    const newTeams = [...teams, newTeam];
    
    // Generate roster for new team
    const newRoster = generateTeamRoster(newTeam.id);
    const newPlayers = [...players, ...newRoster];
    
    setTeams(newTeams);
    setPlayers(newPlayers);
    
    if (user) {
      await PersistenceEngine.saveTeams([newTeam]);
      await PersistenceEngine.savePlayers(newRoster);
    }
  };

  const updateTeam = async (team: Team) => {
    const newTeams = teams.map(t => t.id === team.id ? team : t);
    setTeams(newTeams);
    if (user) {
      await PersistenceEngine.updateTeam(team);
    }
  };

  const resetLeague = async () => {
    setTeams([]);
    setPlayers([]);
    setGames([]);
    setPlayoffGames([]);
    setCurrentWeek(1);
    setHistory([]);
    localStorage.removeItem('stuffy_league_data');
    
    if (user) {
      await supabase.from('teams').delete().neq('id', '0');
      await supabase.from('players').delete().neq('id', '0');
      await supabase.from('games').delete().neq('id', '0');
    }
  };

  const createLeague = async (name: string) => {
    await resetLeague();
    
    // Add default teams
    for (const teamDef of DEFAULT_LEAGUE_TEAMS) {
      await addTeam(teamDef);
    }
    
    // Generate schedule
    const newGames = generateRoundRobinSchedule(teams, 14);
    setGames(newGames);
    
    if (user) {
      await PersistenceEngine.saveGames(newGames);
    }
  };

  const saveToSupabase = async () => {
    if (!user) return;
    await PersistenceEngine.saveTeams(teams);
    await PersistenceEngine.savePlayers(players);
    await PersistenceEngine.saveGames(games);
    await PersistenceEngine.savePlayoffGames(playoffGames);
  };

  const loadFromSupabase = async () => {
    if (!user) return;
    const { teams: t, players: p, games: g, playoffGames: pg } = await PersistenceEngine.loadAll();
    if (t) setTeams(t);
    if (p) setPlayers(p);
    if (g) setGames(g);
    if (pg) setPlayoffGames(pg);
  };

  const advanceWeek = () => {
    if (currentWeek < 14) {
      setCurrentWeek(prev => prev + 1);
    }
  };

  const simulateGames = (week: number) => {
    const weekGames = games.filter(g => g.week === week);
    const updatedGames = [...games];
    let updatedPlayers = [...players];

    weekGames.forEach(game => {
      const homeTeam = teams.find(t => t.id === game.homeTeamId);
      const awayTeam = teams.find(t => t.id === game.awayTeamId);
      if (homeTeam && awayTeam) {
        const score = generateRealisticFootballScore(homeTeam, awayTeam, players);
        const gameIndex = updatedGames.findIndex(g => g.id === game.id);
        
        const isTie = score.homeScore === score.awayScore;
        const winnerId = isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId);
        
        updatedGames[gameIndex] = {
          ...game,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          winnerId,
          isTie
        };
      }
    });

    setGames(updatedGames);
    setPlayers(prev => recalculateStats(updatedGames, prev));
  };

  const simulateSeason = () => {
    let updatedGames = [...games];
    
    for (let w = 1; w <= 14; w++) {
      const weekGames = updatedGames.filter(g => g.week === w);
      weekGames.forEach(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeamId);
        const awayTeam = teams.find(t => t.id === game.awayTeamId);
        if (homeTeam && awayTeam) {
          const score = generateRealisticFootballScore(homeTeam, awayTeam, players);
          const gameIndex = updatedGames.findIndex(g => g.id === game.id);
          
          const isTie = score.homeScore === score.awayScore;
          const winnerId = isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId);
          
          updatedGames[gameIndex] = {
            ...game,
            homeScore: score.homeScore,
            awayScore: score.awayScore,
            winnerId,
            isTie
          };
        }
      });
    }

    setGames(updatedGames);
    setPlayers(prev => recalculateStats(updatedGames, prev));
    setCurrentWeek(14);
  };

  const resetPredictions = () => {
    const resetGames = games.map(g => ({
      ...g,
      homeScore: undefined,
      awayScore: undefined,
      winnerId: undefined,
      isTie: undefined
    }));
    setGames(resetGames);
    setPlayers(prev => prev.map(p => ({ ...p, stats: { gamesPlayed: 0 } as PlayerStats })));
  };

  return (
    <LeagueContext.Provider value={{
      teams, players, games, playoffGames, history, activeTab, setActiveTab,
      currentWeek, addTeam, updateTeam, createLeague, setCurrentWeek, 
      advanceWeek, simulateGames, resetLeague, saveToSupabase, loadFromSupabase,
      simulateSeason, resetPredictions, 
      handlePick: (gameId, winnerId) => {
        const gameToUpdate = games.find(g => g.id === gameId);
        if (!gameToUpdate) return;
        
        let finalHomeScore = 0;
        let finalAwayScore = 0;
        const finalWinnerId = winnerId === 'tie' ? undefined : (winnerId || undefined);
        const isTie = winnerId === 'tie';

        const homeTeam = teams.find(t => t.id === gameToUpdate.homeTeamId);
        const awayTeam = teams.find(t => t.id === gameToUpdate.awayTeamId);

        // 1. Generate Result (Winner/Scores)
        if (winnerId === 'tie') {
            finalHomeScore = 20 + Math.floor(Math.random() * 10);
            finalAwayScore = finalHomeScore;
        } else if (winnerId) {
            const isHome = winnerId === gameToUpdate.homeTeamId;
            const winner = isHome ? homeTeam : awayTeam;
            const loser = isHome ? awayTeam : homeTeam;
            if (winner && loser) {
               const score = generateRealisticFootballScore(winner, loser, players);
               finalHomeScore = isHome ? Math.max(score.homeScore, score.awayScore + 3) : Math.min(score.homeScore, score.awayScore - 3);
               finalAwayScore = isHome ? Math.min(score.awayScore, score.homeScore - 3) : Math.max(score.awayScore, score.homeScore + 3);
            } else {
               finalHomeScore = isHome ? 21 : 14;
               finalAwayScore = isHome ? 14 : 21;
            }
        } else {
            // Deselect
            const deselectGames = games.map(x => x.id === gameId ? { ...x, homeScore: undefined, awayScore: undefined, winnerId: undefined, isTie: false } : x);
            setGames(deselectGames);
            setPlayers(prev => recalculateStats(deselectGames, prev));
            return;
        }

        const updatedGame = { ...gameToUpdate, homeScore: finalHomeScore, awayScore: finalAwayScore, winnerId: finalWinnerId, isTie };
        const newGames = games.map(x => x.id === gameId ? updatedGame : x);

        // 2. Update Games and Deterministically Replay all Stats
        setGames(newGames);
        setPlayers(prev => recalculateStats(newGames, prev));
      },
      setPlayers,
      setGames,
      setPlayoffGames,
      syncPlayoffGames: async (bracket) => {
        setPlayoffGames(bracket);
        if (user) await PersistenceEngine.savePlayoffGames(bracket);
      },
      setHistory
    }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}
