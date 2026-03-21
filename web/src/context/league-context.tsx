"use client";
// Last Updated: 2026-03-21T16:30:00-04:00

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
  
  activeTab: string;
  setActiveTab: (tab: 'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history' | 'players') => void;
  isSimulating: boolean;
  allocatePlayerStats: (gameId: string, team1Id: string, team2Id: string, team1Score: number, team2Score: number) => void;
  user: any;
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

  // Auto-generate schedule
  useEffect(() => {
    if (teams.length >= 2 && games.length === 0) {
      const schedule = generateRoundRobinSchedule(teams);
      setGames(schedule);
      setNumWeeks(Math.max(...schedule.map(g => g.week), 0));
    }
  }, [teams, games.length]);

  // Sync from DB
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        const { data: dbTeams } = await supabase.from('teams').select('*').eq('user_id', user.id);
        const { data: dbPlayers } = await supabase.from('players').select('*').eq('user_id', user.id);
        const { data: dbGames } = await supabase.from('games').select('*').eq('user_id', user.id);
        const { data: dbHistory } = await supabase.from('season_history').select('*').eq('user_id', user.id);

        if (dbTeams && dbTeams.length > 0) setTeams(dbTeams.map(t => ({
           id: t.id, name: t.name, icon: t.icon as any, primaryColor: t.primary_color, secondaryColor: t.secondary_color,
           offenseRating: t.offense_rating, defenseRating: t.defense_rating, specialTeamsRating: t.special_teams_rating,
           stuffyPoints: t.stuffy_points, all_time_wins: t.all_time_wins, championships: t.championships,
           logoUrl: t.logo_url
        })));
        
        if (dbPlayers && dbPlayers.length > 0) {
          setPlayers(dbPlayers.map(p => ({
            id: p.id, teamId: p.team_id, name: p.name, position: p.position,
            rating: p.rating, profilePicture: p.profile_picture, profile: p.profile,
            archetype: p.archetype, abilities: p.abilities, stats: p.stats
          })));
        }
        
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

  // Sync helpers
  const syncTeam = async (team: Team) => {
    if (!user) return;
    await supabase.from('teams').upsert({
      id: team.id, user_id: user.id, name: team.name, icon: team.icon, 
      primary_color: team.primaryColor, secondary_color: team.secondaryColor,
      offense_rating: team.offenseRating, defense_rating: team.defenseRating, 
      special_teams_rating: team.specialTeamsRating, stuffy_points: team.stuffyPoints, 
      all_time_wins: team.allTimeWins, championships: team.championships, logo_url: team.logoUrl
    });
  };

  const syncPlayer = async (player: Player) => {
    if (!user) return;
    await supabase.from('players').upsert({
      id: player.id, user_id: user.id, team_id: player.teamId,
      name: player.name, position: player.position, rating: player.rating,
      profile_picture: player.profilePicture, profile: player.profile,
      archetype: player.archetype, abilities: player.abilities, stats: player.stats
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

  const addTeam = (team: Team) => {
    setTeams([...teams, team]);
    const roster = generateTeamRoster(team.id);
    setPlayers(prev => [...prev, ...roster]);
    syncTeam(team);
    roster.forEach(p => syncPlayer(p));
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

  const allocatePlayerStats = (gameId: string, team1Id: string, team2Id: string, team1Score: number, team2Score: number) => {
    setPlayers(prevPlayers => {
      const nextPlayers = prevPlayers.map(p => ({ ...p, stats: { ...p.stats } }));
      
      const updateTeamStats = (teamId: string, score: number) => {
        const teamPlayers = nextPlayers.filter(p => p.teamId === teamId);
        if (teamPlayers.length === 0) return;

        teamPlayers.forEach(p => { p.stats.gamesPlayed = (p.stats.gamesPlayed || 0) + 1; });

        const qb = teamPlayers.find(p => p.position === 'QB');
        const skillPlayers = teamPlayers.filter(p => ['RB', 'WR', 'TE'].includes(p.position));
        const k = teamPlayers.find(p => p.position === 'K');

        const tds = Math.floor(score / 7);
        for (let i = 0; i < tds; i++) {
          const target = skillPlayers[Math.floor(Math.random() * skillPlayers.length)];
          if (target) {
            target.stats.touchdowns = (target.stats.touchdowns || 0) + 1;
            target.stats.points = (target.stats.points || 0) + 6;
          }
        }
        
        const teamYards = score * 10 + Math.floor(Math.random() * 40);
        if (qb) qb.stats.yards = (qb.stats.yards || 0) + Math.floor(teamYards * 0.8);
        
        let remainingYards = teamYards;
        skillPlayers.forEach((p, idx) => {
          const share = idx === skillPlayers.length - 1 ? remainingYards : Math.floor(Math.random() * (remainingYards / (skillPlayers.length - idx)));
          p.stats.yards = (p.stats.yards || 0) + share;
          remainingYards -= share;
        });

        const defense = teamPlayers.filter(p => ['DL', 'LB', 'DB'].includes(p.position));
        defense.forEach(p => {
          p.stats.tackles = (p.stats.tackles || 0) + Math.floor(Math.random() * 6);
          if (Math.random() < 0.1) p.stats.interceptions = (p.stats.interceptions || 0) + 1;
        });

        if (k) {
          const fgs = Math.floor((score % 7) / 3);
          k.stats.points = (k.stats.points || 0) + (fgs * 3) + tds; 
        }

        // Sync affected players to DB
        if (user) {
          teamPlayers.forEach(p => syncPlayer(p));
        }
      };

      updateTeamStats(team1Id, team1Score);
      updateTeamStats(team2Id, team2Score);

      return nextPlayers;
    });
  };

  const handlePick = (gameId: string, winnerId: string | 'tie', shouldCheer = true) => {
    const isTie = winnerId === 'tie';
    if (gameId.startsWith('p-')) {
      // Playoff logic (simplified)
      setPlayoffGames(prev => prev.map(g => g.id === gameId ? { ...g, winnerId: g.winnerId === winnerId ? undefined : winnerId } : g));
      return;
    }

    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const isDeselecting = isTie ? game.isTie : game.winnerId === winnerId;
    
    let nextGameData: Partial<Game>;
    if (isDeselecting) {
      nextGameData = { winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined };
    } else if (isTie) {
      const score = Math.floor(Math.random() * 21) + 7;
      nextGameData = { winnerId: undefined, isTie: true, homeScore: score, awayScore: score };
    } else {
      const winnerScore = Math.floor(Math.random() * 21) + 14;
      const loserScore = Math.floor(Math.random() * (winnerScore - 7)) + 3;
      const isHomeWinner = winnerId === game.homeTeamId;
      nextGameData = { 
        winnerId, isTie: false, 
        homeScore: isHomeWinner ? winnerScore : loserScore,
        awayScore: isHomeWinner ? loserScore : winnerScore
      };
    }

    setGames(prev => {
      const next = prev.map(g => g.id === gameId ? { ...g, ...nextGameData } : g);
      const updated = next.find(g => g.id === gameId);
      if (updated) syncGame(updated);
      return next;
    });

    if (!isDeselecting && nextGameData.homeScore !== undefined && nextGameData.awayScore !== undefined) {
      allocatePlayerStats(gameId, game.homeTeamId, game.awayTeamId, nextGameData.homeScore, nextGameData.awayScore);
    }
  };

  const simulateSeason = async () => {
    setIsSimulating(true);
    const unplayedGames = games.filter(g => !g.winnerId && !g.isTie);
    const newGames = [...games];
    
    for (let i = 0; i < unplayedGames.length; i++) {
      const gameIdx = newGames.findIndex(g => g.id === unplayedGames[i].id);
      const game = newGames[gameIdx];
      const hTeam = teams.find(t => t.id === game.homeTeamId);
      const aTeam = teams.find(t => t.id === game.awayTeamId);
      
      if (hTeam && aTeam) {
        const homeRating = hTeam.overallRating || 75;
        const awayRating = aTeam.overallRating || 75;
        const homeWinProb = (homeRating + 3) / (homeRating + awayRating + 3);
        const roll = Math.random();
        
        let res;
        if (roll < 0.05) {
          const s = Math.floor(Math.random() * 21) + 7;
          res = { winnerId: undefined, isTie: true, homeScore: s, awayScore: s };
        } else {
          const wId = roll < homeWinProb ? game.homeTeamId : game.awayTeamId;
          const wRating = wId === game.homeTeamId ? homeRating : awayRating;
          const wScore = Math.floor(Math.random() * 21) + 14 + (wRating / 10);
          const lScore = Math.max(0, Math.floor(Math.random() * (wScore - 3)) + 3);
          res = { 
            winnerId: wId, isTie: false, 
            homeScore: Math.floor(wId === game.homeTeamId ? wScore : lScore),
            awayScore: Math.floor(wId === game.awayTeamId ? wScore : lScore)
          };
        }

        const updated = { ...game, ...res };
        newGames[gameIdx] = updated;
        syncGame(updated);
        allocatePlayerStats(game.id, game.homeTeamId, game.awayTeamId, updated.homeScore!, updated.awayScore!);
      }

      if (i % 5 === 0) {
        setGames([...newGames]);
        await new Promise(r => setTimeout(r, 50));
      }
    }
    setGames([...newGames]);
    setIsSimulating(false);
  };

  const updatePlayer = (id: string, updatedPlayer: Partial<Player>) => {
    setPlayers(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...updatedPlayer } : p);
      const updated = next.find(p => p.id === id);
      if (updated) syncPlayer(updated);
      return next;
    });
  };

  const completeSeason = (championId: string) => {
    const standings = calculateStandings(teams, games);
    const newHistoryEntry: SeasonHistory = {
      year: history.length + 2024,
      championId,
      finalStandings: standings
    };
    setHistory([...history, newHistoryEntry]);
    if (user) supabase.from('season_history').insert({ user_id: user.id, year: newHistoryEntry.year, champion_id: championId, final_standings: standings }).then();
    
    setTeams(teams.map(t => {
      const w = games.filter(g => g.winnerId === t.id).length;
      const isChamp = t.id === championId;
      const updated = { ...t, stuffyPoints: (t.stuffyPoints || 0) + (w * 2) + (isChamp ? 20 : 0), allTimeWins: (t.allTimeWins || 0) + w, championships: (t.championships || 0) + (isChamp ? 1 : 0) };
      if (user) syncTeam(updated);
      return updated;
    }));
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
    setPlayers([]);
    setHistory([]);
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

  const updateOverallRating = (teamId: string) => {
    const teamPlayers = players.filter(p => p.teamId === teamId);
    if (teamPlayers.length === 0) return;
    const avgRating = teamPlayers.reduce((acc, p) => acc + p.rating, 0) / teamPlayers.length;
    updateTeam(teamId, { overallRating: Math.round(avgRating) });
  };

  const value = {
    teams, setTeams, games, setGames, playoffGames, setPlayoffGames, history, numWeeks, setNumWeeks,
    players, setPlayers, updatePlayer, addTeam, updateTeam, removeTeam, simulateSeason, handlePick,
    resetLeague, resetPredictions, completeSeason, upgradeStat, updateOverallRating,
    activeTab, setActiveTab: setActiveTab as any, isSimulating, allocatePlayerStats, user
  };

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
