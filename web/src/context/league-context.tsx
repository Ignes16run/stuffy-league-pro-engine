"use client";
// Last Updated: 2026-03-21T18:05:00-04:00

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Team, Game, PlayoffGame, SeasonHistory, Player } from '@/lib/league/types';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { generateRoundRobinSchedule, calculateStandings } from '@/lib/league/utils';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from './auth-context';
import { generateTeamRoster } from '@/lib/league/players';

interface LeagueContextType {
  teams: Team[];
  setTeams: (teams: Team[] | ((prev: Team[]) => Team[])) => void;
  games: Game[];
  setGames: (games: Game[] | ((prev: Game[]) => Game[])) => void;
  playoffGames: PlayoffGame[];
  setPlayoffGames: (games: PlayoffGame[] | ((prev: PlayoffGame[]) => PlayoffGame[])) => void;
  history: SeasonHistory[];
  numWeeks: number;
  setNumWeeks: (weeks: number | ((prev: number) => number)) => void;
  players: Player[];
  setPlayers: (players: Player[] | ((prev: Player[]) => Player[])) => void;
  updatePlayer: (id: string, player: Partial<Player>) => void;
  
  // Actions
  addTeam: (team: Team) => void;
  updateTeam: (id: string, team: Partial<Team>) => void;
  removeTeam: (id: string) => void;
  simulateSeason: () => Promise<void>;
  handlePick: (gameId: string, winnerId: string | 'tie') => void;
  resetLeague: () => void;
  resetPredictions: () => void;
  completeSeason: (championId: string) => void;
  upgradeStat: (teamId: string, stat: 'offenseRating' | 'defenseRating' | 'specialTeamsRating') => void;
  updateOverallRating: (teamId: string) => void;
  
  activeTab: string;
  setActiveTab: (tab: 'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history' | 'players') => void;
  isSimulating: boolean;
  isLoaded: boolean;
  syncPlayoffGames: (games: PlayoffGame[]) => Promise<void>;
  allocatePlayerStats: (gameId: string, team1Id: string, team2Id: string, team1Score: number, team2Score: number) => void;
  user: { id: string } | null;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // State variables
  const [teams, setTeams] = useState<Team[]>(DEFAULT_LEAGUE_TEAMS);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [playoffGames, setPlayoffGames] = useState<PlayoffGame[]>([]);
  const [history, setHistory] = useState<SeasonHistory[]>([]);
  const [numWeeks, setNumWeeks] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'setup' | 'season' | 'standings' | 'playoffs' | 'training' | 'history' | 'players'>('setup');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync helpers
  const syncTeam = useCallback(async (team: Team) => {
    if (!user) return;
    await supabase.from('teams').upsert({
      id: team.id, user_id: user.id, name: team.name, icon: team.icon, 
      primary_color: team.primaryColor, secondary_color: team.secondaryColor,
      offense_rating: team.offenseRating, defense_rating: team.defenseRating, 
      special_teams_rating: team.specialTeamsRating, stuffy_points: team.stuffyPoints, 
      all_time_wins: team.allTimeWins, championships: team.championships, logo_url: team.logoUrl
    });
  }, [user]);

  const syncPlayer = useCallback(async (player: Player) => {
    if (!user) return;
    await supabase.from('players').upsert({
      id: player.id, user_id: user.id, team_id: player.teamId,
      name: player.name, position: player.position, rating: player.rating,
      profile_picture: player.profilePicture, profile: player.profile,
      archetype: player.archetype, abilities: player.abilities, stats: player.stats
    });
  }, [user]);

  const syncGame = useCallback(async (game: Game) => {
    if (!user) return;
    await supabase.from('games').upsert({
      id: game.id, user_id: user.id, week: game.week,
      home_team_id: game.homeTeamId, away_team_id: game.awayTeamId,
      winner_id: game.winnerId, is_tie: game.isTie, home_score: game.homeScore, away_score: game.awayScore
    });
  }, [user]);

  const syncPlayoffGame = useCallback(async (game: PlayoffGame) => {
    if (!user) return;
    await supabase.from('playoff_games').upsert({
      id: game.id, user_id: user.id, round: game.round, matchup_index: game.matchupIndex,
      team1_id: game.team1Id, team2_id: game.team2Id, winner_id: game.winnerId,
      seed1: game.seed1, seed2: game.seed2
    });
  }, [user]);

  const syncPlayoffGamesBatch = useCallback(async (gamesArr: PlayoffGame[]) => {
    if (!user) return;
    for (const g of gamesArr) {
      await syncPlayoffGame(g);
    }
  }, [user, syncPlayoffGame]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [
        { data: dbTeams }, 
        { data: dbPlayers }, 
        { data: dbGames },
        { data: dbPlayoffs },
        { data: dbHistory }
      ] = await Promise.all([
        supabase.from('teams').select('*').eq('user_id', user.id),
        supabase.from('players').select('*').eq('user_id', user.id),
        supabase.from('games').select('*').eq('user_id', user.id),
        supabase.from('playoff_games').select('*').eq('user_id', user.id),
        supabase.from('season_history').select('*').eq('user_id', user.id).order('year', { ascending: true })
      ]);
      
      if (dbTeams && dbTeams.length > 0) setTeams(dbTeams.map(t => ({
         id: t.id, name: t.name, icon: t.icon, primaryColor: t.primary_color, secondaryColor: t.secondary_color,
         offenseRating: t.offense_rating, defenseRating: t.defense_rating, specialTeamsRating: t.special_teams_rating,
         stuffyPoints: t.stuffy_points, all_time_wins: t.all_time_wins, championships: t.championships,
         logoUrl: t.logo_url
      })));
      
      if (dbPlayers && dbPlayers.length > 0) {
        setPlayers(dbPlayers.map(p => ({
          id: p.id, teamId: p.team_id, name: p.name, position: p.position,
          rating: p.rating, profilePicture: p.profile_picture, profile: p.profile,
          archetype: p.archetype, abilities: p.abilities, stats: p.stats as any
        })));
      }
      
      if (dbGames && dbGames.length > 0) {
        const mappedGames = dbGames.map(g => ({
          id: g.id, week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id, 
          winnerId: g.winner_id, isTie: g.is_tie, homeScore: g.home_score, awayScore: g.away_score
        })).sort((a, b) => a.week - b.week);
        setGames(mappedGames);
        setNumWeeks(Math.max(...mappedGames.map(g => g.week), 0));
      }

      if (dbPlayoffs && dbPlayoffs.length > 0) {
        setPlayoffGames(dbPlayoffs.map(g => ({
          id: g.id, round: g.round, matchupIndex: g.matchup_index,
          team1Id: g.team_1_id || g.team1_id, team2Id: g.team_2_id || g.team2_id, winnerId: g.winner_id,
          seed1: g.seed1, seed2: g.seed2
        })));
      }

      if (dbHistory && dbHistory.length > 0) {
        setHistory(dbHistory.map(h => ({
          year: h.year, championId: h.champion_id, finalStandings: h.final_standings as any
        })));
      }
    } finally {
      setIsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
    else setIsLoaded(true);
  }, [user, loadData]);

  // Auto-generate schedule if missing
  useEffect(() => {
    if (isLoaded && teams.length >= 2 && games.length === 0) {
      const schedule = generateRoundRobinSchedule(teams);
      setGames(schedule);
      setNumWeeks(Math.max(...schedule.map(g => g.week), 0));
      if (user) schedule.forEach(g => syncGame(g));
    }
  }, [isLoaded, teams, games.length, user, syncGame]);

  // Missing players check
  useEffect(() => {
    if (isLoaded && teams.length > 0) {
      const teamsWithMissingPlayers = teams.filter(t => !players.some(p => p.teamId === t.id));
      if (teamsWithMissingPlayers.length > 0) {
        const newPlayersStack: Player[] = [];
        teamsWithMissingPlayers.forEach(team => {
          const roster = generateTeamRoster(team.id);
          newPlayersStack.push(...roster);
          roster.forEach(p => syncPlayer(p).catch(() => {}));
        });
        setPlayers(prev => [...prev, ...newPlayersStack]);
      }
    }
  }, [isLoaded, teams, players.length, syncPlayer]);

  const addTeam = (team: Team) => {
    setTeams(prev => [...prev, team]);
    const roster = generateTeamRoster(team.id);
    setPlayers(prev => [...prev, ...roster]);
    syncTeam(team);
    roster.forEach(p => syncPlayer(p));
  };

  const updateTeam = (id: string, updatedTeam: Partial<Team>) => {
    setTeams(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updatedTeam } : t);
      const updated = next.find(t => t.id === id);
      if (updated) syncTeam(updated);
      return next;
    });
  };

  const removeTeam = (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    if (user) supabase.from('teams').delete().eq('id', id).eq('user_id', user.id).then();
  };

  const getUpdatedPlayersFromGame = (currentPlayers: Player[], gameId: string, team1Id: string, team2Id: string, team1Score: number, team2Score: number): Player[] => {
    const nextPlayers = currentPlayers.map(p => ({ ...p, stats: { ...p.stats } }));
    const updateTeamStats = (teamId: string, score: number) => {
      const tPlayers = nextPlayers.filter(p => p.teamId === teamId);
      if (tPlayers.length === 0) return;
      tPlayers.forEach(p => {
        p.stats.gamesPlayed = (p.stats.gamesPlayed || 0) + 1;
        const off = ['QB', 'RB', 'WR', 'TE', 'OL', 'K'].includes(p.position);
        const def = ['DL', 'LB', 'DB'].includes(p.position);
        if (off) { p.stats.tackles = 0; p.stats.interceptions = 0; p.stats.sacks = 0; }
        if (def) { p.stats.yards = 0; p.stats.touchdowns = 0; p.stats.points = 0; }
      });
      const qb = tPlayers.find(p => p.position === 'QB');
      const skill = tPlayers.filter(p => ['RB', 'WR', 'TE'].includes(p.position));
      const k = tPlayers.find(p => p.position === 'K');
      const dL = tPlayers.filter(p => p.position === 'DL');
      const lB = tPlayers.filter(p => p.position === 'LB');
      const dB = tPlayers.filter(p => p.position === 'DB');

      const tds = Math.floor(score / 7);
      if (tds > 0) {
        for (let i = 0; i < tds; i++) {
          const target = skill[Math.floor(Math.random() * skill.length)];
          if (target) { target.stats.touchdowns = (target.stats.touchdowns || 0) + 1; target.stats.points = (target.stats.points || 0) + 6; }
        }
        if (qb) qb.stats.touchdowns = (qb.stats.touchdowns || 0) + tds;
      }
      const tyrd = Math.min(score * 15 + Math.floor(Math.random() * 80) + 40, 650);
      if (qb) qb.stats.yards = (qb.stats.yards || 0) + Math.min(Math.floor(tyrd * 0.85), 450);
      let ryrd = tyrd;
      skill.forEach((p, idx) => {
        const share = idx === skill.length - 1 ? ryrd : Math.floor(Math.random() * (ryrd / (skill.length - idx)));
        p.stats.yards = (p.stats.yards || 0) + Math.min(share, 250);
        ryrd -= share;
      });
      dL.forEach(p => { p.stats.tackles = (p.stats.tackles || 0) + Math.floor(Math.random() * 4) + 1; if (Math.random() < 0.15) p.stats.sacks = (p.stats.sacks || 0) + 1; });
      lB.forEach(p => { p.stats.tackles = (p.stats.tackles || 0) + Math.floor(Math.random() * 10) + 3; if (Math.random() < 0.08) p.stats.sacks = (p.stats.sacks || 0) + 1; });
      dB.forEach(p => { p.stats.tackles = (p.stats.tackles || 0) + Math.floor(Math.random() * 6) + 2; if (Math.random() < 0.12) p.stats.interceptions = (p.stats.interceptions || 0) + 1; });
      if (k) k.stats.points = (k.stats.points || 0) + (Math.floor((score % 7)/3) * 3) + tds;
    };
    updateTeamStats(team1Id, team1Score);
    updateTeamStats(team2Id, team2Score);
    return nextPlayers;
  };

  const handlePick = (gameId: string, winnerId: string | 'tie') => {
    const isTie = winnerId === 'tie';
    if (gameId.startsWith('round-')) {
      setPlayoffGames(prev => {
        const game = prev.find(g => g.id === gameId);
        if (!game) return prev;
        const isDeselecting = game.winnerId === winnerId;
        const newVal = isDeselecting ? undefined : (winnerId as string);
        const updated = prev.map(g => g.id === gameId ? { ...g, winnerId: newVal } : g);
        const wSeed = winnerId === game.team1Id ? game.seed1 : game.seed2;
        const nextR = game.round + 1;
        const nextIdx = Math.floor(game.matchupIndex / 2);
        const isHome = game.matchupIndex % 2 === 0;

        const result = updated.map(g => {
          if (g.round === nextR && g.matchupIndex === nextIdx) {
            return {
              ...g,
              [isHome ? 'team1Id' : 'team2Id']: newVal,
              [isHome ? 'seed1' : 'seed2']: newVal ? wSeed : undefined
            };
          }
          return g;
        });

        const changedCurrent = result.find(g => g.id === gameId);
        if (changedCurrent) syncPlayoffGame(changedCurrent);
        const changedNext = result.find(g => g.round === nextR && g.matchupIndex === nextIdx);
        if (changedNext) syncPlayoffGame(changedNext);

        return result;
      });
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
      const loserScore = Math.max(0, Math.floor(Math.random() * (winnerScore - 7)) + 3);
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
      setPlayers(prev => {
        const next = getUpdatedPlayersFromGame(
          prev, gameId, game.homeTeamId, game.awayTeamId, 
          nextGameData.homeScore!, nextGameData.awayScore!
        );
        if (user) {
          next.filter(p => p.teamId === game.homeTeamId || p.teamId === game.awayTeamId).forEach(p => syncPlayer(p).catch(()=>{}));
        }
        return next;
      });
    }
  };

  const simulateSeason = async () => {
    setIsSimulating(true);
    const unplayedGames = games.filter(g => !g.winnerId && !g.isTie);
    let newGames = [...games];
    let nextPlayers = [...players];
    
    for (let i = 0; i < unplayedGames.length; i++) {
        const gameIdx = newGames.findIndex(g => g.id === unplayedGames[i].id);
        const game = newGames[gameIdx];
        const hTeam = teams.find(t => t.id === game.homeTeamId);
        const aTeam = teams.find(t => t.id === game.awayTeamId);
        
        if (hTeam && aTeam) {
            const hRating = hTeam.offenseRating || 75;
            const aRating = aTeam.offenseRating || 75;
            const hWinProb = (hRating + 3) / (hRating + aRating + 3);
            const roll = Math.random();
            
            let res;
            if (roll < 0.05) {
                const s = Math.floor(Math.random() * 21) + 7;
                res = { winnerId: undefined, isTie: true, homeScore: s, awayScore: s };
            } else {
                const wId = roll < hWinProb ? game.homeTeamId : game.awayTeamId;
                const wRating = wId === game.homeTeamId ? hRating : aRating;
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
            
            nextPlayers = getUpdatedPlayersFromGame(
                nextPlayers, game.id, game.homeTeamId, game.awayTeamId, 
                updated.homeScore!, updated.awayScore!
            );
        }

        if (i % 8 === 0) {
            setGames([...newGames]);
            setPlayers([...nextPlayers]);
            await new Promise(r => setTimeout(r, 40));
        }
    }

    setGames([...newGames]);
    setPlayers([...nextPlayers]);
    if (user) nextPlayers.forEach(p => syncPlayer(p).catch(()=>{}));
    setIsSimulating(false);
  };

  const completeSeason = (championId: string) => {
    const stands = calculateStandings(teams, games);
    const entry: SeasonHistory = { year: history.length + 2024, championId, finalStandings: stands };
    setHistory(prev => [...prev, entry]);
    if (user) supabase.from('season_history').insert({ user_id: user.id, year: entry.year, champion_id: championId, final_standings: stands }).then();
    
    setTeams(prev => prev.map(t => {
      const wins = games.filter(g => g.winnerId === t.id).length;
      const chmp = t.id === championId;
      const updated = { ...t, stuffyPoints: (t.stuffyPoints || 0) + (wins * 2) + (chmp ? 20 : 0), allTimeWins: (t.allTimeWins || 0) + wins, championships: (t.championships || 0) + (chmp ? 1 : 0) };
      syncTeam(updated);
      return updated;
    }));
    setGames(prev => prev.map(g => ({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined })));
    setPlayoffGames([]);
    if (user) {
        supabase.from('playoff_games').delete().eq('user_id', user.id).then();
        games.forEach(g => syncGame({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined }));
    }
    setActiveTab('history');
  };

  const resetPredictions = () => {
    setGames(prev => prev.map(g => ({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined })));
    setPlayoffGames([]);
    if (user) {
        supabase.from('playoff_games').delete().eq('user_id', user.id).then();
        games.forEach(g => syncGame({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined }));
    }
  };

  const resetLeague = async () => {
    setTeams(DEFAULT_LEAGUE_TEAMS);
    setGames([]);
    setPlayoffGames([]);
    setPlayers([]);
    setHistory([]);
    if (user) {
        await Promise.all([
            supabase.from('teams').delete().eq('user_id', user.id),
            supabase.from('players').delete().eq('user_id', user.id),
            supabase.from('games').delete().eq('user_id', user.id),
            supabase.from('playoff_games').delete().eq('user_id', user.id),
            supabase.from('season_history').delete().eq('user_id', user.id)
        ]);
        DEFAULT_LEAGUE_TEAMS.forEach(t => syncTeam(t));
    }
    setActiveTab('setup');
  };

  const upgradeStat = (tId: string, s: any) => {
      const team = teams.find(t => t.id === tId);
      if (team && (team.stuffyPoints || 0) >= 50 && (team[s as keyof Team] as number) < 99) {
          updateTeam(tId, { [s]: (team[s as keyof Team] as number) + 1, stuffyPoints: (team.stuffyPoints || 0) - 50 });
      }
  };

  const updateOverallRating = (tId: string) => {
      const tps = players.filter(p => p.teamId === tId);
      if (tps.length > 0) updateTeam(tId, { overallRating: Math.round(tps.reduce((a,b)=>a+b.rating,0)/tps.length) });
  };

  const allocatePlayerStats = (id: string, t1: string, t2: string, s1: number, s2: number) => {
      setPlayers(prev => {
          const next = getUpdatedPlayersFromGame(prev, id, t1, t2, s1, s2);
          if (user) next.filter(p => p.teamId === t1 || p.teamId === t2).forEach(p => syncPlayer(p).catch(()=>{}));
          return next;
      });
  };

  const value = {
    teams, setTeams, games, setGames, playoffGames, setPlayoffGames, history, numWeeks, setNumWeeks,
    players, setPlayers, 
    updatePlayer: (id: string, p: Partial<Player>) => {
        setPlayers(prev => { 
            const next = prev.map(x => x.id === id ? { ...x, ...p } : x); 
            const upd = next.find(x => x.id === id);
            if (upd) syncPlayer(upd);
            return next;
        });
    }, 
    addTeam, updateTeam, removeTeam, simulateSeason, handlePick,
    resetLeague, resetPredictions, completeSeason, upgradeStat, updateOverallRating,
    activeTab, setActiveTab: setActiveTab as (t: string) => void, 
    isSimulating, isLoaded, syncPlayoffGames: syncPlayoffGamesBatch, allocatePlayerStats,
    user
  };

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
