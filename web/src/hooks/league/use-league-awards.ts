import React, { useState, useCallback } from 'react';
import { Player, SeasonHistory, AwardType, Team } from '@/lib/league/types';
import { getStatForAward } from '@/lib/league/awardsEngine';
import { selectNarrativeTemplate, generateNarrative, NARRATIVE_BANK } from '@/lib/league/narratives';

export function useLeagueAwards(
  players: Player[], 
  teams: Team[], 
  history: SeasonHistory[], 
  recentNarrativesUsed: any[], 
  setRecentNarrativesUsed: React.Dispatch<React.SetStateAction<any[]>>
) {
  const [isAwardsPhase, setIsAwardsPhase] = useState(false);
  const [awardFinalists, setAwardFinalists] = useState<Record<string, Player[]>>({});
  const [selectedAwards, setSelectedAwards] = useState<Record<string, string>>({});
  const [awardResults, setAwardResults] = useState<Record<string, any>>({});

  const setAwardWinner = useCallback((category: string, playerId: string) => {
    const winner = players.find(p => p.id === playerId);
    if (!winner) return;
    
    setSelectedAwards(prev => ({ ...prev, [category]: playerId }));
    const team = teams.find(t => t.id === winner.teamId);
    const awardType = category as AwardType;
    const statValue = getStatForAward(winner, awardType);
    const statName = awardType === 'STPOY' ? 'Points' : (awardType === 'DPOY' ? 'Tackles/Sacks' : 'All-Purpose');
    
    const template = selectNarrativeTemplate(
      awardType, 
      winner.position, 
      winner.awardsHistory || [], 
      recentNarrativesUsed, 
      (history.length + 1).toString()
    ) || NARRATIVE_BANK[0];

    const narrative = generateNarrative(winner, awardType, team?.name || 'his team', statValue, statName, template);
    
    setRecentNarrativesUsed((prev: any) => [...prev, { templateId: template.id, seasonId: (history.length + 1).toString() }]);
    setAwardResults((prev: any) => ({ ...prev, [category]: { winner, statName, statValue, narrative } }));
  }, [players, teams, history.length, recentNarrativesUsed, setRecentNarrativesUsed]);

  const simulateAwards = useCallback(() => {
    Object.entries(awardFinalists).forEach(([category, finalists]) => {
      if (finalists.length > 0) {
        setAwardWinner(category, finalists[0].id);
      }
    });
  }, [awardFinalists, setAwardWinner]);

  return {
    isAwardsPhase, setIsAwardsPhase,
    awardFinalists, setAwardFinalists,
    selectedAwards, setSelectedAwards,
    awardResults, setAwardResults,
    setAwardWinner, simulateAwards
  };
}
