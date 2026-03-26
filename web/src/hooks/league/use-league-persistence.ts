import React, { useCallback } from 'react';
import { PersistenceEngine } from '@/lib/league/persistenceEngine';
import { migrateData, CURRENT_DATA_VERSION } from '@/lib/league/migrationEngine';

export function useLeaguePersistence() {
  const loadLocal = useCallback(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('stuffy_league_data');
    if (!saved) return null;
    try {
      const rawData = JSON.parse(saved);
      return migrateData(rawData);
    } catch (e) {
      console.error('Failed to parse saved data', e);
      return null;
    }
  }, []);

  const saveLocal = useCallback((allState: Record<string, any>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('stuffy_league_data', JSON.stringify({
      version: CURRENT_DATA_VERSION,
      ...allState
    }));
  }, []);

  const saveSupabase = useCallback(async (allState: Record<string, any>, userId: string) => {
    if (!userId) return;
    // Multi-call save for granular updates if needed, or single large blob
    await PersistenceEngine.saveTeams(allState.teams, userId);
    await PersistenceEngine.savePlayers(allState.players, userId);
    await PersistenceEngine.saveGames(allState.games, userId);
    if (allState.playoffGames) await PersistenceEngine.savePlayoffGames(allState.playoffGames, userId);
  }, []);

  const loadSupabase = useCallback(async (userId: string) => {
    const rawData = await PersistenceEngine.loadAllData(userId);
    return migrateData(rawData);
  }, []);

  const clearAll = useCallback(async (userId: string) => {
    localStorage.removeItem('stuffy_league_data');
    if (userId) await PersistenceEngine.clearAll(userId);
  }, []);

  return {
    loadLocal,
    saveLocal,
    saveSupabase,
    loadSupabase,
    clearAll
  };
}
