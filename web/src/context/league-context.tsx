"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Team, Game, PlayoffGame, SeasonHistory, Player, PlayerStats,
  NarrativeMemoryEntry, NewsStory
} from '@/lib/league/types';
import {
  calculateStandings,
  generateUUID,
  createSeededRandom,
  syncTeamStructures
} from '@/lib/league/utils';
import { 
  generateDivisionSchedule, 
  generateConferencePlayoffs 
} from '@/lib/league/structureEngine';
import { useAuth } from '@/context/auth-context';
import { generateTeamRoster } from '@/lib/league/players';
import { 
  DEFAULT_LEAGUE_TEAMS, 
  NUM_WEEKS_DEFAULT 
} from '@/lib/league/constants';
import { getAwardFinalists } from '@/lib/league/awardsEngine';
import { assignStatsToPlayers } from '@/lib/league/statsEngine';
import { generateWeeklyNews } from '@/lib/league/newsEngine';
import { TEAM_EMBLEM_MAP } from '@/lib/league/assetMap';

// Hooks
import { useLeagueTeams } from '@/hooks/league/use-league-teams';
import { useLeagueSchedule } from '@/hooks/league/use-league-schedule';
import { useLeagueAwards } from '@/hooks/league/use-league-awards';
import { useLeaguePersistence } from '@/hooks/league/use-league-persistence';
import { useLeagueSimulation } from '@/hooks/league/use-league-simulation';

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
  createLeague: () => Promise<{ nextTeams: Team[]; nextPlayers: Player[]; nextGames: Game[]; }>;
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
  syncPlayoffGames: (games: PlayoffGame[]) => Promise<void>;
  setHistory: React.Dispatch<React.SetStateAction<SeasonHistory[]>>;
  isLoaded: boolean;
  // Awards System
  isAwardsPhase: boolean;
  setIsAwardsPhase: (val: boolean) => void;
  awardFinalists: Record<string, Player[]>;
  setAwardWinner: (category: string, playerId: string) => void;
  selectedAwards: Record<string, string>;
  awardResults: Record<string, unknown>;
  completeSeason: (championId: string) => void;
  finalizeSeason: () => void;
  simulateAwards: () => void;
  calculateAwards: () => Record<string, unknown>;
  generatePlayoffs: () => void;
  // Live Broadcast
  activeBroadcastGameId: string | null;
  setActiveBroadcastGameId: (id: string | null) => void;
  updateGameResult: (gameId: string, homeScore: number, awayScore: number, winnerId: string | 'tie' | null) => void;
  updatePlayoffGameResult: (gameId: string, score1: number, score2: number, winnerId: string) => void;
  news: NewsStory[];
  setNews: React.Dispatch<React.SetStateAction<NewsStory[]>>;
  generateWeeklyNews: (week: number, games: Game[], teams: Team[], players: Player[]) => NewsStory[];
  toggleStoryFeedback: (storyId: string, feedback: 'UP' | 'DOWN') => void;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // 1. Core State Hooks
  const { 
    teams, setTeams, players, setPlayers, 
    addTeam, updateTeam, deleteTeam, updatePlayer, bulkUpdatePlayers, upgradeStat 
  } = useLeagueTeams();

  const { 
    games, setGames, playoffGames, setPlayoffGames, 
    currentWeek, setCurrentWeek, numWeeks, setNumWeeks, 
    history, setHistory, advanceWeek, updateGameResult: baseUpdateResult, updatePlayoffResult: baseUpdatePlayoffResult 
  } = useLeagueSchedule();

  const [news, setNews] = useState<NewsStory[]>([]);
  const [activeBroadcastGameId, setActiveBroadcastGameId] = useState<string | null>(null);

  // 2. Specialized Utility Hooks
  const recalculateStatsHelper = useCallback((allGames: Game[], allPlayers: Player[]) => {
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

  const { isSimulating, simulateGames, simulateSeason: doSimulateSeason } = useLeagueSimulation(
    teams, players, games, news, setGames, setTeams, setPlayers, recalculateStatsHelper
  );

  const [recentNarrativesUsed, setRecentNarrativesUsed] = useState<NarrativeMemoryEntry[]>([]);
  const {
    isAwardsPhase, setIsAwardsPhase, awardFinalists, setAwardFinalists,
    selectedAwards, awardResults, setAwardWinner, simulateAwards, setAwardResults,
    calculateAwards: baseCalculateAwards
  } = useLeagueAwards(players, teams, history, recentNarrativesUsed, setRecentNarrativesUsed);

  const calculateAwards = useCallback(() => {
    const results = baseCalculateAwards() as Record<string, { winner: { id: string, name: string, teamId: string }, narrative: string }>;
    const championshipGame = playoffGames.find(g => g.round === 3);
    if (championshipGame) {
      const winnerId = championshipGame.winnerId || (championshipGame.team1Score !== undefined && championshipGame.team2Score !== undefined ? 
        (championshipGame.team1Score > championshipGame.team2Score ? championshipGame.team1Id : championshipGame.team2Id) : undefined);
      
      const champTeam = teams.find(t => t.id === winnerId);
      if (champTeam) {
        results['CHAMPION'] = { 
          winner: { id: champTeam.id, name: champTeam.name, teamId: champTeam.id }, 
          narrative: `The ${champTeam.name} are your Stuffy League Champions! A season for the history books.`
        };
      }
    }
    return results;
  }, [baseCalculateAwards, teams, playoffGames]);

  // 3. UI and Persistence
  const [activeTab, setActiveTab] = useState('season');
  const [isInitializing, setIsInitializing] = useState(true);
  const { loadLocal, saveLocal, saveSupabase, loadSupabase, clearAll } = useLeaguePersistence();

  // Updated: 2026-03-27T19:53Z

  // Initialization Effect
  useEffect(() => {
    const data = loadLocal();
    if (data) {
      const loadedTeams = syncTeamStructures(data.teams || []);
      const syncedTeams = loadedTeams.map(t => {
        const defaultTeam = DEFAULT_LEAGUE_TEAMS.find(dt => dt.name.toLowerCase() === t.name.toLowerCase());
        return {
          ...t,
          logoUrl: defaultTeam ? defaultTeam.logoUrl : (TEAM_EMBLEM_MAP[t.id] || t.logoUrl)
        };
      });
      setTeams(syncedTeams);
      setPlayers(data.players || []);
      setGames(data.games || []);
      setPlayoffGames(data.playoffGames || []);
      setCurrentWeek(data.currentWeek || 1);
      setNumWeeks(data.numWeeks || (data.teams?.length > 0 ? data.teams.length - 1 : NUM_WEEKS_DEFAULT));
      setHistory(data.history || []);
      setNews(data.news || []);
      setIsAwardsPhase(data.isAwardsPhase || false);
      setAwardFinalists(data.awardFinalists || {});
      setAwardResults(data.awardResults || {});
    }
    const timer = setTimeout(() => setIsInitializing(false), 0);
    return () => clearTimeout(timer);
  }, [loadLocal, setIsAwardsPhase, setAwardFinalists, setAwardResults, setTeams, setPlayers, setGames, setPlayoffGames, setCurrentWeek, setNumWeeks, setHistory, setNews]);

  // Persistence effect
  useEffect(() => {
    if (!isInitializing) {
      saveLocal({
        teams, players, games, playoffGames, currentWeek, numWeeks, history, news,
        isAwardsPhase, awardFinalists, selectedAwards, awardResults
      });
    }
  }, [teams, players, games, playoffGames, currentWeek, numWeeks, history, news, isInitializing, isAwardsPhase, awardFinalists, selectedAwards, awardResults, saveLocal]);

  // Specialized Local Logic
  const addDefaultTeams = useCallback(async () => {
    const nextTeams: Team[] = [];
    const nextPlayers: Player[] = [];
    for (const teamDef of DEFAULT_LEAGUE_TEAMS) {
      const newTeam = { ...teamDef, id: generateUUID() };
      const newRoster = generateTeamRoster(newTeam.id);
      nextTeams.push(newTeam as Team);
      nextPlayers.push(...newRoster);
    }
    setTeams(nextTeams);
    setPlayers(nextPlayers);
    const newGames = generateDivisionSchedule(nextTeams, numWeeks);
    setGames(newGames);
    return { nextTeams, nextPlayers, nextGames: newGames };
  }, [numWeeks, setTeams, setPlayers, setGames]);

  const generatePlayoffs = useCallback(() => {
    const newPlayoffGames = generateConferencePlayoffs(teams, games);
    setPlayoffGames(newPlayoffGames);
    const finalists = getAwardFinalists(players);
    setAwardFinalists(finalists as Record<string, Player[]>);
    setIsAwardsPhase(true);
  }, [teams, games, players, setAwardFinalists, setIsAwardsPhase, setPlayoffGames]);

  const simulateSeason = useCallback(async () => {
    const { currentGames, currentPlayers } = await doSimulateSeason(numWeeks);
    const allGamesFinished = currentGames.length > 0 && currentGames.every(g => g.homeScore !== undefined);
    if (allGamesFinished) {
      const newPlayoffGames = generateConferencePlayoffs(teams, currentGames);
      setPlayoffGames(newPlayoffGames);
      const finalists = getAwardFinalists(currentPlayers);
      setAwardFinalists(finalists as Record<string, Player[]>);
      setIsAwardsPhase(true);
    }
  }, [doSimulateSeason, numWeeks, teams, setPlayoffGames, setAwardFinalists, setIsAwardsPhase]);

  const finalizeSeason = useCallback(() => {
    const championshipGame = playoffGames.find(g => g.round === 3);
    const champId = championshipGame?.winnerId || (championshipGame && championshipGame.team1Score !== undefined && championshipGame.team2Score !== undefined ? 
      (championshipGame.team1Score > championshipGame.team2Score ? championshipGame.team1Id : championshipGame.team2Id) : undefined);
    
    if (!champId) return;

    const standings = calculateStandings(teams, games);
    
    setHistory(prev => [{
      year: 2026 + history.length,
      championId: champId,
      finalStandings: standings,
      awardWinners: awardResults
    }, ...prev]);
    
    setPlayoffGames([]);
    setCurrentWeek(1);
    setIsAwardsPhase(false);
    setAwardFinalists({});
    setAwardResults({});
    setGames(generateDivisionSchedule(teams, numWeeks));
    setNews([]);
  }, [teams, games, playoffGames, history.length, awardResults, numWeeks, setAwardResults, setPlayoffGames, setCurrentWeek, setIsAwardsPhase, setAwardFinalists, setGames, setHistory, setNews]);

  const advanceWeekWithNews = useCallback(() => {
    const currentGames = games.filter(g => g.week === currentWeek);
    const newStories = generateWeeklyNews(currentWeek, currentGames, teams, players);
    setNews(prev => [...newStories, ...prev]);
    advanceWeek();
  }, [currentWeek, games, teams, players, advanceWeek, setNews]);

  const toggleStoryFeedback = useCallback((storyId: string, feedback: 'UP' | 'DOWN') => {
    setNews(prev => prev.map(s => {
      if (s.id !== storyId) return s;
      const newFeedback = s.feedback === feedback ? null : feedback;
      return { ...s, feedback: newFeedback };
    }));
  }, [setNews]);

  const value = useMemo(() => ({
    teams, players, games, playoffGames, history, activeTab, setActiveTab,
    currentWeek, numWeeks, setNumWeeks, isSimulating,
    addTeam, updateTeam, deleteTeam, updatePlayer, bulkUpdatePlayers, upgradeStat,
    addDefaultTeams, createLeague: addDefaultTeams, setCurrentWeek, simulateGames, 
    resetLeague: async () => {
      setTeams([]); setPlayers([]); setGames([]); setPlayoffGames([]);
      setCurrentWeek(1); setIsAwardsPhase(false); setHistory([]);
      if (user) await clearAll(user.id); else localStorage.removeItem('stuffy_league_data');
    },
    saveToSupabase: async () => { if (user) await saveSupabase({ teams, players, games, playoffGames }, user.id); },
    loadFromSupabase: async () => {
      if (!user) return;
      const data = await loadSupabase(user.id);
      setTeams(data.teams); setPlayers(data.players || []); setGames(data.games || []);
    },
    simulateSeason, 
    resetPredictions: () => {
      setGames(games.map(g => ({ ...g, homeScore: undefined, awayScore: undefined, winnerId: undefined, isTie: undefined })));
      setIsAwardsPhase(false);
    },
    handlePick: (gameId: string, winnerId: string | 'tie' | null) => { 
        setGames(prev => prev.map(g => {
            if (g.id !== gameId) return g;

            // Generate mock score based on pick
            let homeScore: number | undefined = undefined;
            let awayScore: number | undefined = undefined;
            
            if (winnerId === 'tie') {
                homeScore = 14;
                awayScore = 14;
            } else if (winnerId === g.homeTeamId) {
                homeScore = 24;
                awayScore = 14;
            } else if (winnerId === g.awayTeamId) {
                homeScore = 14;
                awayScore = 24;
            }

            return {
                ...g,
                winnerId: winnerId === 'tie' ? undefined : (winnerId || undefined),
                isTie: winnerId === 'tie',
                homeScore,
                awayScore
            };
        }));
    },
    setPlayers, setGames, setPlayoffGames, syncPlayoffGames: async (g: PlayoffGame[]) => setPlayoffGames(g), 
    setHistory, isLoaded: !isInitializing,
    isAwardsPhase, setIsAwardsPhase, awardFinalists, setAwardWinner,
    selectedAwards, awardResults, 
    completeSeason: (cid: string) => {
      const standings = calculateStandings(teams, games);
      setHistory(prev => [{ year: 2026 + prev.length, championId: cid, finalStandings: standings }, ...prev]);
      setIsAwardsPhase(true);
    },
    finalizeSeason, simulateAwards, calculateAwards, generatePlayoffs,
    activeBroadcastGameId, setActiveBroadcastGameId, 
    news, setNews,
    generateWeeklyNews,
    toggleStoryFeedback,
    advanceWeek: advanceWeekWithNews,
    updateGameResult: (gid: string, hs: number, as: number, wid: string | 'tie' | null) => 
        baseUpdateResult(gid, hs, as, wid, setGames, setPlayers, setTeams),
    updatePlayoffGameResult: (gid: string, s1: number, s2: number, wid: string) =>
        baseUpdatePlayoffResult(gid, s1, s2, wid, setPlayoffGames)
  }), [
    teams, players, games, playoffGames, history, activeTab, currentWeek, numWeeks, isSimulating,
    addTeam, updateTeam, deleteTeam, updatePlayer, bulkUpdatePlayers, upgradeStat,
    addDefaultTeams, advanceWeekWithNews, simulateGames, simulateSeason, finalizeSeason, simulateAwards, 
    calculateAwards, generatePlayoffs, activeBroadcastGameId, baseUpdateResult, isInitializing,
    isAwardsPhase, setIsAwardsPhase, awardFinalists, setAwardWinner, selectedAwards, awardResults,
    setTeams, setPlayers, setGames, setPlayoffGames, setHistory, setCurrentWeek, setNumWeeks,
    user, clearAll, saveSupabase, loadSupabase, news, setNews, toggleStoryFeedback, baseUpdatePlayoffResult
  ]);

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
