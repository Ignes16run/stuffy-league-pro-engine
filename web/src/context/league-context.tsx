"use client";
// Last Updated: 2026-03-22T22:20:00Z

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Team, Game, PlayoffGame, SeasonHistory, Player, PlayerStats,
  PlayerAward, NarrativeMemoryEntry, AwardsHistoryEntry,
  PlayerPosition, PlayerAbility, AwardType
} from '@/lib/league/types';
import { generateRoundRobinSchedule, calculateStandings, generateRealisticFootballScore, generateUUID } from '@/lib/league/utils';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from '@/context/auth-context';
import { generateTeamRoster, migratePlayerRatings } from '@/lib/league/players';
import { selectNarrativeTemplate, generateNarrative } from '@/lib/league/narratives';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { getStatForAward } from '@/lib/league/awardsEngine';
import { PersistenceEngine } from '@/lib/league/persistenceEngine';
import { SimulationEngine } from '@/lib/league/simulationEngine';



interface LeagueContextType {
  teams: Team[];
  players: Player[];
  games: Game[];
  playoffGames: PlayoffGame[];
  history: SeasonHistory[];
  activeTab: string;
  isSimulating: boolean;
  isLoaded: boolean;
  numWeeks: number;
  isAwardsPhase: boolean;
  awardFinalists: Record<string, Player[]>;
  selectedAwards: Record<string, string>;
  awardResults: Record<string, { winner: Player, narrative: string, statValue: string | number, statName: string }>;
  recentNarrativesUsed: NarrativeMemoryEntry[];
  setActiveTab: (tab: string) => void;
  setNumWeeks: (weeks: number) => void;
  setAwardWinner: (category: string, playerId: string) => void;
  addTeam: (team: Omit<Team, 'id'>) => Promise<void>;
  addDefaultTeams: () => Promise<void>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  resetLeague: () => Promise<void>;
  simulateSeason: () => Promise<void>;
  resetPredictions: () => Promise<void>;
  handlePick: (gameId: string, winnerId: string | 'tie') => void;
  setPlayoffGames: React.Dispatch<React.SetStateAction<PlayoffGame[]>>;
  syncPlayoffGames: (bracket: PlayoffGame[]) => Promise<void>;
  completeSeason: (champId: string) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  bulkUpdatePlayers: (updates: { id: string, updates: Partial<Player> }[]) => Promise<void>;
  finalizeSeason: () => void;
  upgradeStat: (teamId: string, statKey: string) => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('season');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [playoffGames, setPlayoffGames] = useState<PlayoffGame[]>([]);
  const [history, setHistory] = useState<SeasonHistory[]>([]);
  const [recentNarrativesUsed, setRecentNarrativesUsed] = useState<NarrativeMemoryEntry[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [numWeeks, setNumWeeks] = useState(15);
  const [isAwardsPhase, setIsAwardsPhase] = useState(false);
  const [awardFinalists, setAwardFinalists] = useState<Record<string, Player[]>>({});
  const [selectedAwards, setSelectedAwards] = useState<Record<string, string>>({});
  const [awardResults, setAwardResults] = useState<Record<string, { winner: Player, narrative: string, statValue: string | number, statName: string }>>({});
  
  const loadedUserIdRef = useRef<string | null | undefined>(undefined);
  const isInitialLoadRef = useRef(true);

  const loadData = useCallback(async () => {
    const currentUserId = user?.id || null;
    if (loadedUserIdRef.current === currentUserId && !isInitialLoadRef.current) return;
    
    try {
      const data = await PersistenceEngine.loadAllData(user?.id);
      
      setTeams(data.teams);
      setPlayers(data.players);
      setGames(data.games);
      setPlayoffGames(data.playoffGames);
      setHistory(data.history);
      setIsAwardsPhase(data.isAwardsPhase);
      setSelectedAwards(data.selectedAwards);
      setAwardResults(data.awardResults);
      setAwardFinalists(data.awardFinalists);
      
      setIsLoaded(true);
      loadedUserIdRef.current = user?.id || null;
      isInitialLoadRef.current = false;
    } catch (e) {
      console.error("League data loading error:", e);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [user, loadData]);

  const updatePlayer = useCallback((id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    if (user) {
      const dbUpdates: any = {};
      Object.entries(updates).forEach(([key, val]) => {
         const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
         dbUpdates[dbKey] = val;
      });
      supabase.from('players').update(dbUpdates).eq('id', id).then();
    }
  }, [user]);

  const bulkUpdatePlayers = useCallback(async (playerUpdates: { id: string, updates: Partial<Player> }[]) => {
    setPlayers(prev => {
      const newPlayers = [...prev];
      playerUpdates.forEach(({ id, updates }) => {
        const idx = newPlayers.findIndex(p => p.id === id);
        if (idx !== -1) newPlayers[idx] = { ...newPlayers[idx], ...updates };
      });
      return newPlayers;
    });

    if (user) {
      // For Supabase, we do separate updates in parallel for simplicity unless we want to risk complex RPC
      await Promise.all(playerUpdates.map(({ id, updates }) => {
        const dbUpdates: any = {};
        Object.entries(updates).forEach(([key, val]) => {
          const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          dbUpdates[dbKey] = val;
        });
        return supabase.from('players').update(dbUpdates).eq('id', id);
      }));
    }
  }, [user]);

  const setAwardWinner = (category: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const newSelected = { ...selectedAwards, [category]: playerId };
    setSelectedAwards(newSelected);
    if (!user) localStorage.setItem('stuffy_selected_awards', JSON.stringify(newSelected));

    const seasonId = (history.length + 1).toString();
    const type = category as AwardType;
    const historyEntries = player.awardsHistory || [];

    const template = selectNarrativeTemplate(
      type, player.position, historyEntries, recentNarrativesUsed, seasonId
    );

    if (template) {
      const team = teams.find(t => t.id === player.teamId);
      const statName = type === 'MVP' ? 'Passing Yards' : type === 'DPOY' ? 'Tackles' : type === 'STPOY' ? 'Points' : 'Total Yards';
      const statValue = getStatForAward(player, type);
      const val = parseInt(statValue.match(/\d+/)?.[0] || "0");
      
      const narrative = generateNarrative(
        player, type, team?.name || 'his team', val, statName, template
      );

      setAwardResults(prev => {
        const updated = {
          ...prev,
          [category]: { winner: player, narrative, statValue: val, statName, templateId: template.id }
        };
        if (!user) localStorage.setItem('stuffy_award_results', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const simulateSeason = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    const { updatedPlayers, updatedGames } = await SimulationEngine.simulateSeason(games, teams, players);
    
    setGames(prev => prev.map(g => updatedGames.find(ug => ug.id === g.id) || g));
    setPlayers(updatedPlayers);

    await PersistenceEngine.saveGames(updatedGames, user?.id);
    await PersistenceEngine.savePlayers(updatedPlayers, user?.id);

    setIsSimulating(false);
  };

  const resetPredictions = async () => {
    const { resetPlayers, resetGames } = SimulationEngine.resetSeason(games, players);
    setGames(resetGames);
    setPlayers(resetPlayers);
    setPlayoffGames([]);
    
    await PersistenceEngine.saveGames(resetGames, user?.id);
    await PersistenceEngine.savePlayers(resetPlayers, user?.id);
    
    if (user) {
      await supabase.from('playoff_games').delete().eq('user_id', user.id);
    }
  };

  const finalizeSeason = async () => {
    const currentYear = history.length + 1;
    const { finalPlayers } = SimulationEngine.finalizeSeason(players, awardResults, currentYear);
    
    setPlayers(finalPlayers);
    setAwardResults({});
    setSelectedAwards({});
    setIsAwardsPhase(false);
    setActiveTab('history');

    await PersistenceEngine.savePlayers(finalPlayers, user?.id);
    await PersistenceEngine.saveAwardPhase(false, user?.id);
  };

  const completeSeason = async (champId: string) => {
    const champ = teams.find(t => t.id === champId);
    if (!champ) return;
    const year = history.length + 1;
    const standings = calculateStandings(teams, games);
    const newHistory = { year, championId: champId, finalStandings: standings };
    
    setHistory(prev => [newHistory, ...prev]);
    const finalists = SimulationEngine.getAwardFinalists(players);
    setAwardFinalists(finalists);
    setIsAwardsPhase(true);

    await PersistenceEngine.saveLeagueHistory(newHistory, user?.id);
    await PersistenceEngine.saveAwardPhase(true, user?.id);
    if (!user) localStorage.setItem('stuffy_award_finalists', JSON.stringify(finalists));
  };

  const addTeam = useCallback(async (t: Omit<Team, 'id'>) => {
    const teamId = generateUUID();
    const newTeam = { ...t, id: teamId } as Team;
    const roster = generateTeamRoster(teamId);

    setTeams(prev => {
      const updated = [...prev, newTeam];
      if (updated.length >= 2) {
         const schedule = generateRoundRobinSchedule(updated, numWeeks);
         setGames(schedule);
         PersistenceEngine.saveGames(schedule, user?.id);
      }
      return updated;
    });

    setPlayers(prev => [...prev, ...roster]);
    await PersistenceEngine.saveTeam(newTeam, user?.id);
    await PersistenceEngine.savePlayers(roster, user?.id);
  }, [user, numWeeks]);

  const contextValue: LeagueContextType = {
    teams, players, games, playoffGames, history, activeTab, isSimulating, isLoaded, numWeeks,
    isAwardsPhase, awardFinalists, selectedAwards, awardResults, recentNarrativesUsed,
    setActiveTab, setNumWeeks, setAwardWinner, updatePlayer, bulkUpdatePlayers, completeSeason, finalizeSeason,
    addTeam,
    addDefaultTeams: async () => {
        for (const team of DEFAULT_LEAGUE_TEAMS) {
            await addTeam(team);
        }
    },
    updateTeam: async (id, updates) => {
       setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
       if (user) await supabase.from('teams').update(updates).eq('id', id);
    },
    deleteTeam: async (id) => {
       setTeams(prev => prev.filter(t => t.id !== id));
       await PersistenceEngine.deleteTeam(id, user?.id);
    },
    resetLeague: async () => {
       setTeams([]); setPlayers([]); setGames([]); setPlayoffGames([]); setHistory([]);
       await PersistenceEngine.clearAll(user?.id);
    },
    simulateSeason,
    resetPredictions,
    handlePick: (gameId, winnerId) => {
      setGames(g => g.map(game => game.id === gameId ? { ...game, winnerId: winnerId === 'tie' ? undefined : winnerId, isTie: winnerId === 'tie' } : game));
    },
    setPlayoffGames,
    syncPlayoffGames: async (bracket) => {
       if (!user) return;
       await supabase.from('playoff_games').delete().eq('user_id', user.id);
       await supabase.from('playoff_games').insert(bracket.map((g: any) => ({
          id: g.id, user_id: user.id, round: g.round, matchup_index: g.matchupIndex,
          team1_id: g.team1Id, team2_id: g.team2Id, winner_id: g.winnerId, seed1: g.seed1, seed2: g.seed2
       })));
    },
    upgradeStat: async (teamId: string, statKey: string) => {
       const team = teams.find(t => t.id === teamId);
       if (!team || (team.stuffyPoints || 0) < 50) return;
       const currentVal = (team as Record<string, any>)[statKey] || 75;
       const newVal = Math.min(99, (currentVal as number) + 1);
       const updates = { [statKey]: newVal, stuffyPoints: (team.stuffyPoints || 0) - 50 };
       setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...updates } : t));
       if (user) {
          const dbUpdates: Record<string, any> = {};
          Object.entries(updates).forEach(([k, v]) => { dbUpdates[k.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`)] = v; });
          await supabase.from('teams').update(dbUpdates).eq('id', teamId);
       }
    }
  };

  return <LeagueContext.Provider value={contextValue}>{children}</LeagueContext.Provider>;
}

export const useLeague = () => {
  const context = useContext(LeagueContext);
  if (!context) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
