import { Team, Game, Standing, PlayoffGame } from './types';
import { calculateStandings, generateUUID } from './utils';
import { DEFAULT_LEAGUE_TEAMS } from './constants';

export function generateDivisionSchedule(teams: Team[], numWeeks: number = 14): Game[] {
  if (teams.length < 2) return [];

  const games: Game[] = [];
  const teamIds = teams.map(t => t.id);
  
  // Handle odd number of teams by adding a 'dummy' team (representing a bye)
  const tempTeams = [...teamIds];
  if (tempTeams.length % 2 !== 0) {
    tempTeams.push('DUMMY_BYE');
  }

  const n = tempTeams.length;
  const numRounds = n - 1;
  const gamesPerRound = n / 2;

  // Circle Method for Round Robin
  // We'll generate as many full round robins as needed to reach numWeeks
  let currentWeek = 1;
  let cycle = 0;

  while (currentWeek <= numWeeks) {
    for (let round = 0; round < numRounds && currentWeek <= numWeeks; round++) {
      for (let i = 0; i < gamesPerRound; i++) {
        const team1 = tempTeams[i];
        const team2 = tempTeams[n - 1 - i];

        if (team1 !== 'DUMMY_BYE' && team2 !== 'DUMMY_BYE') {
          // Alternative home/away based on cycle/round to balance
          const isHome = (round + cycle) % 2 === 0;
          games.push({
            id: generateUUID(),
            week: currentWeek,
            homeTeamId: isHome ? team1 : team2,
            awayTeamId: isHome ? team2 : team1
          });
        }
      }
      
      // Rotate for the next round within the cycle
      // Fixed first element, rotate others
      if (tempTeams.length > 2) {
        const first = tempTeams.shift()!;
        tempTeams.push(tempTeams.shift()!);
        tempTeams.unshift(first);
      }

      currentWeek++;
    }
    
    cycle++;
  }

  // Shuffle weeks slightly for variety if desired, but keep it deterministic for now
  return games.filter(g => g.week <= numWeeks);
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
