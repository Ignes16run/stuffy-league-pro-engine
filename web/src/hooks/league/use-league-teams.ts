"use client";
import { useState, useCallback } from 'react';
import { Team, Player } from '@/lib/league/types';
import { generateUUID } from '@/lib/league/utils';
import { generateTeamRoster } from '@/lib/league/players';

export function useLeagueTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const addTeam = useCallback(async (team: Omit<Team, 'id'>) => {
    const newTeam = { ...team, id: generateUUID() } as Team;
    const newRoster = generateTeamRoster(newTeam.id);
    setTeams(prev => [...prev, newTeam]);
    setPlayers(prev => [...prev, ...newRoster]);
  }, []);

  const updateTeam = useCallback(async (teamId: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, ...updates } : t));
  }, []);

  const deleteTeam = useCallback(async (teamId: string) => {
    setTeams(prev => prev.filter(t => t.id !== teamId));
    setPlayers(prev => prev.filter(p => p.teamId !== teamId));
  }, []);

  const updatePlayer = useCallback(async (playerId: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, ...updates } : p));
  }, []);

  const bulkUpdatePlayers = useCallback(async (playerUpdates: { id: string, updates: Partial<Player> }[]) => {
    setPlayers(prev => {
      const next = [...prev];
      playerUpdates.forEach(({ id, updates }) => {
        const idx = next.findIndex(p => p.id === id);
        if (idx !== -1) next[idx] = { ...next[idx], ...updates };
      });
      return next;
    });
  }, []);

  const upgradeStat = useCallback(async (teamId: string, statId: string) => {
    setTeams(prev => prev.map(t => 
      t.id === teamId ? { 
        ...t, 
        [statId]: ((t[statId as keyof Team] as number) || 75) + 1, 
        stuffyPoints: (t.stuffyPoints || 0) - 50 
      } : t
    ));
  }, []);

  return {
    teams,
    setTeams,
    players,
    setPlayers,
    addTeam,
    updateTeam,
    deleteTeam,
    updatePlayer,
    bulkUpdatePlayers,
    upgradeStat
  };
}
