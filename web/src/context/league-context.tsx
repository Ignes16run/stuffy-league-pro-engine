"use client";
// Last Updated: 2026-03-22T05:50:00-04:00

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Team, Game, PlayoffGame, SeasonHistory, Player, PlayerStats, Standing } from '@/lib/league/types';
import { DEFAULT_LEAGUE_TEAMS } from '@/lib/league/constants';
import { generateRoundRobinSchedule, calculateStandings, generateRealisticFootballScore } from '@/lib/league/utils';
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
  const scheduleRef = useRef<boolean>(false);
  
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
  const syncTeams = useCallback(async (teamsArr: Team[]) => {
    if (!user) return;
    const data = teamsArr.map(t => ({
      id: t.id, user_id: user.id, name: t.name, icon: t.icon, 
      primary_color: t.primaryColor, secondary_color: t.secondaryColor,
      offense_rating: t.offenseRating, defense_rating: t.defenseRating, 
      special_teams_rating: t.specialTeamsRating, 
      stuffy_points: t.stuffyPoints, all_time_wins: t.allTimeWins, 
      championships: t.championships, logo_url: t.logoUrl
    }));
    await supabase.from('teams').upsert(data);
  }, [user]);

  const syncPlayers = useCallback(async (playersArr: Player[]) => {
    if (!user) return;
    const chunks = [];
    for (let i = 0; i < playersArr.length; i += 100) {
      chunks.push(playersArr.slice(i, i + 100));
    }
    for (const chunk of chunks) {
      const data = chunk.map(p => ({
        id: p.id, user_id: user.id, team_id: p.teamId,
        name: p.name, position: p.position, rating: p.rating,
        profile_picture: p.profilePicture, profile: p.profile,
        archetype: p.archetype, abilities: p.abilities, stats: p.stats,
        jersey_number: p.jerseyNumber
      }));
      await supabase.from('players').upsert(data);
    }
  }, [user]);

  const syncGames = useCallback(async (gamesArr: Game[]) => {
    if (!user) return;
    const data = gamesArr.map(g => ({
      id: g.id, user_id: user.id, week: g.week,
      home_team_id: g.homeTeamId, away_team_id: g.awayTeamId,
      winner_id: g.winnerId, is_tie: g.isTie, home_score: g.homeScore, away_score: g.awayScore
    }));
    await supabase.from('games').upsert(data);
  }, [user]);

  const syncPlayoffGames = useCallback(async (gamesArr: PlayoffGame[]) => {
    if (!user) return;
    const data = gamesArr.map(g => ({
      id: g.id, user_id: user.id, round: g.round, matchup_index: g.matchupIndex,
      team1_id: g.team1Id, team2_id: g.team2Id, winner_id: g.winnerId,
      seed1: g.seed1, seed2: g.seed2
    }));
    await supabase.from('playoff_games').upsert(data);
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user && scheduleRef.current) return; // For anonymous users, only load once
    if (user && scheduleRef.current) return; // For logged-in users, only load once

    scheduleRef.current = true;
    
    if (!user) {
      // For anonymous users, ensure defaults are set (Teams, Players, and Schedule)
      const schedule = generateRoundRobinSchedule(DEFAULT_LEAGUE_TEAMS);
      const newPlayers: Player[] = [];
      DEFAULT_LEAGUE_TEAMS.forEach(team => {
        newPlayers.push(...generateTeamRoster(team.id));
      });
      
      setTeams(DEFAULT_LEAGUE_TEAMS);
      setPlayers(newPlayers);
      setGames(schedule);
      setNumWeeks(Math.max(...schedule.map(g => g.week), 0));
      setIsLoaded(true);
      return;
    }
    
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
      
      let finalTeams = DEFAULT_LEAGUE_TEAMS;
      let finalPlayers: Player[] = [];
      let finalGames: Game[] = [];

      // Teams Hydration
      if (dbTeams && dbTeams.length > 0) {
        finalTeams = dbTeams.map(t => ({
          id: t.id, name: t.name, icon: t.icon, primaryColor: t.primary_color, secondaryColor: t.secondary_color,
          offenseRating: t.offense_rating, defenseRating: t.defense_rating, specialTeamsRating: t.special_teams_rating,
          stuffyPoints: t.stuffy_points, allTimeWins: t.all_time_wins, championships: t.championships,
          logoUrl: t.logo_url
        }));
        setTeams(finalTeams);
      } else {
        // First time user: Seed teams to DB
        await syncTeams(DEFAULT_LEAGUE_TEAMS);
        setTeams(DEFAULT_LEAGUE_TEAMS); // Trigger state update
      }
      
      // Players Hydration
      if (dbPlayers && dbPlayers.length > 0) {
        finalPlayers = dbPlayers.map(p => ({
          id: p.id, teamId: p.team_id, name: p.name, position: p.position,
          rating: p.rating, profilePicture: p.profile_picture, profile: p.profile,
          archetype: p.archetype, jerseyNumber: p.jersey_number, abilities: p.abilities, stats: p.stats as PlayerStats
        }));
        setPlayers(finalPlayers);
      } else {
        // Generate and seed rosters
        const newPlayers: Player[] = [];
        finalTeams.forEach(team => {
          newPlayers.push(...generateTeamRoster(team.id));
        });
        setPlayers(newPlayers);
        await syncPlayers(newPlayers);
      }
      
      // Games Hydration
      if (dbGames && dbGames.length > 0) {
        finalGames = dbGames.map(g => ({
          id: g.id, week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id, 
          winnerId: g.winner_id, isTie: g.is_tie, homeScore: g.home_score, awayScore: g.away_score
        })).sort((a, b) => a.week - b.week);
        setGames(finalGames);
        setNumWeeks(Math.max(...finalGames.map(g => g.week), 0));
      } else {
        // Generate schedule
        const schedule = generateRoundRobinSchedule(finalTeams);
        setGames(schedule);
        setNumWeeks(Math.max(...schedule.map(g => g.week), 0));
        await syncGames(schedule);
      }

      if (dbPlayoffs && dbPlayoffs.length > 0) {
        setPlayoffGames(dbPlayoffs.map(g => ({
          id: g.id, round: g.round, matchupIndex: g.matchup_index,
          team1Id: g.team1_id, team2Id: g.team2_id, winnerId: g.winner_id,
          seed1: g.seed1, seed2: g.seed2
        })));
      }

      if (dbHistory && dbHistory.length > 0) {
        setHistory(dbHistory.map(h => ({
          year: h.year, championId: h.champion_id, finalStandings: h.final_standings as Standing[]
        })));
      }
    } catch (e) {
      console.error("League Hydration Error:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [user, syncTeams, syncPlayers, syncGames]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addTeam = async (team: Team) => {
    setTeams(prev => [...prev, team]);
    const roster = generateTeamRoster(team.id);
    setPlayers(prev => [...prev, ...roster]);
    await syncTeams([team]);
    await syncPlayers(roster);
  };

  const updateTeam = async (id: string, updatedTeam: Partial<Team>) => {
    setTeams(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updatedTeam } : t);
      const updated = next.find(t => t.id === id);
      if (updated && user) void syncTeams([updated]); // Use void to explicitly ignore Promise
      return next;
    });
  };

  const removeTeam = async (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
    if (user) await supabase.from('teams').delete().eq('id', id).eq('user_id', user.id);
  };

  const getUpdatedPlayersFromGame = (currentPlayers: Player[], gameId: string, team1Id: string, team2Id: string, team1Score: number, team2Score: number): Player[] => {
    const nextPlayers = currentPlayers.map(p => ({ ...p, stats: { ...p.stats } }));
    
    // Add games played
    nextPlayers.filter(p => p.teamId === team1Id || p.teamId === team2Id).forEach(p => {
      p.stats.gamesPlayed = (p.stats.gamesPlayed || 0) + 1;
    });

    const updateTeamStats = (offTeamId: string, defTeamId: string, score: number) => {
      const offPlayers = nextPlayers.filter(p => p.teamId === offTeamId);
      const defPlayers = nextPlayers.filter(p => p.teamId === defTeamId);
      if (offPlayers.length === 0) return;

      const qb = offPlayers.find(p => p.position === 'QB');
      const rbs = offPlayers.filter(p => p.position === 'RB');
      const receivers = offPlayers.filter(p => ['WR', 'TE'].includes(p.position));
      const k = offPlayers.find(p => p.position === 'K');

      const dl = defPlayers.filter(p => p.position === 'DL');
      const lb = defPlayers.filter(p => p.position === 'LB');
      const db = defPlayers.filter(p => p.position === 'DB');

      const tds = Math.floor(score / 7);
      let passTds = 0;
      let rushTds = 0;
      for (let i = 0; i < tds; i++) {
        if (Math.random() > 0.4) {
          passTds++;
        } else {
          rushTds++;
        }
      }

      const totalYards = Math.min(score * 15 + Math.floor(Math.random() * 80), 550);
      const passYards = Math.floor(totalYards * 0.65);
      const rushYards = totalYards - passYards;

      // Passing Logic
      if (qb) {
        qb.stats.passingTds = (qb.stats.passingTds || 0) + passTds;
        qb.stats.passingYards = (qb.stats.passingYards || 0) + passYards;
        
        // 25 to 45 attempts based on passing yards
        let attempts = Math.floor(Math.random() * 10) + 25; 
        if (passYards > 300) attempts += 10;
        const completions = Math.floor(attempts * (0.55 + (qb.rating / 500))); 
        const gamePct = (completions / attempts) * 100;

        qb.stats.completionPct = qb.stats.completionPct 
          ? Math.round(((qb.stats.completionPct + gamePct) / 2) * 10) / 10 
          : Math.round(gamePct * 10) / 10;

        // Receiving logic
        let remainingPassYards = passYards;
        let remainingRec = completions;
        receivers.forEach((p, idx) => {
           let share = 0;
           let recShare = 0;
           if (idx === receivers.length - 1) {
             share = remainingPassYards;
             recShare = remainingRec;
           } else {
             // Try to weight WR1 more
             const weight = idx === 0 ? 0.4 : (1 / (receivers.length - idx));
             share = Math.floor(remainingPassYards * weight);
             recShare = Math.floor(remainingRec * weight);
           }
           p.stats.receivingYards = (p.stats.receivingYards || 0) + Math.max(0, share);
           p.stats.receptions = (p.stats.receptions || 0) + Math.max(0, recShare);
           p.stats.yards = (p.stats.yards || 0) + Math.max(0, share); // generic fallback
           remainingPassYards -= share;
           remainingRec -= recShare;
        });

        // Receiving TDs
        for (let i = 0; i < passTds; i++) {
           const target = receivers[Math.floor(Math.random() * receivers.length)];
           if (target) {
              target.stats.receivingTds = (target.stats.receivingTds || 0) + 1;
              target.stats.touchdowns = (target.stats.touchdowns || 0) + 1;
              target.stats.points = (target.stats.points || 0) + 6;
           }
        }
        
        // Interceptions Thrown -> caught by DB
        const ints = Math.random() < 0.15 ? (Math.random() < 0.3 ? 2 : 1) : 0;
        if (ints > 0) {
           qb.stats.interceptionsThrown = (qb.stats.interceptionsThrown || 0) + ints;
           for(let i = 0; i < ints; ++i) {
             const defDB = db[Math.floor(Math.random() * db.length)];
             if (defDB) defDB.stats.interceptions = (defDB.stats.interceptions || 0) + 1;
           }
        }
      }

      // Rushing logic
      let remainingRushYards = rushYards;
      let remainingCarries = Math.floor(Math.random() * 10) + 20; // 20-30 carries
      if (rbs.length > 0) {
        rbs.forEach((p, idx) => {
           const share = idx === rbs.length - 1 ? remainingRushYards : Math.floor(remainingRushYards * 0.7);
           const carryShare = idx === rbs.length - 1 ? remainingCarries : Math.floor(remainingCarries * 0.7);
           p.stats.rushingYards = (p.stats.rushingYards || 0) + Math.max(0, share);
           p.stats.yards = (p.stats.yards || 0) + Math.max(0, share);
           p.stats.carries = (p.stats.carries || 0) + Math.max(0, carryShare);
           remainingRushYards -= share;
           remainingCarries -= carryShare;
        });

        // Rushing TDs
        for (let i = 0; i < rushTds; i++) {
           const target = rbs[0]; // mostly given to rb1
           if (target) {
              target.stats.rushingTds = (target.stats.rushingTds || 0) + 1;
              target.stats.touchdowns = (target.stats.touchdowns || 0) + 1;
              target.stats.points = (target.stats.points || 0) + 6;
           }
        }
      }

      // Defense Stats Calculation
      // Sacks generated based on pass attempts
      const totalSacks = Math.floor(Math.random() * 5); // 0-4 sacks
      for (let i = 0; i < totalSacks; i++) {
         const isDL = Math.random() > 0.3; // DL gets 70% of sacks, LB 30%
         const targetList = isDL && dl.length ? dl : (lb.length ? lb : null);
         if (targetList) {
             const defPlayer = targetList[Math.floor(Math.random() * targetList.length)];
             defPlayer.stats.sacks = (defPlayer.stats.sacks || 0) + 1;
             defPlayer.stats.tacklesForLoss = (defPlayer.stats.tacklesForLoss || 0) + 1;
             defPlayer.stats.tackles = (defPlayer.stats.tackles || 0) + 1;
         }
      }

      // Pass Deflections
      const totalPds = Math.floor(Math.random() * 8); // 0-7 pd
      for (let i = 0; i < totalPds; i++) {
         if (db.length) {
             const defDB = db[Math.floor(Math.random() * db.length)];
             defDB.stats.passDeflections = (defDB.stats.passDeflections || 0) + 1;
         }
      }

      // General Tackles & TFL
      defPlayers.forEach(p => {
         let tackles = Math.floor(Math.random() * 4) + 1; // 1-4 base
         if (p.position === 'LB') tackles += Math.floor(Math.random() * 5); // LB 1-9
         if (p.position === 'DB') tackles += Math.floor(Math.random() * 4); // DB 1-8
         p.stats.tackles = (p.stats.tackles || 0) + tackles;

         if (['DL', 'LB'].includes(p.position) && Math.random() < 0.2) {
             p.stats.tacklesForLoss = (p.stats.tacklesForLoss || 0) + 1;
             p.stats.tackles = (p.stats.tackles || 0) + 1; // TFL implies a tackle
         }
      });

      // Kicker
      if (k) {
        k.stats.points = (k.stats.points || 0) + (Math.floor((score % 7)/3) * 3) + tds;
      }
    };

    updateTeamStats(team1Id, team2Id, team1Score);
    updateTeamStats(team2Id, team1Id, team2Score);
    
    return nextPlayers;
  };

  const handlePick = async (gameId: string, winnerId: string | 'tie') => {
    const isTie = winnerId === 'tie';
    if (gameId.startsWith('round-')) {
      // Playoff Game Pick
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

        // Sync changes
        void syncPlayoffGames(result.filter(g => g.id === gameId || (g.round === nextR && g.matchupIndex === nextIdx)));
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
      const score = generateRealisticFootballScore(24);
      nextGameData = { winnerId: undefined, isTie: true, homeScore: score, awayScore: score };
    } else {
      const winnerScore = generateRealisticFootballScore(28);
      const loserScore = Math.min(winnerScore - 1, generateRealisticFootballScore(18));
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
      if (updated) void syncGames([updated]);
      return next;
    });

    if (!isDeselecting && nextGameData.homeScore !== undefined) {
      setPlayers(prev => {
        const next = getUpdatedPlayersFromGame(prev, gameId, game.homeTeamId, game.awayTeamId, nextGameData.homeScore!, nextGameData.awayScore!);
        void syncPlayers(next.filter(p => p.teamId === game.homeTeamId || p.teamId === game.awayTeamId));
        return next;
      });
    }
  };

  const simulateSeason = async () => {
    setIsSimulating(true);
    const unplayed = games.filter(g => !g.winnerId && !g.isTie);
    const currentGames = [...games];
    let currentPlayers = [...players];

    for (let i = 0; i < unplayed.length; i++) {
      const gameIdx = currentGames.findIndex(g => g.id === unplayed[i].id);
      const game = currentGames[gameIdx];
      
      const homeTeam = teams.find(t => t.id === game.homeTeamId);
      const awayTeam = teams.find(t => t.id === game.awayTeamId);
      
      if (homeTeam && awayTeam) {
        const hR = homeTeam.offenseRating || 75;
        const aR = awayTeam.offenseRating || 75;
        const winProb = (hR + 3) / (hR + aR + 3);
        const roll = Math.random();
        
        let res;
        if (roll < 0.05) {
          const s = generateRealisticFootballScore(24);
          res = { winnerId: undefined, isTie: true, homeScore: s, awayScore: s };
        } else {
          const winnerId = roll < winProb ? game.homeTeamId : game.awayTeamId;
          const wR = winnerId === game.homeTeamId ? hR : aR;
          const wS = generateRealisticFootballScore(wR / 2);
          const lS = Math.min(wS - 1, generateRealisticFootballScore(wR / 3));
          res = {
            winnerId, isTie: false,
            homeScore: winnerId === game.homeTeamId ? wS : lS,
            awayScore: winnerId === game.awayTeamId ? wS : lS
          };
        }

        const updated = { ...game, ...res };
        currentGames[gameIdx] = updated;
        
        currentPlayers = getUpdatedPlayersFromGame(currentPlayers, game.id, game.homeTeamId, game.awayTeamId, updated.homeScore!, updated.awayScore!);
      }

      if (i % 5 === 0) {
        setGames([...currentGames]);
        setPlayers([...currentPlayers]);
        await new Promise(r => setTimeout(r, 30));
      }
    }

    setGames(currentGames);
    setPlayers(currentPlayers);
    if (user) {
      await syncGames(currentGames);
      await syncPlayers(currentPlayers);
    }
    setIsSimulating(false);
  };

  const completeSeason = async (championId: string) => {
    const stands = calculateStandings(teams, games);
    const year = 2024 + history.length;
    const entry: SeasonHistory = { year, championId, finalStandings: stands };
    
    setHistory(prev => [...prev, entry]);
    if (user) {
      await supabase.from('season_history').insert({ user_id: user.id, year, champion_id: championId, final_standings: stands });
    }
    
    const updatedTeams = teams.map(t => {
      const wins = games.filter(g => g.winnerId === t.id).length;
      const chmp = t.id === championId;
      return { 
        ...t, 
        stuffyPoints: (t.stuffyPoints || 0) + (wins * 2) + (chmp ? 20 : 0),
        allTimeWins: (t.allTimeWins || 0) + wins,
        championships: (t.championships || 0) + (chmp ? 1 : 0)
      };
    });
    
    setTeams(updatedTeams);
    await syncTeams(updatedTeams);
    
    // Reset for next year
    setGames(prev => prev.map(g => ({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined })));
    setPlayoffGames([]);
    if (user) {
      await supabase.from('games').update({ winner_id: null, is_tie: false, home_score: null, away_score: null }).eq('user_id', user.id);
      await supabase.from('playoff_games').delete().eq('user_id', user.id);
    }
    setActiveTab('history');
  };

  const resetPredictions = async () => {
    setGames(prev => prev.map(g => ({ ...g, winnerId: undefined, isTie: false, homeScore: undefined, awayScore: undefined })));
    setPlayoffGames([]);
    if (user) {
        await supabase.from('games').update({ winner_id: null, is_tie: false, home_score: null, away_score: null }).eq('user_id', user.id);
        await supabase.from('playoff_games').delete().eq('user_id', user.id);
    }
  };

  const resetLeague = async () => {
    if (!user) return;
    await Promise.all([
      supabase.from('teams').delete().eq('user_id', user.id),
      supabase.from('players').delete().eq('user_id', user.id),
      supabase.from('games').delete().eq('user_id', user.id),
      supabase.from('playoff_games').delete().eq('user_id', user.id),
      supabase.from('season_history').delete().eq('user_id', user.id)
    ]);
    window.location.reload(); // Force full hydration from defaults
  };

  const upgradeStat = (tId: string, s: 'offenseRating' | 'defenseRating' | 'specialTeamsRating') => {
    const team = teams.find(t => t.id === tId);
    if (team && (team.stuffyPoints || 0) >= 50) {
      updateTeam(tId, { [s]: (team[s as keyof Team] as number) + 1, stuffyPoints: (team.stuffyPoints || 0) - 50 });
    }
  };

  const value = {
    teams, setTeams, games, setGames, playoffGames, setPlayoffGames, history, numWeeks, setNumWeeks,
    players, setPlayers, updatePlayer: (id: string, p: Partial<Player>) => {
      setPlayers(prev => {
        const next = prev.map(pl => pl.id === id ? { ...pl, ...p } : pl);
        const upd = next.find(pl => pl.id === id);
        if (upd) void syncPlayers([upd]);
        return next;
      });
    },
    addTeam, updateTeam, removeTeam, simulateSeason, handlePick,
    resetLeague, resetPredictions, completeSeason, upgradeStat, 
    updateOverallRating: (tId: string) => {
      const p = players.filter(pl => pl.teamId === tId);
      if (p.length > 0) updateTeam(tId, { overallRating: Math.round(p.reduce((a,b)=>a+b.rating,0)/p.length) });
    },
    activeTab, setActiveTab,
    isSimulating, isLoaded, syncPlayoffGames, allocatePlayerStats: (id: string, t1: string, t2: string, s1: number, s2: number) => {
        setPlayers(prev => {
            const next = getUpdatedPlayersFromGame(prev, id, t1, t2, s1, s2);
            void syncPlayers(next.filter(p => p.teamId === t1 || p.teamId === t2));
            return next;
        });
    },
    user
  };

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague() {
  const context = useContext(LeagueContext);
  if (context === undefined) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
