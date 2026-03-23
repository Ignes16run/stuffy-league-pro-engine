"use client";
// Last Updated: 2026-03-22T20:25:00-04:00

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
import { selectNarrativeTemplate, generateNarrative, NARRATIVE_BANK } from '@/lib/league/narratives';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { getStatForAward, getAwardFinalists } from '@/lib/league/awardsEngine';
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
  numWeeks: number;
  setNumWeeks: (weeks: number) => void;
  isSimulating: boolean;
  addTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  updatePlayer: (playerId: string, updates: Partial<Player>) => Promise<void>;
  bulkUpdatePlayers: (playerUpdates: { id: string, updates: Partial<Player> }[]) => Promise<void>;
  upgradeStat: (teamId: string, statId: string) => Promise<void>;
  addDefaultTeams: () => Promise<{ nextTeams: Team[]; nextPlayers: Player[]; nextGames: Game[]; }>;
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
  isLoaded: boolean;
  // Awards System
  isAwardsPhase: boolean;
  awardFinalists: Record<string, Player[]>;
  setAwardWinner: (category: string, playerId: string) => void;
  selectedAwards: Record<string, string>;
  awardResults: Record<string, any>;
  completeSeason: (championId: string) => void;
  finalizeSeason: () => void;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [playoffGames, setPlayoffGames] = useState<PlayoffGame[]>([]);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [numWeeks, setNumWeeks] = useState(14);
  const [isSimulating, setIsSimulating] = useState(false);
  const [history, setHistory] = useState<SeasonHistory[]>([]);
  const [activeTab, setActiveTab] = useState('season');
  const [recentNarrativesUsed, setRecentNarrativesUsed] = useState<NarrativeMemoryEntry[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Awards State
  const [isAwardsPhase, setIsAwardsPhase] = useState(false);
  const [awardFinalists, setAwardFinalists] = useState<Record<string, Player[]>>({});
  const [selectedAwards, setSelectedAwards] = useState<Record<string, string>>({});
  const [awardResults, setAwardResults] = useState<Record<string, any>>({});

  // --- STAT RECALCULATION ENGINE ---
  const recalculateStats = useCallback((allGames: Game[], allPlayers: Player[]) => {
    let playersPool = allPlayers.map(p => ({
      ...p,
      stats: { gamesPlayed: 0 } as PlayerStats
    }));
    const completedGames = allGames
      .filter(g => (g.homeScore !== undefined && g.awayScore !== undefined))
      .sort((a, b) => a.week - b.week || a.id.localeCompare(b.id));

    completedGames.forEach(game => {
      const homeScore = game.homeScore || 0;
      const awayScore = game.awayScore || 0;
      const random = createSeededRandom(game.id);
      playersPool = assignStatsToPlayers(playersPool, game.homeTeamId, homeScore, awayScore, random);
      playersPool = assignStatsToPlayers(playersPool, game.awayTeamId, awayScore, homeScore, random);
    });
    return playersPool;
  }, []);

  // Sync effect
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
            setNumWeeks(data.numWeeks || (data.teams?.length > 0 ? data.teams.length - 1 : 14));
            setHistory(data.history || []);
            setIsAwardsPhase(data.isAwardsPhase || false);
            setAwardFinalists(data.awardFinalists || {});
            setSelectedAwards(data.selectedAwards || {});
            setAwardResults(data.awardResults || {});
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
      const data = { 
        teams, players, games, playoffGames, currentWeek, numWeeks, history,
        isAwardsPhase, awardFinalists, selectedAwards, awardResults 
      };
      localStorage.setItem('stuffy_league_data', JSON.stringify(data));
    }
  }, [teams, players, games, playoffGames, currentWeek, numWeeks, history, isInitializing, isAwardsPhase, awardFinalists, selectedAwards, awardResults]);

  const addTeam = async (team: Omit<Team, 'id'>) => {
    const newTeam = { ...team, id: generateUUID() };
    const newRoster = generateTeamRoster(newTeam.id);
    
    setTeams(prev => [...prev, newTeam]);
    setPlayers(prev => [...prev, ...newRoster]);
    
    if (user) {
      await PersistenceEngine.saveTeams([newTeam], user.id);
      await PersistenceEngine.savePlayers(newRoster, user.id);
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    const newTeams = teams.map(t => t.id === teamId ? { ...t, ...updates } : t);
    setTeams(newTeams);
    const team = newTeams.find(t => t.id === teamId);
    if (user && team) await PersistenceEngine.saveTeams([team], user.id);
  };

  const deleteTeam = async (teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setPlayers(prev => prev.filter(p => p.teamId !== teamId));
    if (user) await PersistenceEngine.deleteTeam(teamId, user.id);
  };

  const addDefaultTeams = async () => {
    const nextTeams: Team[] = [];
    const nextPlayers: Player[] = [];

    for (const teamDef of DEFAULT_LEAGUE_TEAMS) {
        const newTeam = { ...teamDef, id: generateUUID() };
        const newRoster = generateTeamRoster(newTeam.id);
        nextTeams.push(newTeam as Team);
        nextPlayers.push(...newRoster);
    }

    setTeams(prev => [...prev, ...nextTeams]);
    setPlayers(prev => [...prev, ...nextPlayers]);

    // AUTO-GENERATE SCHEDULE AFTER INITIALIZING TEAMS
    const newGames = generateRoundRobinSchedule(nextTeams, numWeeks);
    setGames(newGames);

    if (user) {
        await PersistenceEngine.saveTeams(nextTeams, user.id);
        await PersistenceEngine.savePlayers(nextPlayers, user.id);
        await PersistenceEngine.saveGames(newGames, user.id);
    }
    return { nextTeams, nextPlayers, nextGames: newGames };
  };

  const updatePlayer = async (playerId: string, updates: Partial<Player>) => {
    const newPlayers = players.map(p => p.id === playerId ? { ...p, ...updates } : p);
    setPlayers(newPlayers);
    if (user) {
        const player = newPlayers.find(p => p.id === playerId);
        if (player) await PersistenceEngine.savePlayers([player], user.id);
    }
  };

  const bulkUpdatePlayers = async (playerUpdates: { id: string, updates: Partial<Player> }[]) => {
    const nextPlayers = [...players];
    const affected: Player[] = [];
    playerUpdates.forEach(({ id, updates }) => {
      const idx = nextPlayers.findIndex(p => p.id === id);
      if (idx !== -1) {
        nextPlayers[idx] = { ...nextPlayers[idx], ...updates };
        affected.push(nextPlayers[idx]);
      }
    });
    setPlayers(nextPlayers);
    if (user) await PersistenceEngine.savePlayers(affected, user.id);
  };

  const upgradeStat = async (teamId: string, statId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || (team.stuffyPoints || 0) < 50) return;
    const val = (team as any)[statId] || 75;
    if (val >= 99) return;
    const updates = { [statId]: val + 1, stuffyPoints: (team.stuffyPoints || 0) - 50 };
    await updateTeam(teamId, updates);
  };

  const resetLeague = async () => {
    setTeams([]);
    setPlayers([]);
    setGames([]);
    setPlayoffGames([]);
    setCurrentWeek(1);
    setHistory([]);
    setIsAwardsPhase(false);
    setAwardFinalists({});
    setSelectedAwards({});
    setAwardResults({});
    localStorage.removeItem('stuffy_league_data');
    if (user) await PersistenceEngine.clearAll(user.id);
  };

  const createLeague = async (name: string) => {
    await resetLeague();
    const { nextTeams } = await addDefaultTeams();
    const newGames = generateRoundRobinSchedule(nextTeams, numWeeks);
    setGames(newGames);
    if (user) await PersistenceEngine.saveGames(newGames, user.id);
  };

  const saveToSupabase = async () => {
    if (!user) return;
    await PersistenceEngine.saveTeams(teams, user.id);
    await PersistenceEngine.savePlayers(players, user.id);
    await PersistenceEngine.saveGames(games, user.id);
    await PersistenceEngine.savePlayoffGames(playoffGames, user.id);
  };

  const loadFromSupabase = async () => {
    if (!user) return;
    const data = await PersistenceEngine.loadAllData(user.id);
    setTeams(data.teams);
    setPlayers(data.players);
    setGames(data.games);
    setPlayoffGames(data.playoffGames);
    setHistory(data.history);
  };

  const advanceWeek = () => {
    if (currentWeek < numWeeks) {
      setCurrentWeek(prev => prev + 1);
    } else {
      const finalists = getAwardFinalists(players);
      setAwardFinalists(finalists as Record<string, Player[]>);
      setIsAwardsPhase(true);
    }
  };

  const simulateGames = (week: number) => {
    const updatedGames = [...games];
    games.filter(g => g.week === week).forEach(game => {
      const homeTeam = teams.find(t => t.id === game.homeTeamId);
      const awayTeam = teams.find(t => t.id === game.awayTeamId);
      if (homeTeam && awayTeam) {
        const score = generateRealisticFootballScore(homeTeam, awayTeam, players);
        const gameIndex = updatedGames.findIndex(g => g.id === game.id);
        const isTie = score.homeScore === score.awayScore;
        updatedGames[gameIndex] = {
          ...game, homeScore: score.homeScore, awayScore: score.awayScore,
          winnerId: isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId),
          isTie
        };
      }
    });
    setGames(updatedGames);
    setPlayers(prev => recalculateStats(updatedGames, prev));
  };

  const simulateSeason = () => {
    setIsSimulating(true);
    let updatedGames = [...games];
    for (let w = 1; w <= numWeeks; w++) {
      updatedGames.filter(g => g.week === w).forEach(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeamId);
        const awayTeam = teams.find(t => t.id === game.awayTeamId);
        if (homeTeam && awayTeam) {
          const score = generateRealisticFootballScore(homeTeam, awayTeam, players);
          const gameIndex = updatedGames.findIndex(g => g.id === game.id);
          const isTie = score.homeScore === score.awayScore;
          updatedGames[gameIndex] = {
            ...game, homeScore: score.homeScore, awayScore: score.awayScore,
            winnerId: isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId),
            isTie
          };
        }
      });
    }
    setGames(updatedGames);
    const finalPlayers = recalculateStats(updatedGames, players);
    setPlayers(finalPlayers);
    setCurrentWeek(numWeeks);
    const finalists = getAwardFinalists(finalPlayers);
    setAwardFinalists(finalists as Record<string, Player[]>);
    setIsAwardsPhase(true);
    setIsSimulating(false);
  };

  const resetPredictions = () => {
    const resetGames = games.map(g => ({
      ...g, homeScore: undefined, awayScore: undefined, winnerId: undefined, isTie: undefined
    }));
    setGames(resetGames);
    setPlayers(prev => prev.map(p => ({ ...p, stats: { gamesPlayed: 0 } as PlayerStats })));
    setIsAwardsPhase(false);
    setAwardFinalists({});
    setSelectedAwards({});
    setAwardResults({});
  };

  const setAwardWinner = (category: string, playerId: string) => {
    const winner = players.find(p => p.id === playerId);
    if (!winner) return;
    setSelectedAwards(prev => ({ ...prev, [category]: playerId }));
    const team = teams.find(t => t.id === winner.teamId);
    const awardType = category as AwardType;
    const statValue = getStatForAward(winner, awardType);
    const statName = awardType === 'STPOY' ? 'Points' : (awardType === 'DPOY' ? 'Tackles/Sacks' : 'All-Purpose');
    const template = selectNarrativeTemplate(awardType, winner.position, winner.awardsHistory || [], recentNarrativesUsed, (history.length + 1).toString()) || NARRATIVE_BANK[0];
    const narrative = generateNarrative(winner, awardType, team?.name || 'his team', statValue, statName, template);
    setRecentNarrativesUsed(prev => [...prev, { templateId: template.id, seasonId: (history.length + 1).toString() }]);
    setAwardResults(prev => ({ ...prev, [category]: { winner, statName, statValue, narrative } }));
  };

  const completeSeason = (championId: string) => {
    const standings = calculateStandings(teams, games);
    const newHistory: SeasonHistory = {
      year: new Date().getFullYear() + history.length,
      championId,
      finalStandings: standings
    };
    setHistory(prev => [newHistory, ...prev]);
    if (!isAwardsPhase) {
      const finalists = getAwardFinalists(players);
      setAwardFinalists(finalists as Record<string, Player[]>);
      setIsAwardsPhase(true);
    }
  };

  const finalizeSeason = () => {
    setIsAwardsPhase(false);
  };

  return (
    <LeagueContext.Provider value={{
      teams, players, games, playoffGames, history, activeTab, setActiveTab,
      currentWeek, numWeeks, setNumWeeks, isSimulating,
      addTeam, updateTeam, deleteTeam, updatePlayer, bulkUpdatePlayers, upgradeStat, addDefaultTeams,
      createLeague, setCurrentWeek, 
      advanceWeek, simulateGames, resetLeague, saveToSupabase, loadFromSupabase,
      simulateSeason, resetPredictions, 
      handlePick: (gameId, winnerId) => {
        if (gameId.includes('round-')) {
            const ug = playoffGames.map(g => g.id === gameId ? { ...g, winnerId: (winnerId === 'tie' ? undefined : (winnerId || undefined)) } : g);
            setPlayoffGames(ug); return;
        }
        const gameToUpdate = games.find(g => g.id === gameId);
        if (!gameToUpdate) return;
        const homeTeam = teams.find(t => t.id === gameToUpdate.homeTeamId);
        const awayTeam = teams.find(t => t.id === gameToUpdate.awayTeamId);
        let hScore = 0, aScore = 0;
        if (winnerId === 'tie') {
            hScore = 20 + Math.floor(Math.random() * 10); aScore = hScore;
        } else if (winnerId) {
            const isHome = winnerId === gameToUpdate.homeTeamId;
            const score = generateRealisticFootballScore(isHome ? homeTeam! : awayTeam!, isHome ? awayTeam! : homeTeam!, players);
            hScore = isHome ? Math.max(score.homeScore, score.awayScore + 3) : Math.min(score.homeScore, score.awayScore - 3);
            aScore = isHome ? Math.min(score.awayScore, score.homeScore - 3) : Math.max(score.awayScore, score.homeScore + 3);
        } else {
            const dg = games.map(x => x.id === gameId ? { ...x, homeScore: undefined, awayScore: undefined, winnerId: undefined, isTie: false } : x);
            setGames(dg); setPlayers(prev => recalculateStats(dg, prev));
            return;
        }
        const ug = { ...gameToUpdate, homeScore: hScore, awayScore: aScore, winnerId: winnerId === 'tie' ? undefined : winnerId, isTie: winnerId === 'tie' };
        const ng = games.map(x => x.id === gameId ? ug : x);
        setGames(ng); setPlayers(prev => recalculateStats(ng, prev));
      },
      setPlayers, setGames, setPlayoffGames,
      syncPlayoffGames: async (bracket) => {
        setPlayoffGames(bracket);
        if (user) await PersistenceEngine.savePlayoffGames(bracket, user.id);
      },
      setHistory,
      isLoaded: !isInitializing,
      isAwardsPhase, awardFinalists, setAwardWinner, selectedAwards, awardResults, 
      completeSeason, finalizeSeason
    }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
