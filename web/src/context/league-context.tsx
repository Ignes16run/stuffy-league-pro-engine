"use client";
// Last Updated: 2026-03-22T22:30:00-04:00

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Team, Game, PlayoffGame, SeasonHistory, Player, PlayerStats,
  NarrativeMemoryEntry, AwardType
} from '@/lib/league/types';
import { 
  generateRoundRobinSchedule, 
  calculateStandings, 
  generateRealisticFootballScore, 
  generateUUID,
  createSeededRandom 
} from '@/lib/league/utils';
import { useAuth } from '@/context/auth-context';
import { generateTeamRoster } from '@/lib/league/players';
import { selectNarrativeTemplate, generateNarrative, NARRATIVE_BANK } from '@/lib/league/narratives';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { getStatForAward, getAwardFinalists } from '@/lib/league/awardsEngine';
import { PersistenceEngine } from '@/lib/league/persistenceEngine';
import { assignStatsToPlayers } from '@/lib/league/statsEngine';
import { SimulationEngine } from '@/lib/league/simulationEngine';

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
  createLeague: () => Promise<void>;
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
  awardResults: Record<string, { winner: Player; statName: string; statValue: number | string; narrative: string }>;
  completeSeason: (championId: string) => void;
  finalizeSeason: () => void;
  setIsAwardsPhase: (active: boolean) => void;
  simulateAwards: () => void;
  calculateAwards: () => Record<AwardType, string>;
  generatePlayoffs: () => void;
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
  const [awardResults, setAwardResults] = useState<Record<string, { winner: Player; statName: string; statValue: number | string; narrative: string }>>({});

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

  const syncPlayoffGames = useCallback(async (bracket: PlayoffGame[]) => {
    setPlayoffGames(bracket);
    if (user) await PersistenceEngine.savePlayoffGames(bracket, user.id);
  }, [user]);

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
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const updated = { ...team, ...updates };
    setTeams(prev => prev.map(t => t.id === teamId ? updated : t));
    if (user) await PersistenceEngine.saveTeams([updated], user.id);
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
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const updated = { ...player, ...updates };
    setPlayers(prev => prev.map(p => p.id === playerId ? updated : p));
    if (user) await PersistenceEngine.savePlayers([updated], user.id);
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
    const val = (team[statId as keyof Team] as number) || 75;
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

  const createLeague = async () => {
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
    }
  };

  const simulateGames = (week: number) => {
    const updatedGames = [...games];
    const pointsMap = new Map<string, number>();

    games.filter(g => g.week === week && g.winnerId === undefined && !g.isTie).forEach(game => {
      const homeTeam = teams.find(t => t.id === game.homeTeamId);
      const awayTeam = teams.find(t => t.id === game.awayTeamId);
      if (homeTeam && awayTeam) {
        const score = generateRealisticFootballScore(homeTeam, awayTeam, players);
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
  };

  const simulateSeason = async () => {
    setIsSimulating(true);
    const updatedGames = [...games];
    const pointsMap = new Map<string, number>();

    for (let w = 1; w <= numWeeks; w++) {
      updatedGames.filter(g => g.week === w && g.winnerId === undefined && !g.isTie).forEach(game => {
        const homeTeam = teams.find(t => t.id === game.homeTeamId);
        const awayTeam = teams.find(t => t.id === game.awayTeamId);
        if (homeTeam && awayTeam) {
          const score = generateRealisticFootballScore(homeTeam, awayTeam, players);
          const gameIndex = updatedGames.findIndex(g => g.id === game.id);
          const isTie = score.homeScore === score.awayScore;
          const winnerId = isTie ? undefined : (score.homeScore > score.awayScore ? game.homeTeamId : game.awayTeamId);

          updatedGames[gameIndex] = {
            ...game, homeScore: score.homeScore, awayScore: score.awayScore,
            winnerId,
            isTie
          };

          // Award SP (Catch-up Mechanic: Loser gets more SP)
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
    setPlayers(prev => recalculateStats(updatedGames, prev));
    setCurrentWeek(numWeeks);
    setIsSimulating(false);
    
    // Automatically Seed Playoffs if regular season is done (e.g. at least 17 weeks)
    if (numWeeks >= 10 && updatedGames.every(g => g.winnerId)) {
        console.log("Season finished - Seeding Playoffs...");
        const standings = calculateStandings(teams, updatedGames);
        const top8 = standings.slice(0, 8);
        
        // Quarter Finals (Round 1) - 1v8, 4v5, 2v7, 3v6
        const newPlayoffGames: PlayoffGame[] = [
            { id: 'q1', round: 1, matchupIndex: 0, team1Id: top8[0].teamId, seed1: 1, team2Id: top8[7].teamId, seed2: 8 },
            { id: 'q2', round: 1, matchupIndex: 1, team1Id: top8[3].teamId, seed1: 4, team2Id: top8[4].teamId, seed2: 5 },
            { id: 'q3', round: 1, matchupIndex: 2, team1Id: top8[1].teamId, seed1: 2, team2Id: top8[6].teamId, seed2: 7 },
            { id: 'q4', round: 1, matchupIndex: 3, team1Id: top8[2].teamId, seed1: 3, team2Id: top8[5].teamId, seed2: 6 },
            
            // Semis (Round 2)
            { id: 's1', round: 2, matchupIndex: 0 },
            { id: 's2', round: 2, matchupIndex: 1 },
            
            // Finals (Round 3)
            { id: 'f1', round: 3, matchupIndex: 0 }
        ];
        
        setPlayoffGames(newPlayoffGames);
        await syncPlayoffGames(newPlayoffGames);
    }
  };

  const generatePlayoffs = useCallback(() => {
    const standings = calculateStandings(teams, games);
    const top8 = standings.slice(0, 8);
    const newPlayoffGames: PlayoffGame[] = [
      { id: 'q1', round: 1, matchupIndex: 0, team1Id: top8[0].teamId, seed1: 1, team2Id: top8[7].teamId, seed2: 8 },
      { id: 'q2', round: 1, matchupIndex: 1, team1Id: top8[3].teamId, seed1: 4, team2Id: top8[4].teamId, seed2: 5 },
      { id: 'q3', round: 1, matchupIndex: 2, team1Id: top8[1].teamId, seed1: 2, team2Id: top8[6].teamId, seed2: 7 },
      { id: 'q4', round: 1, matchupIndex: 3, team1Id: top8[2].teamId, seed1: 3, team2Id: top8[5].teamId, seed2: 6 },
      { id: 's1', round: 2, matchupIndex: 0 },
      { id: 's2', round: 2, matchupIndex: 1 },
      { id: 'f1', round: 3, matchupIndex: 0 }
    ];
    setPlayoffGames(newPlayoffGames);
    syncPlayoffGames(newPlayoffGames);
  }, [teams, games, syncPlayoffGames]);

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
  
  const simulateAwards = () => {
    Object.entries(awardFinalists).forEach(([category, finalists]) => {
      if (finalists.length > 0) {
        setAwardWinner(category, finalists[0].id);
      }
    });
  };

  const completeSeason = (championId: string) => {
    // 1. Calculate Standings for the History entry
    const standings = calculateStandings(teams, games);
    
    // 2. Update Team All-Time Stats
    const updatedTeams = teams.map(t => {
      const teamStanding = standings.find(s => s.teamId === t.id);
      return {
        ...t,
        allTimeWins: (t.allTimeWins || 0) + (teamStanding?.wins || 0),
        championships: (t.championships || 0) + (t.id === championId ? 1 : 0)
      };
    });
    setTeams(updatedTeams);

    // 3. Create History Entry (Uses 2026, 2027...)
    const seasonYear = 2026 + history.length;
    const newHistory: SeasonHistory = {
      year: seasonYear,
      championId,
      finalStandings: standings
    };
    
    setHistory(prev => [newHistory, ...prev]);
    
    // 4. Trigger Awards Phase
    if (!isAwardsPhase) {
      const finalists = getAwardFinalists(players);
      setAwardFinalists(finalists as Record<string, Player[]>);
      setIsAwardsPhase(true);
    }
  };

  const finalizeSeason = () => {
    // 1. Migrate season stats to career and reset season stats
    // Awards apply to the season that just finished (entry in history at [0])
    const finishedYearNum = history[0]?.year || (2026 + history.length - 1);
    const { finalPlayers } = SimulationEngine.finalizeSeason(players, awardResults, finishedYearNum);
    
    // 2. Full State Reset for Season (N+1)
    setPlayers(finalPlayers);
    setPlayoffGames([]);
    setCurrentWeek(1);
    
    // 3. Auto-Generate New Schedule
    if (teams.length > 1) {
      const newGames = generateRoundRobinSchedule(teams, numWeeks);
      setGames(newGames);
    }
    
    // 4. Reset Award States
    setAwardFinalists({});
    setSelectedAwards({});
    setAwardResults({});
    setIsAwardsPhase(false);
    
    // 5. Persistence Hint
    console.log(`Season ending ${finishedYearNum} finalized. Next season will be ${finishedYearNum + 1}.`);
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
        // Playoff Game Progression
        if (gameId.startsWith('q') || gameId.startsWith('s') || gameId.startsWith('f')) {
          const finalWinnerId = winnerId === 'tie' ? undefined : (winnerId || undefined);
          const currentGames = [...playoffGames];
          const gameIndex = currentGames.findIndex(g => g.id === gameId);
          if (gameIndex === -1) return;

          currentGames[gameIndex] = { ...currentGames[gameIndex], winnerId: finalWinnerId };

          // Advance winner to next round
          if (finalWinnerId) {
            if (gameId === 'q1') { const i = currentGames.findIndex(g => g.id === 's1'); if (i !== -1) currentGames[i].team1Id = finalWinnerId; }
            if (gameId === 'q2') { const i = currentGames.findIndex(g => g.id === 's1'); if (i !== -1) currentGames[i].team2Id = finalWinnerId; }
            if (gameId === 'q3') { const i = currentGames.findIndex(g => g.id === 's2'); if (i !== -1) currentGames[i].team1Id = finalWinnerId; }
            if (gameId === 'q4') { const i = currentGames.findIndex(g => g.id === 's2'); if (i !== -1) currentGames[i].team2Id = finalWinnerId; }
            if (gameId === 's1') { const i = currentGames.findIndex(g => g.id === 'f1'); if (i !== -1) currentGames[i].team1Id = finalWinnerId; }
            if (gameId === 's2') { const i = currentGames.findIndex(g => g.id === 'f1'); if (i !== -1) currentGames[i].team2Id = finalWinnerId; }
          } else {
            // If winner removed, remove from next round too
            if (gameId === 'q1') { const i = currentGames.findIndex(g => g.id === 's1'); if (i !== -1) { currentGames[i].team1Id = undefined; currentGames[i].winnerId = undefined; } }
            if (gameId === 'q2') { const i = currentGames.findIndex(g => g.id === 's1'); if (i !== -1) { currentGames[i].team2Id = undefined; currentGames[i].winnerId = undefined; } }
            if (gameId === 'q3') { const i = currentGames.findIndex(g => g.id === 's2'); if (i !== -1) { currentGames[i].team1Id = undefined; currentGames[i].winnerId = undefined; } }
            if (gameId === 'q4') { const i = currentGames.findIndex(g => g.id === 's2'); if (i !== -1) { currentGames[i].team2Id = undefined; currentGames[i].winnerId = undefined; } }
            if (gameId === 's1') { const i = currentGames.findIndex(g => g.id === 'f1'); if (i !== -1) { currentGames[i].team1Id = undefined; currentGames[i].winnerId = undefined; } }
            if (gameId === 's2') { const i = currentGames.findIndex(g => g.id === 'f1'); if (i !== -1) { currentGames[i].team2Id = undefined; currentGames[i].winnerId = undefined; } }
          }

          setPlayoffGames(currentGames);
          syncPlayoffGames(currentGames);
          return;
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
        // Award SP if game was unplayed (Catch-up Mechanic: Loser gets more SP)
        if (gameToUpdate.winnerId === undefined && !gameToUpdate.isTie) {
          setTeams(prev => prev.map(t => {
            if (t.id === gameToUpdate.homeTeamId || t.id === gameToUpdate.awayTeamId) {
              let spToAdd = 10; // Win default
              if (winnerId === 'tie') spToAdd = 25;
              else if (winnerId !== t.id) spToAdd = 50; // Lose = 50 SP
              return { ...t, stuffyPoints: (t.stuffyPoints || 0) + spToAdd };
            }
            return t;
          }));
        }

        const ug = { ...gameToUpdate, homeScore: hScore, awayScore: aScore, winnerId: winnerId === 'tie' ? undefined : winnerId, isTie: winnerId === 'tie' };
        const ng = games.map(x => x.id === gameId ? ug : x);
        setGames(ng); setPlayers(prev => recalculateStats(ng, prev));
      },
      setPlayers, setGames, setPlayoffGames,
      syncPlayoffGames,
      isLoaded: !isInitializing,
      setHistory,
      isAwardsPhase, setIsAwardsPhase, awardFinalists, setAwardWinner,
      selectedAwards, awardResults, completeSeason, finalizeSeason, simulateAwards,
      calculateAwards: () => {
        const finalists = getAwardFinalists(players);
        const winners: Record<string, string> = {};
        Object.entries(finalists).forEach(([category, list]) => {
          if (list.length > 0) {
            winners[category as AwardType] = list[0].id;
          }
        });
        
        // Add Champion
        const champGame = playoffGames.find(g => g.round === 3 && g.winnerId);
        if (champGame?.winnerId) {
          winners['CHAMPION'] = champGame.winnerId;
        } else {
          const standings = calculateStandings(teams, games);
          if (standings.length > 0) {
            winners['CHAMPION'] = standings[0].teamId;
          }
        }
        return winners as Record<AwardType, string>;
      },
      generatePlayoffs
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
