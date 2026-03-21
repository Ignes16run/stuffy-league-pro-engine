"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Team, Game, PlayoffGame, SeasonHistory } from '@/lib/league/types';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { generateRoundRobinSchedule, calculateStandings } from '@/lib/league/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from './auth-context';

interface LeagueContextType {
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  games: Game[];
  setGames: (games: Game[]) => void;
  playoffGames: PlayoffGame[];
  setPlayoffGames: (games: PlayoffGame[]) => void;
  history: SeasonHistory[];
  numWeeks: number;
  setNumWeeks: (weeks: number) => void;
  
  // Actions
  addTeam: (team: Team) => void;
  updateTeam: (id: string, team: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  simulateSeason: () => Promise<void>;
  handlePick: (gameId: string, winnerId: string | 'tie', shouldCheer?: boolean) => void;
  resetLeague: () => void;
  resetPredictions: () => void;
  completeSeason: (championId: string) => void;
  upgradeStat: (teamId: string, stat: 'offenseRating' | 'defenseRating' | 'specialTeamsRating') => void;
  
  // UI Helpers
  activeTab: string;
  setActiveTab: (tab: 'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history') => void;
  isSimulating: boolean;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useLocalStorage<Team[]>('stuffy_teams', DEFAULT_LEAGUE_TEAMS);
  const [games, setGames] = useLocalStorage<Game[]>('stuffy_games', []);
  const [playoffGames, setPlayoffGames] = useLocalStorage<PlayoffGame[]>('stuffy_playoffs', []);
  const [history, setHistory] = useLocalStorage<SeasonHistory[]>('stuffy_history', []);
  const [numWeeks, setNumWeeks] = useLocalStorage<number>('stuffy_num_weeks', 0);
  
  const [activeTab, setActiveTab] = useState<'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history'>('setup');
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-generate schedule if empty
  useEffect(() => {
    if (teams.length >= 2 && games.length === 0) {
      const schedule = generateRoundRobinSchedule(teams);
      setGames(schedule);
      setNumWeeks(Math.max(...schedule.map(g => g.week)));
    }
  }, [teams, games.length]);

  // Sync from DB on Login
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        const { data: dbTeams } = await supabase.from('teams').select('*').eq('user_id', user.id);
        const { data: dbGames } = await supabase.from('games').select('*').eq('user_id', user.id);
        const { data: dbHistory } = await supabase.from('season_history').select('*').eq('user_id', user.id);

        if (dbTeams && dbTeams.length > 0) setTeams(dbTeams.map(t => ({
           id: t.id, name: t.name, icon: t.icon as any, primaryColor: t.primary_color, secondaryColor: t.secondary_color,
           offenseRating: t.offense_rating, defenseRating: t.defense_rating, specialTeamsRating: t.special_teams_rating,
           stuffyPoints: t.stuffy_points, allTimeWins: t.all_time_wins, championships: t.championships,
           logoUrl: t.logo_url
        })));
        
        if (dbGames && dbGames.length > 0) {
          setGames(dbGames.map(g => ({
            id: g.id, week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id, 
            winnerId: g.winner_id, isTie: g.is_tie, homeScore: g.home_score, awayScore: g.away_score
          })));
        }
      };
      loadData();
    }
  }, [user]);

  // Sync to DB Helpers
  const syncTeam = async (team: Team) => {
    if (!user) return;
    await supabase.from('teams').upsert({
      id: team.id.length > 20 ? team.id : undefined,
      user_id: user.id,
      name: team.name, icon: team.icon, primary_color: team.primaryColor, secondary_color: team.secondaryColor,
      offense_rating: team.offenseRating, defense_rating: team.defenseRating, special_teams_rating: team.specialTeamsRating,
      stuffy_points: team.stuffyPoints, all_time_wins: team.allTimeWins, championships: team.championships
    });
  };

  const syncGame = async (game: Game) => {
    if (!user) return;
    await supabase.from('games').upsert({
      id: game.id, user_id: user.id, week: game.week,
      home_team_id: game.homeTeamId, away_team_id: game.awayTeamId,
      winner_id: game.winnerId, is_tie: game.isTie, home_score: game.homeScore, away_score: game.awayScore
    });
  };

  // Actions
  const addTeam = (team: Team) => {
    setTeams([...teams, team]);
    syncTeam(team);
  };

  const updateTeam = (id: string, updatedTeam: Partial<Team>) => {
    const newTeams = teams.map(t => t.id === id ? { ...t, ...updatedTeam } : t);
    setTeams(newTeams);
    const updated = newTeams.find(t => t.id === id);
    if (updated) syncTeam(updated);
  };

  const removeTeam = (id: string) => {
    setTeams(teams.filter(t => t.id !== id));
    if (user) supabase.from('teams').delete().eq('id', id).eq('user_id', user.id).then();
  };

  const handlePick = (gameId: string, winnerId: string | 'tie', shouldCheer = true) => {
    const isTie = winnerId === 'tie';
    const isPlayoffGame = gameId.startsWith('p-');

    if (isPlayoffGame) {
      setPlayoffGames(prev => prev.map(g => {
        if (g.id !== gameId) return g;
        
        // If already the winner, clicking again deselects
        if (g.winnerId === winnerId && !isTie) {
          return { ...g, winnerId: undefined };
        }
        
        const updatedGame = { ...g, winnerId: isTie ? undefined : winnerId };
        
        // Propagate winner to next round
        const [, round, matchup] = gameId.split('-');
        const nextRoundNum = parseInt(round) + 1;
        const nextMatchupIdx = Math.floor(parseInt(matchup) / 2);
        const nextGameId = `p-${nextRoundNum}-${nextMatchupIdx}`;
        const isTeam1 = parseInt(matchup) % 2 === 0;

        setPlayoffGames(allGames => allGames.map(pg => {
          if (pg.id === nextGameId) {
             return isTeam1 ? { ...pg, team1Id: winnerId as string } : { ...pg, team2Id: winnerId as string };
          }
          return pg;
        }));

        return updatedGame;
      }));
    } else {
      setGames(prev => prev.map(g => {
        if (g.id !== gameId) return g;
        
        const isDeselecting = isTie ? g.isTie : g.winnerId === winnerId;
        if (isDeselecting) {
          return { ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined };
        }
        
        if (isTie) {
          const score = Math.floor(Math.random() * 21) + 7;
          return { ...g, winnerId: undefined, isTie: true, homeScore: score, awayScore: score };
        } else {
          const winnerScore = Math.floor(Math.random() * 21) + 14;
          const loserScore = Math.floor(Math.random() * (winnerScore - 7)) + 3;
          const isHomeWinner = winnerId === g.homeTeamId;
          return { 
            ...g, 
            winnerId, 
            isTie: false, 
            homeScore: isHomeWinner ? winnerScore : loserScore,
            awayScore: isHomeWinner ? loserScore : winnerScore
          };
        }
      }));
    }
    
    if (!isTie && shouldCheer) {
      // Logic for Cheer is usually handled in the UI layer
    }
  };

  const simulateSeason = async () => {
    setIsSimulating(true);
    const unplayedGames = games.filter(g => !g.winnerId && !g.isTie);
    
    const newGames = [...games];
    for (let i = 0; i < unplayedGames.length; i++) {
      const gameIdx = newGames.findIndex(g => g.id === unplayedGames[i].id);
      const game = newGames[gameIdx];
      
      const homeTeam = teams.find(t => t.id === game.homeTeamId);
      const awayTeam = teams.find(t => t.id === game.awayTeamId);
      
      if (homeTeam && awayTeam) {
        const hOff = homeTeam.offenseRating ?? 75;
        const hDef = homeTeam.defenseRating ?? 75;
        const hSpec = homeTeam.specialTeamsRating ?? 75;
        const aOff = awayTeam.offenseRating ?? 75;
        const aDef = awayTeam.defenseRating ?? 75;
        const aSpec = awayTeam.specialTeamsRating ?? 75;

        const homePower = (hOff * 0.45) + (hDef * 0.45) + (hSpec * 0.1);
        const awayPower = (aOff * 0.45) + (aDef * 0.45) + (aSpec * 0.1);
        
        const homeAdvantage = 3;
        const totalPower = homePower + awayPower + homeAdvantage;
        const homeWinProb = (homePower + homeAdvantage) / totalPower;
        
        const roll = Math.random();
        if (roll < 0.05) {
          const score = Math.floor(Math.random() * 21) + 7;
          newGames[gameIdx] = { ...game, winnerId: undefined, isTie: true, homeScore: score, awayScore: score };
        } else {
          const winnerId = roll < homeWinProb ? game.homeTeamId : game.awayTeamId;
          const winnerScore = Math.floor(Math.random() * 21) + 14 + (winnerId === game.homeTeamId ? homePower/10 : awayPower/10);
          const loserScore = Math.floor(Math.random() * (winnerScore - 3)) + 3;
          newGames[gameIdx] = { 
            ...game, 
            winnerId, 
            isTie: false, 
            homeScore: Math.floor(winnerId === game.homeTeamId ? winnerScore : loserScore),
            awayScore: Math.floor(winnerId === game.awayTeamId ? winnerScore : loserScore)
          };
        }
      }

      if (i % 5 === 0) {
        setGames([...newGames]);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    setGames([...newGames]);
    setIsSimulating(false);
  };

  const upgradeStat = (teamId: string, stat: 'offenseRating' | 'defenseRating' | 'specialTeamsRating') => {
    setTeams(teams.map(t => {
      if (t.id === teamId) {
        const currentPoints = t.stuffyPoints || 0;
        const currentVal = t[stat] || 75;
        if (currentPoints >= 50 && currentVal < 99) {
          return {
            ...t,
            [stat]: Math.min(99, currentVal + 1),
            stuffyPoints: currentPoints - 50
          };
        }
      }
      return t;
    }));
  };

  const completeSeason = (championId: string) => {
    const standings = calculateStandings(teams, games);
    const newHistoryEntry: SeasonHistory = {
      year: history.length + 2024,
      championId,
      finalStandings: standings
    };

    setHistory([...history, newHistoryEntry]);
    
    if (user) {
      supabase.from('season_history').insert({
        user_id: user.id,
        year: newHistoryEntry.year,
        champion_id: championId,
        final_standings: standings
      }).then();
    }
    
    const updatedTeams = teams.map(t => {
      const seasonWins = games.filter(g => g.winnerId === t.id).length + 
                         playoffGames.filter(g => g.winnerId === t.id).length;
      const seasonLosses = games.filter(g => g.winnerId && g.winnerId !== t.id && (g.homeTeamId === t.id || g.awayTeamId === t.id)).length +
                           playoffGames.filter(g => g.winnerId && g.winnerId !== t.id && (g.team1Id === t.id || g.team2Id === t.id)).length;
      const seasonTies = games.filter(g => g.isTie && (g.homeTeamId === t.id || g.awayTeamId === t.id)).length;
      const isChampion = t.id === championId;
      
      const updated = {
        ...t,
        stuffyPoints: (t.stuffyPoints || 0) + (seasonWins * 2) + (seasonLosses * 10) + (seasonTies * 5) + (isChampion ? 20 : 0),
        allTimeWins: (t.allTimeWins || 0) + seasonWins,
        championships: (t.championships || 0) + (isChampion ? 1 : 0)
      };
      
      if (user) syncTeam(updated);
      return updated;
    });

    setTeams(updatedTeams);
    setGames(games.map(g => ({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined })));
    setPlayoffGames([]);
    setActiveTab('history');
  };

  const resetPredictions = () => {
    setGames(games.map(g => ({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined })));
    setPlayoffGames([]);
  };

  const resetLeague = () => {
    setTeams(DEFAULT_LEAGUE_TEAMS);
    setGames([]);
    setPlayoffGames([]);
    setActiveTab('setup');
  };

  const value = {
    teams,
    setTeams,
    games,
    setGames,
    playoffGames,
    setPlayoffGames,
    history,
    numWeeks,
    setNumWeeks,
    addTeam,
    updateTeam,
    removeTeam,
    simulateSeason,
    handlePick,
    resetLeague,
    resetPredictions,
    completeSeason,
    upgradeStat,
    activeTab,
    setActiveTab,
    isSimulating
  };

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) {
    throw new Error('useLeague must be used within a LeagueProvider');
  }
  return context;
}
