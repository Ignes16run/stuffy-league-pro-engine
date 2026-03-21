// Last Updated: 2026-03-21T15:25:00-04:00

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Team, Game, PlayoffGame, SeasonHistory, Player } from '@/lib/league/types';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { generateRoundRobinSchedule, calculateStandings } from '@/lib/league/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from './auth-context';
import { generateTeamRoster } from '@/lib/league/players';

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
  players: Player[];
  setPlayers: (players: Player[]) => void;
  updatePlayer: (id: string, player: Partial<Player>) => void;
  
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
  updateOverallRating: (teamId: string) => void;
  
  // UI Helpers
  activeTab: string;
  setActiveTab: (tab: 'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history' | 'players') => void;
  isSimulating: boolean;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useLocalStorage<Team[]>('stuffy_teams', DEFAULT_LEAGUE_TEAMS);
  const [players, setPlayers] = useLocalStorage<Player[]>('stuffy_players', []);
  const [games, setGames] = useLocalStorage<Game[]>('stuffy_games', []);
  const [playoffGames, setPlayoffGames] = useLocalStorage<PlayoffGame[]>('stuffy_playoffs', []);
  const [history, setHistory] = useLocalStorage<SeasonHistory[]>('stuffy_history', []);
  const [numWeeks, setNumWeeks] = useLocalStorage<number>('stuffy_num_weeks', 0);
  
  const [activeTab, setActiveTab] = useState<'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history' | 'players'>('setup');
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-generate schedule if empty
  useEffect(() => {
    if (teams.length >= 2 && games.length === 0) {
      const schedule = generateRoundRobinSchedule(teams);
      setGames(schedule);
      setNumWeeks(Math.max(...schedule.map(g => g.week), 0));
    }
  }, [teams, games.length]);

  // Ensure all teams have players
  useEffect(() => {
    if (teams.length > 0) {
      const teamsWithMissingPlayers = teams.filter(t => !players.some(p => p.teamId === t.id));
      if (teamsWithMissingPlayers.length > 0) {
        const newPlayers: Player[] = [...players];
        teamsWithMissingPlayers.forEach(t => {
          const roster = generateTeamRoster(t.id);
          newPlayers.push(...roster);
        });
        setPlayers(newPlayers);
        
        // Also update overall ratings if they are missing
        teamsWithMissingPlayers.forEach(t => {
           const teamPlayers = newPlayers.filter(p => p.teamId === t.id);
           const avgRating = teamPlayers.reduce((acc, p) => acc + p.rating, 0) / teamPlayers.length;
           updateTeam(t.id, { overallRating: Math.round(avgRating) });
        });
      }
    }
  }, [teams, players.length]);

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
    const roster = generateTeamRoster(team.id);
    setPlayers([...players, ...roster]);
    const avgRating = roster.reduce((acc, p) => acc + p.rating, 0) / roster.length;
    updateTeam(team.id, { overallRating: Math.round(avgRating) });
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
      setPlayoffGames(prev => {
        const nextState = prev.map(g => {
          if (g.id !== gameId) return g;
          
          // If already the winner, clicking again deselects
          const isDeselecting = g.winnerId === winnerId && !isTie;
          const newWinnerId = isDeselecting ? undefined : (isTie ? undefined : winnerId);
          
          return { ...g, winnerId: newWinnerId };
        });

        // Compute the updated game to get the new winner
        const updatedGame = nextState.find(g => g.id === gameId);
        if (!updatedGame) return prev;

        // Propagate winner to next round
        const parts = gameId.split('-');
        if (parts.length < 3) return nextState;

        const round = parseInt(parts[1]);
        const matchup = parseInt(parts[2]);
        
        const nextRoundNum = round + 1;
        const nextMatchupIdx = Math.floor(matchup / 2);
        const nextGameId = `p-${nextRoundNum}-${nextMatchupIdx}`;
        const isTeam1 = matchup % 2 === 0;

        return nextState.map(pg => {
          if (pg.id === nextGameId) {
             const updatedPg = isTeam1 ? { ...pg, team1Id: updatedGame.winnerId } : { ...pg, team2Id: updatedGame.winnerId };
             // If winner changed, clear subsequent winners to prevent invalid bracket states
             return { ...updatedPg, winnerId: undefined };
          }
          return pg;
        });
      });
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
        // Use average player ratings (overallRating) as the foundation
        const homeRating = homeTeam.overallRating || 75;
        const awayRating = awayTeam.overallRating || 75;
        
        // Base probabilities on overall ratings
        const homeAdvantage = 3; // Home field advantage
        const totalRating = homeRating + awayRating + homeAdvantage;
        const homeWinProb = (homeRating + homeAdvantage) / totalRating;
        
        const roll = Math.random();
        if (roll < 0.05) {
          const score = Math.floor(Math.random() * 21) + 7;
          newGames[gameIdx] = { ...game, winnerId: undefined, isTie: true, homeScore: score, awayScore: score };
        } else {
          const winnerId = roll < homeWinProb ? game.homeTeamId : game.awayTeamId;
          const winnerRating = winnerId === game.homeTeamId ? homeRating : awayRating;
          
          // Scores based on ratings
          const winnerScore = Math.floor(Math.random() * 21) + 14 + (winnerRating / 10);
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

  const updatePlayer = (id: string, updatedPlayer: Partial<Player>) => {
    setPlayers(players.map(p => p.id === id ? { ...p, ...updatedPlayer } : p));
  };

  const updateOverallRating = (teamId: string) => {
    const teamPlayers = players.filter(p => p.teamId === teamId);
    if (teamPlayers.length === 0) return;
    const avgRating = teamPlayers.reduce((acc, p) => acc + p.rating, 0) / teamPlayers.length;
    updateTeam(teamId, { overallRating: Math.round(avgRating) });
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

  const upgradeStat = (teamId: string, stat: 'offenseRating' | 'defenseRating' | 'specialTeamsRating') => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    const cost = 50;
    const currentVal = team[stat] || 75;
    
    if ((team.stuffyPoints || 0) < cost || currentVal >= 99) return;
    
    updateTeam(teamId, { 
       [stat]: currentVal + 1,
       stuffyPoints: (team.stuffyPoints || 0) - cost
    });
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
    players,
    setPlayers,
    updatePlayer,
    addTeam,
    updateTeam,
    removeTeam,
    simulateSeason,
    handlePick,
    resetLeague,
    resetPredictions,
    completeSeason,
    upgradeStat,
    updateOverallRating,
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
