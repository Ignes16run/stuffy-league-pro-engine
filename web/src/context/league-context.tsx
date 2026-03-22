"use client";
// Last Updated: 2026-03-22T16:50:00Z

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  Team, Game, PlayoffGame, SeasonHistory, Player, PlayerStats, 
  PlayerAward, NarrativeMemoryEntry, AwardsHistoryEntry,
  PlayerPosition, PlayerAbility
} from '@/lib/league/types';
import { generateRoundRobinSchedule, calculateStandings, generateRealisticFootballScore } from '@/lib/league/utils';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from './auth-context';
import { generateTeamRoster, migratePlayerRatings } from '@/lib/league/players';
import { selectNarrativeTemplate, generateNarrative } from '@/lib/league/narratives';
import { AwardType, getAwardFinalists } from '@/lib/league/awards';

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
  finalizeSeason: () => void;
  upgradeStat: (teamId: string, statKey: string) => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('setup');
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
    
    if (!user) {
       const savedTeams = localStorage.getItem('stuffy_teams');
       const savedPlayers = localStorage.getItem('stuffy_players');
       if (savedTeams) setTeams(JSON.parse(savedTeams));
       if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
       
       setIsLoaded(true);
       loadedUserIdRef.current = null;
       isInitialLoadRef.current = false;
       return;
    }
    try {
      const { data: dbTeams } = await supabase.from('teams').select('*').eq('user_id', user.id);
      const { data: dbPlayers } = await supabase.from('players').select('*').eq('user_id', user.id);
      const { data: dbGames } = await supabase.from('games').select('*').eq('user_id', user.id);
      const { data: dbPlayoffs } = await supabase.from('playoff_games').select('*').eq('user_id', user.id);
      const { data: dbHistory } = await supabase.from('league_history').select('*').eq('user_id', user.id).order('year', { ascending: false });
      const { data: dbNarratives } = await supabase.from('narrative_memory').select('*').eq('user_id', user.id);

      if (dbNarratives) setRecentNarrativesUsed(dbNarratives.map((n: Record<string, any>) => ({ templateId: n.template_id, seasonId: n.season_id })));
      
      if (dbTeams) {
        setTeams(dbTeams);
        const teamsWithPlayers = new Set(dbPlayers?.map((p: any) => p.team_id) || []);
        const missingTeams = dbTeams.filter(t => !teamsWithPlayers.has(t.id));
        
        let currentPlayers = dbPlayers ? dbPlayers.map((p: Record<string, any>) => migratePlayerRatings({
          id: p.id, teamId: p.team_id, name: p.name, position: (p.position as PlayerPosition),
          rating: p.rating, profilePicture: p.profile_picture, profile: p.profile,
          archetype: p.archetype, jerseyNumber: p.jersey_number, abilities: (p.abilities as PlayerAbility[]), 
          stats: (p.stats as PlayerStats) || { gamesPlayed: 0 }, 
          careerStats: (p.career_stats as PlayerStats) || { gamesPlayed: 0 },
          awards: (p.awards || []) as PlayerAward[],
          awardsHistory: (p.awards_history || []) as AwardsHistoryEntry[]
        })) : [];

        if (missingTeams.length > 0) {
           const generatedPlayers: Player[] = [];
           for (const team of missingTeams) {
              const roster = generateTeamRoster(team.id);
              generatedPlayers.push(...roster);
              if (user) {
                 await supabase.from('players').insert(roster.map(p => ({
                    id: p.id, user_id: user.id, team_id: p.teamId, name: p.name,
                    position: p.position, rating: p.rating, archetype: p.archetype,
                    jersey_number: p.jerseyNumber, profile: p.profile, abilities: p.abilities,
                    stats: p.stats, career_stats: p.careerStats || { gamesPlayed: 0 },
                    awards: p.awards || [], awards_history: p.awardsHistory || []
                 }))).then();
              }
           }
           currentPlayers = [...currentPlayers, ...generatedPlayers];
        }
        setPlayers(currentPlayers);
      }

      if (dbGames) {
        setGames(dbGames.map((g: Record<string, any>) => ({
          id: g.id, week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id,
          homeScore: g.home_score ?? undefined, awayScore: g.away_score ?? undefined, 
          winnerId: g.winner_id, isTie: g.is_tie
        })));
      }

      if (dbPlayoffs) {
        setPlayoffGames(dbPlayoffs.map((g: Record<string, any>) => ({
          id: g.id, round: g.round, matchupIndex: g.matchup_index,
          team1Id: g.team1_id, team2Id: g.team2_id, winnerId: g.winner_id,
          seed1: g.seed1, seed2: g.seed2
        })));
      }

      if (dbHistory) {
        setHistory(dbHistory.map((h: Record<string, any>) => ({
          year: h.year, championId: h.champion_id, finalStandings: h.full_standings || []
        })));
      }
      
      setIsLoaded(true);
      loadedUserIdRef.current = user.id;
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('Error loading league data:', error);
    }
  }, [user]);

  useEffect(() => {
    loadData();
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

  const setAwardWinner = (category: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    setSelectedAwards(prev => ({ ...prev, [category]: playerId }));

    const seasonId = (history.length + 1).toString();
    const type = category as AwardType;
    const historyEntries = player.awardsHistory || [];

    const template = selectNarrativeTemplate(
      type, player.position, historyEntries, recentNarrativesUsed, seasonId
    );

    if (template) {
      const team = teams.find(t => t.id === player.teamId);
      const statKey = type === 'MVP' ? 'passingYards' : type === 'DPOY' ? 'tackles' : type === 'STPOY' ? 'points' : 'yards';
      const statName = type === 'MVP' ? 'Passing Yards' : type === 'DPOY' ? 'Tackles' : type === 'STPOY' ? 'Points' : 'Total Yards';
      const val = (player.stats as any)[statKey] || 0;
      
      const narrative = generateNarrative(
        player, type, team?.name || 'his team', val, statName, template
      );

      setAwardResults(prev => ({
        ...prev,
        [category]: { winner: player, narrative, statValue: val, statName, templateId: template.id }
      }));
    }
  };

  const simulateSeason = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    
    const unplayedGames = games.filter(g => !g.winnerId && !g.isTie);
    let currentPlayers = [...players];
    const updatedGamesList: Game[] = [];

    for (const game of unplayedGames) {
       const home = teams.find(t => t.id === game.homeTeamId);
       const away = teams.find(t => t.id === game.awayTeamId);
       if (home && away) {
          const { homeScore, awayScore } = generateRealisticFootballScore(home, away, currentPlayers);
          const winnerId = homeScore > awayScore ? home.id : (awayScore > homeScore ? away.id : undefined);
          const updatedGame = { ...game, homeScore, awayScore, winnerId, isTie: homeScore === awayScore };
          updatedGamesList.push(updatedGame);
          
          const gUpdates = currentPlayers.filter(p => p.teamId === home.id || p.teamId === away.id).map(p => {
             const isHome = p.teamId === home.id;
             const score = isHome ? homeScore : awayScore;
             const s = { ...p.stats } as any;
             s.gamesPlayed = (s.gamesPlayed || 0) + 1;
             if (p.position === 'QB') {
               s.passingYards = (s.passingYards || 0) + Math.round(score * 8);
               s.passingTds = (s.passingTds || 0) + Math.floor(score/7);
             } else if (['WR','RB','TE'].includes(p.position)) {
               s.yards = (s.yards || 0) + Math.round(score * 3);
             } else {
               s.tackles = (s.tackles || 0) + Math.floor(Math.random()*5);
             }
             return { ...p, stats: s as PlayerStats };
          });
          currentPlayers = currentPlayers.map(p => gUpdates.find(u => u.id === p.id) || p);
       }
    }

    setGames(prev => prev.map(g => updatedGamesList.find(ug => ug.id === g.id) || g));
    setPlayers(currentPlayers);

    if (user) {
        await Promise.all([
            ...updatedGamesList.map(g => supabase.from('games').update({
                home_score: g.homeScore, away_score: g.awayScore, winner_id: g.winnerId, is_tie: g.isTie
            }).eq('id', g.id)),
            ...currentPlayers.map(p => supabase.from('players').update({ stats: p.stats }).eq('id', p.id))
        ]);
    }
    setIsSimulating(false);
  };

  const resetPredictions = async () => {
    setGames(g => g.map(game => ({ ...game, homeScore: undefined, awayScore: undefined, winnerId: undefined, isTie: false })));
    setPlayers(p => p.map(player => ({ ...player, stats: { gamesPlayed: 0 } as PlayerStats })));
    setPlayoffGames([]);
    if (user) {
      await Promise.all([
        supabase.from('games').update({ home_score: null, away_score: null, winner_id: null, is_tie: false }).eq('user_id', user.id),
        supabase.from('players').update({ stats: { gamesPlayed: 0 } }).eq('user_id', user.id),
        supabase.from('playoff_games').delete().eq('user_id', user.id)
      ]);
    }
  };

  const finalizeSeason = async () => {
    const currentYear = history.length + 1;
    const seasonId = currentYear.toString();
    const newNarrativeMemory: NarrativeMemoryEntry[] = [];

    const finalPlayers = players.map(p => {
       const career = { ...p.stats } as any;
       const oldCareer = (p.careerStats ? { ...p.careerStats } : { gamesPlayed: 0 }) as any;
       
       Object.keys(career).forEach(k => {
          if (typeof career[k] === 'number') oldCareer[k] = (oldCareer[k] || 0) + career[k];
       });

       const newAwards = [...(p.awards || [])];
       const newAwardsHistory = [...(p.awardsHistory || [])];
       let narrativeText = '';

       Object.entries(awardResults).forEach(([cat, res]) => {
          if (res.winner.id === p.id) {
             narrativeText = res.narrative;
             newAwards.push({ year: currentYear, awardType: cat as any, playerTeam: p.teamId, statsAtTime: { ...p.stats } });
             newAwardsHistory.push({ awardType: cat as any, seasonId });
             newNarrativeMemory.push({ templateId: (res as any).templateId, seasonId });
          }
       });

       return { 
          ...p, 
          careerStats: oldCareer as PlayerStats, 
          stats: { gamesPlayed: 0 } as PlayerStats, 
          awards: newAwards,
          awardsHistory: newAwardsHistory,
          profile: narrativeText || p.profile 
       };
    });

    setPlayers(finalPlayers);
    setRecentNarrativesUsed(prev => [...prev, ...newNarrativeMemory]);

    if (user) {
       await Promise.all([
          ...finalPlayers.map(p => supabase.from('players').update({ 
             career_stats: p.careerStats, stats: { gamesPlayed: 0 },
             awards: p.awards, awards_history: p.awardsHistory, profile: p.profile
          }).eq('id', p.id)),
          ...newNarrativeMemory.map(m => supabase.from('narrative_memory').insert({
             user_id: user.id, template_id: m.templateId, season_id: m.seasonId
          }))
       ]);
    }

    setAwardResults({});
    setSelectedAwards({});
    setIsAwardsPhase(false);
    setActiveTab('history');
  };

  const completeSeason = (champId: string) => {
    const champ = teams.find(t => t.id === champId);
    if (!champ) return;
    const year = history.length + 1;
    const standings = calculateStandings(teams, games);
    setHistory(prev => [{ year, championId: champId, finalStandings: standings }, ...prev]);
    if (user) supabase.from('league_history').insert({ user_id: user.id, year, champion_id: champId, full_standings: standings }).then();
    
    setAwardFinalists(getAwardFinalists(players));
    setIsAwardsPhase(true);
  };

  const contextValue: LeagueContextType = {
    teams, players, games, playoffGames, history, activeTab, isSimulating, isLoaded, numWeeks,
    isAwardsPhase, awardFinalists, selectedAwards, awardResults, recentNarrativesUsed,
    setActiveTab, setNumWeeks, setAwardWinner, updatePlayer, completeSeason, finalizeSeason,
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
    },
    addTeam: async (t) => {
        const teamId = crypto.randomUUID();
        const newTeam = { ...t, id: teamId } as Team;
        
        setTeams(prev => {
          const updated = [...prev, newTeam];
          if (!user) localStorage.setItem('stuffy_teams', JSON.stringify(updated));
          
          if (updated.length >= 2) {
             const schedule = generateRoundRobinSchedule(updated, numWeeks);
             setGames(schedule);
             if (!user) {
                localStorage.setItem('stuffy_games', JSON.stringify(schedule));
             } else {
                supabase.from('games').delete().eq('user_id', user.id).then(() => {
                   supabase.from('games').insert(schedule.map(g => ({ 
                      id: g.id, user_id: user.id, week: g.week, 
                      home_team_id: g.homeTeamId, away_team_id: g.awayTeamId 
                   }))).then();
                });
             }
          }
          return updated;
        });
        
        const roster = generateTeamRoster(teamId);
        setPlayers(prev => {
           const updated = [...prev, ...roster];
           if (!user) localStorage.setItem('stuffy_players', JSON.stringify(updated));
           return updated;
        });

        if (user) {
           await supabase.from('teams').insert({ ...newTeam, user_id: user.id });
           await supabase.from('players').insert(roster.map(p => ({
              id: p.id, user_id: user.id, team_id: p.teamId, name: p.name,
              position: p.position, rating: p.rating, archetype: p.archetype,
              jersey_number: p.jerseyNumber, profile: p.profile, abilities: p.abilities,
              stats: p.stats, career_stats: p.careerStats || { gamesPlayed: 0 },
              awards: p.awards || [], awards_history: p.awardsHistory || []
           })));
        }
     },
    updateTeam: async (id, updates) => {
       setTeams(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
       if (user) await supabase.from('teams').update(updates).eq('id', id);
    },
    deleteTeam: async (id) => {
       setTeams(prev => prev.filter(t => t.id !== id));
       if (user) await supabase.from('teams').delete().eq('id', id);
    },
    resetLeague: async () => {
       setTeams([]); setPlayers([]); setGames([]); setPlayoffGames([]); setHistory([]);
       if (user) await Promise.all([
          supabase.from('teams').delete().eq('user_id', user.id),
          supabase.from('players').delete().eq('user_id', user.id),
          supabase.from('games').delete().eq('user_id', user.id),
          supabase.from('playoff_games').delete().eq('user_id', user.id),
          supabase.from('league_history').delete().eq('user_id', user.id)
       ]);
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
    }
  };

  return <LeagueContext.Provider value={contextValue}>{children}</LeagueContext.Provider>;
}

export const useLeague = () => {
  const context = useContext(LeagueContext);
  if (!context) throw new Error('useLeague must be used within a LeagueProvider');
  return context;
}
