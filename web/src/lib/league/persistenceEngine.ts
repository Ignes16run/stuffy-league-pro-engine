// Last Updated: 2026-03-22T22:05:00Z
import { supabase } from '@/lib/supabase-client';
import { Team, Player, Game, SeasonHistory, PlayoffGame } from './types';

/**
 * Persistence layer for Stuffy League Pro.
 * Handles both Supabase (Authenticated) and LocalStorage (Guest) sync.
 */

const STORAGE_KEYS = {
  TEAMS: 'stuffy_teams',
  PLAYERS: 'stuffy_players',
  GAMES: 'stuffy_games',
  AWARDS_PHASE: 'stuffy_is_awards_phase',
  SELECTED_AWARDS: 'stuffy_selected_awards',
  AWARD_RESULTS: 'stuffy_award_results',
  AWARD_FINALISTS: 'stuffy_award_finalists'
};

export const PersistenceEngine = {
  
  // --- Teams ---
  async saveTeam(team: Team, userId?: string) {
    if (!userId) {
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]');
      const idx = teams.findIndex((t: Team) => t.id === team.id);
      if (idx !== -1) teams[idx] = team;
      else teams.push(team);
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      return;
    }
    await supabase.from('teams').upsert({ ...team, user_id: userId });
  },

  async deleteTeam(id: string, userId?: string) {
    if (!userId) {
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]');
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams.filter((t: Team) => t.id !== id)));
      return;
    }
    await supabase.from('teams').delete().eq('id', id);
  },

  // --- Players ---
  async savePlayers(players: Player[], userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
      return;
    }
    // Bulk upsert for Supabase
    const dbPlayers = players.map(p => ({
        id: p.id, user_id: userId, team_id: p.teamId, name: p.name,
        position: p.position, rating: p.rating, archetype: p.archetype,
        jersey_number: p.jerseyNumber, profile: p.profile, abilities: p.abilities,
        stats: p.stats, career_stats: p.careerStats,
        awards: p.awards, awards_history: p.awardsHistory
    }));
    await supabase.from('players').upsert(dbPlayers);
  },

  // --- Games ---
  async saveGames(games: Game[], userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
      return;
    }
    const dbGames = games.map(g => ({
        id: g.id, user_id: userId, week: g.week, 
        home_team_id: g.homeTeamId, away_team_id: g.awayTeamId,
        home_score: g.homeScore, away_score: g.awayScore,
        winner_id: g.winnerId, is_tie: g.isTie
    }));
    await supabase.from('games').upsert(dbGames);
  },

  // --- Awards & History ---
  async saveAwardPhase(isPhase: boolean, userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.AWARDS_PHASE, isPhase.toString());
    }
  },

  async saveLeagueHistory(history: SeasonHistory, userId?: string) {
    if (userId) {
        await supabase.from('league_history').insert({
            user_id: userId,
            year: history.year,
            champion_id: history.championId,
            full_standings: history.finalStandings
        });
    }
  },

  async loadAllData(userId?: string) {
    if (!userId) {
      return {
        teams: JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]') as Team[],
        players: JSON.parse(localStorage.getItem(STORAGE_KEYS.PLAYERS) || '[]') as Player[],
        games: JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES) || '[]') as Game[],
        isAwardsPhase: localStorage.getItem(STORAGE_KEYS.AWARDS_PHASE) === 'true',
        selectedAwards: JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_AWARDS) || '{}') as Record<string, string>,
        awardResults: JSON.parse(localStorage.getItem(STORAGE_KEYS.AWARD_RESULTS) || '{}'),
        awardFinalists: JSON.parse(localStorage.getItem(STORAGE_KEYS.AWARD_FINALISTS) || '{}') as Record<string, Player[]>,
        history: [] as SeasonHistory[],
        playoffGames: []
      };
    }

    const { data: dbTeams } = await supabase.from('teams').select('*').eq('user_id', userId);
    const { data: dbPlayers } = await supabase.from('players').select('*').eq('user_id', userId);
    const { data: dbGames } = await supabase.from('games').select('*').eq('user_id', userId);
    const { data: dbPlayoffs } = await supabase.from('playoff_games').select('*').eq('user_id', userId);
    const { data: dbHistory } = await supabase.from('league_history').select('*').eq('user_id', userId).order('year', { ascending: false });

    return {
      teams: (dbTeams || []) as Team[],
      players: (dbPlayers || []).map((p: any) => ({
        id: p.id, teamId: p.team_id, name: p.name, position: p.position,
        rating: p.rating, archetype: p.archetype, jerseyNumber: p.jersey_number,
        profile: p.profile, abilities: p.abilities, stats: p.stats,
        careerStats: p.career_stats, awards: p.awards, awardsHistory: p.awards_history
      })) as Player[],
      games: (dbGames || []).map((g: any) => ({
        id: g.id, week: g.week, homeTeamId: g.home_team_id, awayTeamId: g.away_team_id,
        homeScore: g.home_score, awayScore: g.away_score, winnerId: g.winner_id, isTie: g.is_tie
      })) as Game[],
      playoffGames: (dbPlayoffs || []).map((g: any) => ({
        id: g.id, round: g.round, matchupIndex: g.matchup_index,
        team1Id: g.team1_id, team2Id: g.team2_id, winnerId: g.winner_id, seed1: g.seed1, seed2: g.seed2
      })) as PlayoffGame[],
      history: (dbHistory || []).map((h: any) => ({
        year: h.year, championId: h.champion_id, finalStandings: h.full_standings || []
      })) as SeasonHistory[],
      isAwardsPhase: false,
      selectedAwards: {},
      awardResults: {},
      awardFinalists: {}
    };
  },

  // --- Generic Clean up ---
  async clearAll(userId?: string) {
    if (!userId) {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    } else {
      await Promise.all([
        supabase.from('teams').delete().eq('user_id', userId),
        supabase.from('players').delete().eq('user_id', userId),
        supabase.from('games').delete().eq('user_id', userId),
        supabase.from('playoff_games').delete().eq('user_id', userId),
        supabase.from('league_history').delete().eq('user_id', userId)
      ]);
    }
  }
};
