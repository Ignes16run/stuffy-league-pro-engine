// Last Updated: 2026-03-23T01:00:00Z
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

const VALID_COLUMNS = {
  teams: ['id', 'user_id', 'name', 'icon', 'primary_color', 'secondary_color', 'logo_url', 'offense_rating', 'defense_rating', 'special_teams_rating', 'stuffy_points', 'all_time_wins', 'championships'],
  players: ['id', 'user_id', 'team_id', 'name', 'profile_picture', 'profile', 'archetype', 'position', 'rating', 'abilities', 'stats', 'career_stats', 'awards', 'awards_history', 'jersey_number'],
  games: ['id', 'user_id', 'week', 'home_team_id', 'away_team_id', 'winner_id', 'home_score', 'away_score', 'is_tie'],
  playoff_games: ['id', 'user_id', 'round', 'matchup_index', 'team1_id', 'team2_id', 'winner_id', 'seed1', 'seed2', 'team1_score', 'team2_score'],
  league_history: ['user_id', 'year', 'champion_id', 'full_standings']
};

/**
 * Normalizes camelCase objects to snake_case and filters for valid DB columns.
 */
function normalizePayload(obj: Record<string, unknown>, table: keyof typeof VALID_COLUMNS) {
  const normalized: Record<string, unknown> = {};
  const validCols = VALID_COLUMNS[table];
  
  Object.entries(obj).forEach(([key, val]) => {
    // Convert camelCase to snake_case
    const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (validCols.includes(dbKey)) {
      normalized[dbKey] = val;
    }
  });
  
  return normalized;
}

async function handleSupabaseRequest(request: unknown, actionLabel: string, payload?: unknown) {
  console.log(`[Supabase] ${actionLabel} - Payload:`, payload);
  const result = (await request) as { data: unknown; error: { message: string; details?: string; hint?: string } };
  if (result.error) {
    console.error(`[Supabase Error] ${actionLabel}:`, result.error.message, result.error.details, result.error.hint);
    throw new Error(`Supabase ${actionLabel} failed: ${result.error.message}`);
  }
  return result.data;
}

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
    const dbTeam = normalizePayload({ ...team, user_id: userId }, 'teams');
    await handleSupabaseRequest(
      supabase.from('teams').upsert(dbTeam),
      'saveTeam',
      dbTeam
    );
  },

  async saveTeams(teams: Team[], userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
      return;
    }
    const dbTeams = teams.map(t => normalizePayload({ ...t, user_id: userId }, 'teams'));
    await handleSupabaseRequest(
      supabase.from('teams').upsert(dbTeams),
      'saveTeams',
      `Bulk upsert of ${dbTeams.length} teams`
    );
  },

  async deleteTeam(id: string, userId?: string) {
    if (!userId) {
      const teams = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEAMS) || '[]');
      localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams.filter((t: Team) => t.id !== id)));
      return;
    }
    await handleSupabaseRequest(
      supabase.from('teams').delete().eq('id', id),
      'deleteTeam',
      { id }
    );
  },

  // --- Players ---
  async savePlayers(players: Player[], userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
      return;
    }
    // Bulk upsert for Supabase
    const dbPlayers = players.map(p => normalizePayload({ ...p, user_id: userId, team_id: p.teamId }, 'players'));
    await handleSupabaseRequest(
      supabase.from('players').upsert(dbPlayers),
      'savePlayers',
      `Bulk upsert of ${dbPlayers.length} players`
    );
  },

  // --- Games ---
  async saveGames(games: Game[], userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
      return;
    }
    const dbGames = games.map(g => normalizePayload({ ...g, user_id: userId }, 'games'));
    await handleSupabaseRequest(
      supabase.from('games').upsert(dbGames),
      'saveGames',
      `Bulk upsert of ${dbGames.length} games`
    );
  },

  async savePlayoffGames(games: PlayoffGame[], userId?: string) {
    if (!userId) {
      // Handled by generic local persistent state in LeagueProvider usually, 
      // but for consistency:
      localStorage.setItem('stuffy_playoff_games', JSON.stringify(games));
      return;
    }
    const dbGames = games.map(g => normalizePayload({ ...g, user_id: userId }, 'playoff_games'));
    await handleSupabaseRequest(
      supabase.from('playoff_games').upsert(dbGames),
      'savePlayoffGames',
      `Bulk upsert of ${dbGames.length} playoff games`
    );
  },

  // --- Awards & History ---
  async saveAwardPhase(isPhase: boolean, userId?: string) {
    if (!userId) {
      localStorage.setItem(STORAGE_KEYS.AWARDS_PHASE, isPhase.toString());
    }
  },

  async saveLeagueHistory(history: SeasonHistory, userId?: string) {
    if (userId) {
        const dbHistory = normalizePayload({
            ...history,
            user_id: userId,
            champion_id: history.championId,
            full_standings: history.finalStandings
        }, 'league_history');
        
        await handleSupabaseRequest(
          supabase.from('league_history').upsert(dbHistory, { onConflict: 'user_id,year' }),
          'saveLeagueHistory',
          dbHistory
        );
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
        playoffGames: JSON.parse(localStorage.getItem('stuffy_playoff_games') || '[]') as PlayoffGame[]
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
        team1Id: g.team1_id, team2Id: g.team2_id, winnerId: g.winner_id,
        seed1: g.seed1, seed2: g.seed2, team1Score: g.team1_score, team2Score: g.team2_score
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
      localStorage.removeItem('stuffy_playoff_games');
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
