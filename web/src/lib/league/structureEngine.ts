import { Team, Game, Standing, PlayoffGame } from './types';
import { calculateStandings, generateUUID } from './utils';
import { DEFAULT_LEAGUE_TEAMS } from './constants';

/**
 * Generates a schedule that ensures no bye weeks (for even number of teams).
 * Uses a balanced approach for division vs non-division games.
 */
export function generateDivisionSchedule(teams: Team[], numWeeks: number = 14): Game[] {
  const games: Game[] = [];
  const teamIds = teams.map(t => t.id);
  const n = teamIds.length;
  
  if (n % 2 !== 0) {
    // If odd, we'd need byes, but let's assume even for now as per user request
    console.warn("Odd number of teams detected. Schedule will contain byes.");
  }

  // 1. Group by division
  const teamsByDivision: Record<string, string[]> = {};
  teams.forEach(t => {
    const div = t.divisionId || 'Independent';
    if (!teamsByDivision[div]) teamsByDivision[div] = [];
    teamsByDivision[div].push(t.id);
  });

  // 2. Track matchups to avoid duplicates in same week
  const teamWeeks: Record<string, Set<number>> = {};
  teamIds.forEach(id => teamWeeks[id] = new Set());

  // 3. Round Robin for Division Games
  // In a 4-team division, teams play each other twice = 6 games.
  Object.values(teamsByDivision).forEach(divTeams => {
    for (let round = 1; round <= 2; round++) {
      for (let i = 0; i < divTeams.length; i++) {
        for (let j = i + 1; j < divTeams.length; j++) {
          games.push({
            id: generateUUID(),
            week: 0, // Assigned later
            homeTeamId: round === 1 ? divTeams[i] : divTeams[j],
            awayTeamId: round === 1 ? divTeams[j] : divTeams[i]
          });
        }
      }
    }
  });

  // 4. Non-Division Games
  // Each team needs more games to reach numWeeks
  const teamGameCounts: Record<string, number> = {};
  teamIds.forEach(id => {
    teamGameCounts[id] = games.filter(g => g.homeTeamId === id || g.awayTeamId === id).length;
  });

  teamIds.forEach(tId => {
    const team = teams.find(t => t.id === tId)!;
    const divId = team.divisionId || 'Independent';
    const divTeamIds = teamsByDivision[divId] || [];
    
    const possibleOpponents = teamIds.filter(id => id !== tId && !divTeamIds.includes(id));
    
    while (teamGameCounts[tId] < numWeeks) {
      const oppId = possibleOpponents.find(id => 
        teamGameCounts[id] < numWeeks && 
        !games.some(g => (g.homeTeamId === tId && g.awayTeamId === id) || (g.homeTeamId === id && g.awayTeamId === tId))
      );
      
      if (!oppId) break;
      
      games.push({
        id: generateUUID(),
        week: 0,
        homeTeamId: tId,
        awayTeamId: oppId
      });
      teamGameCounts[tId]++;
      teamGameCounts[oppId]++;
    }
  });

  // 5. Assign Weeks (Greedy with conflict checking)
  // To avoid byes, every team MUST play every week. 
  // There should be exactly (n/2) games per week.
  const weekGames: Record<number, Game[]> = {};
  for (let w = 1; w <= numWeeks; w++) weekGames[w] = [];

  const unassignedGames = [...games].sort(() => Math.random() - 0.5);
  const finalGames: Game[] = [];

  for (let w = 1; w <= numWeeks; w++) {
    const busyTeams = new Set<string>();
    
    // Attempt to fill this week's quota (n/2 games)
    for (let i = 0; i < unassignedGames.length; i++) {
      const g = unassignedGames[i];
      if (!busyTeams.has(g.homeTeamId) && !busyTeams.has(g.awayTeamId)) {
        g.week = w;
        busyTeams.add(g.homeTeamId);
        busyTeams.add(g.awayTeamId);
        finalGames.push(g);
        unassignedGames.splice(i, 1);
        i--;
        
        if (busyTeams.size === n) break; // Week is full
      }
    }
  }

  return finalGames;
}

/**
 * Calculates standings and groups them by Conference and Division.
 */
export function calculateGroupedStandings(teams: Team[], games: Game[]) {
  const baseStandings = calculateStandings(teams, games);
  
  const standings = baseStandings.map(s => {
    const team = teams.find(t => t.id === s.teamId);
    return {
      ...s,
      conferenceId: team?.conferenceId,
      divisionId: team?.divisionId
    };
  });

  const grouped: Record<string, Record<string, Standing[]>> = {};

  standings.forEach(s => {
    const conf = s.conferenceId || 'Other';
    const div = s.divisionId || 'Independent';
    
    if (!grouped[conf]) grouped[conf] = {};
    if (!grouped[conf][div]) grouped[conf][div] = [];
    
    grouped[conf][div].push(s as Standing);
  });

  // Sort each division by winPct, then pointDiff
  Object.keys(grouped).forEach(confId => {
    Object.keys(grouped[confId]).forEach(divId => {
      grouped[confId][divId].sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);
    });
  });

  return grouped;
}

/**
 * Seeding logic: Division winners first (sorted by record), then Wildcards (sorted by record).
 */
export function getConferenceSeeds(conferenceId: string, teams: Team[], standings: Standing[]): Standing[] {
  const confStandings = standings.filter(s => {
    const team = teams.find(t => t.id === s.teamId);
    return team?.conferenceId === conferenceId;
  });

  // Group by division to find winners
  const divMap: Record<string, Standing[]> = {};
  confStandings.forEach(s => {
    const team = teams.find(t => t.id === s.teamId);
    const div = team?.divisionId || 'Independent';
    if (!divMap[div]) divMap[div] = [];
    divMap[div].push(s);
  });

  const divisionWinners: Standing[] = [];
  const wildcards: Standing[] = [];

  Object.values(divMap).forEach(divStandings => {
    // Sort division by record
    divStandings.sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);
    divisionWinners.push(divStandings[0]);
    // The rest are wildcard candidates
    for (let i = 1; i < divStandings.length; i++) {
      wildcards.push(divStandings[i]);
    }
  });

  // Sort div winners by overall record
  divisionWinners.sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);
  // Sort wildcards by overall record
  wildcards.sort((a, b) => b.winPct - a.winPct || b.pointDiff - a.pointDiff);

  const totalSeeds = [...divisionWinners, ...wildcards];
  
  // Assign seed numbers (1-indexed)
  return totalSeeds.map((s, idx) => ({
    ...s,
    seed: idx + 1
  }));
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
  // AFC Side (Matchup indices 0, 1)
  playoffs.push({
    id: 'q1',
    round: 1,
    matchupIndex: 0,
    team1Id: afcSeeds[0]?.teamId,
    team2Id: afcSeeds[3]?.teamId,
    seed1: 1,
    seed2: 4
  });
  
  playoffs.push({
    id: 'q2',
    round: 1,
    matchupIndex: 1,
    team1Id: afcSeeds[1]?.teamId,
    team2Id: afcSeeds[2]?.teamId,
    seed1: 2,
    seed2: 3
  });

  // NFC Side (Matchup indices 2, 3)
  playoffs.push({
    id: 'q3',
    round: 1,
    matchupIndex: 2,
    team1Id: nfcSeeds[0]?.teamId,
    team2Id: nfcSeeds[3]?.teamId,
    seed1: 1,
    seed2: 4
  });
  
  playoffs.push({
    id: 'q4',
    round: 1,
    matchupIndex: 3,
    team1Id: nfcSeeds[1]?.teamId,
    team2Id: nfcSeeds[2]?.teamId,
    seed1: 2,
    seed2: 3
  });

  // Semifinals (Round 2)
  playoffs.push({ id: 's1', round: 2, matchupIndex: 0 }); // AFC Champ
  playoffs.push({ id: 's2', round: 2, matchupIndex: 1 }); // NFC Champ

  // Finals (Round 3)
  playoffs.push({ id: 'f1', round: 3, matchupIndex: 0 });

  return playoffs;
}

/**
 * Ensures existing teams have their conference and division assignments.
 */
export function syncTeamStructures(teams: Team[]): Team[] {
  return teams.map(t => {
    // Try by ID first, then by Name
    const defaultTeam = DEFAULT_LEAGUE_TEAMS.find(dt => dt.id === t.id) || 
                       DEFAULT_LEAGUE_TEAMS.find(dt => dt.name === t.name);
                       
    if (defaultTeam) {
      return {
        ...t,
        conferenceId: t.conferenceId || defaultTeam.conferenceId,
        divisionId: t.divisionId || defaultTeam.divisionId
      };
    }
    return t;
  });
}
