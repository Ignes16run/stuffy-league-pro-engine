import { Team, Game, Standing, PlayoffGame } from './types';
import { calculateStandings, generateUUID } from './utils';

/**
 * Generates a schedule that prioritizes intra-division matchups.
 * ~60% games vs division opponents, 40% non-division.
 */
export function generateDivisionSchedule(teams: Team[], numWeeks: number = 14): Game[] {
  const games: Game[] = [];
  const teamsByDivision: Record<string, Team[]> = {};
  
  teams.forEach(t => {
    const div = t.divisionId || 'Independent';
    if (!teamsByDivision[div]) teamsByDivision[div] = [];
    teamsByDivision[div].push(t);
  });

  const divisionIds = Object.keys(teamsByDivision);
  
  // Track how many games each team has scheduled
  const teamGameCounts: Record<string, number> = {};
  teams.forEach(t => teamGameCounts[t.id] = 0);

  // 1. Schedule Division Games (The core of the schedule)
  // Each team plays division rivals twice (home/away)
  divisionIds.forEach(divId => {
    const divTeams = teamsByDivision[divId];
    for (let i = 0; i < divTeams.length; i++) {
      for (let j = i + 1; j < divTeams.length; j++) {
        const teamA = divTeams[i];
        const teamB = divTeams[j];
        
        // Game 1
        games.push({
          id: generateUUID(),
          week: 0, // Placeholder
          homeTeamId: teamA.id,
          awayTeamId: teamB.id
        });
        
        // Game 2
        games.push({
          id: generateUUID(),
          week: 0, // Placeholder
          homeTeamId: teamB.id,
          awayTeamId: teamA.id
        });
        
        teamGameCounts[teamA.id] += 2;
        teamGameCounts[teamB.id] += 2;
      }
    }
  });

  // 2. Fill remaining games with non-division opponents
  const allTeamIds = teams.map(t => t.id);
  
  allTeamIds.forEach(tId => {
    const team = teams.find(t => t.id === tId)!;
    const divId = team.divisionId || 'Independent';
    const divTeamIds = teamsByDivision[divId].map(t => t.id);
    
    const possibleOpponents = allTeamIds.filter(id => !divTeamIds.includes(id));
    
    while (teamGameCounts[tId] < numWeeks) {
      // Find an opponent who also needs games
      const opponentId = possibleOpponents.find(oppId => 
        teamGameCounts[oppId] < numWeeks && 
        !games.some(g => (g.homeTeamId === tId && g.awayTeamId === oppId) || (g.homeTeamId === oppId && g.awayTeamId === tId))
      );
      
      if (!opponentId) break; // Should theoretically not happen with enough teams
      
      games.push({
        id: generateUUID(),
        week: 0,
        homeTeamId: tId,
        awayTeamId: opponentId
      });
      
      teamGameCounts[tId]++;
      teamGameCounts[opponentId]++;
    }
  });

  // 3. Assign Weeks (Greedy approach)
  // This is a simplified version of round-robin assignment
  const weekLoad: Record<number, Game[]> = {};
  for (let i = 1; i <= numWeeks; i++) weekLoad[i] = [];

  const assignedGames: Game[] = [];
  
  // Shuffle games slightly to vary week assignments
  const shuffledGames = [...games].sort(() => Math.random() - 0.5);

  shuffledGames.forEach(game => {
    for (let w = 1; w <= numWeeks; w++) {
      const teamsInWeek = new Set(weekLoad[w].flatMap(g => [g.homeTeamId, g.awayTeamId]));
      if (!teamsInWeek.has(game.homeTeamId) && !teamsInWeek.has(game.awayTeamId)) {
        game.week = w;
        weekLoad[w].push(game);
        assignedGames.push(game);
        break;
      }
    }
  });

  return assignedGames;
}

/**
 * Calculates standings and groups them by Conference and Division.
 */
export function calculateGroupedStandings(teams: Team[], games: Game[]) {
  const baseStandings = calculateStandings(teams, games);
  
  // Map conference/division info from teams
  const standings = baseStandings.map(s => {
    const team = teams.find(t => t.id === s.teamId);
    return {
      ...s,
      conferenceId: team?.conferenceId,
      divisionId: team?.divisionId
    };
  });

  // Grouping structure
  const grouped: Record<string, Record<string, Standing[]>> = {};

  standings.forEach(s => {
    const conf = s.conferenceId || 'Other';
    const div = s.divisionId || 'Independent';
    
    if (!grouped[conf]) grouped[conf] = {};
    if (!grouped[conf][div]) grouped[conf][div] = [];
    
    grouped[conf][div].push(s as Standing);
  });

  // Sort each division by rank/winPct
  Object.keys(grouped).forEach(confId => {
    Object.keys(grouped[confId]).forEach(divId => {
      grouped[confId][divId].sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);
    });
  });

  return grouped;
}

/**
 * Seeding logic: Division winners first, then Wildcards.
 */
export function getConferenceSeeds(conferenceId: string, teams: Team[], standings: Standing[]): Standing[] {
  const confTeams = teams.filter(t => t.conferenceId === conferenceId);
  const confStandings = standings.filter(s => {
    const team = teams.find(t => t.id === s.teamId);
    return team?.conferenceId === conferenceId;
  });

  // 1. Identify Division Winners
  const divisions = Array.from(new Set(confTeams.map(t => t.divisionId)));
  const divisionWinners: Standing[] = [];
  
  divisions.forEach(divId => {
    const divStandings = confStandings.filter(s => {
      const team = teams.find(t => t.id === s.teamId);
      return team?.divisionId === divId;
    });
    
    if (divStandings.length > 0) {
      divStandings.sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);
      divisionWinners.push(divStandings[0]);
    }
  });

  // 2. Identify Wildcards (everyone else)
  const nonWinners = confStandings.filter(s => !divisionWinners.find(w => w.teamId === s.teamId));
  nonWinners.sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);

  // 3. Merge: Div Winners (sorted) then Wildcards (sorted)
  divisionWinners.sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);
  
  return [...divisionWinners, ...nonWinners];
}

/**
 * Generates an 8-team playoff bracket based on conference seeding.
 * 4 per conference.
 */
export function generateConferencePlayoffs(teams: Team[], games: Game[]): PlayoffGame[] {
  const standings = calculateStandings(teams, games);
  const afcSeeds = getConferenceSeeds('AFC', teams, standings as Standing[]);
  const nfcSeeds = getConferenceSeeds('NFC', teams, standings as Standing[]);

  const playoffs: PlayoffGame[] = [];
  
  // Seed 1 vs Seed 4 in each conference (Quarterfinals)
  // Seed 2 vs Seed 3 in each conference
  
  // AFC Side (Matchup indices 0, 1)
  playoffs.push({
    id: generateUUID(),
    round: 1,
    matchupIndex: 0,
    team1Id: afcSeeds[0]?.teamId,
    team2Id: afcSeeds[3]?.teamId,
    seed1: 1,
    seed2: 4
  });
  
  playoffs.push({
    id: generateUUID(),
    round: 1,
    matchupIndex: 1,
    team1Id: afcSeeds[1]?.teamId,
    team2Id: afcSeeds[2]?.teamId,
    seed1: 2,
    seed2: 3
  });

  // NFC Side (Matchup indices 2, 3)
  playoffs.push({
    id: generateUUID(),
    round: 1,
    matchupIndex: 2,
    team1Id: nfcSeeds[0]?.teamId,
    team2Id: nfcSeeds[3]?.teamId,
    seed1: 1,
    seed2: 4
  });
  
  playoffs.push({
    id: generateUUID(),
    round: 1,
    matchupIndex: 3,
    team1Id: nfcSeeds[1]?.teamId,
    team2Id: nfcSeeds[2]?.teamId,
    seed1: 2,
    seed2: 3
  });

  // Semifinals (Matchup indices 4, 5)
  playoffs.push({ id: generateUUID(), round: 2, matchupIndex: 4 }); // AFC Champ
  playoffs.push({ id: generateUUID(), round: 2, matchupIndex: 5 }); // NFC Champ

  // Finals (Matchup index 6)
  playoffs.push({ id: generateUUID(), round: 3, matchupIndex: 6 });

  return playoffs;
}
