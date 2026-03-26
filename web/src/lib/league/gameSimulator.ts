import { Game, Team } from './types';

export type GameEventType = 
  | 'KICKOFF'
  | 'TOUCHDOWN'
  | 'FIELD_GOAL'
  | 'PUNT'
  | 'INTERCEPTION'
  | 'FUMBLE'
  | 'TURNOVER_ON_DOWNS'
  | 'SACK'
  | 'END_OF_QUARTER'
  | 'GAME_START'
  | 'GAME_END';

export interface GameStep {
  type: GameEventType;
  description: string;
  homeScore: number;
  awayScore: number;
  timeRemaining: string; // e.g. "12:34"
  quarter: number;
  teamInPossessionId?: string;
}

export function simulateGameSteps(game: Game, homeTeam: Team, awayTeam: Team): GameStep[] {
  const steps: GameStep[] = [];
  let homeScore = 0;
  let awayScore = 0;
  
  const addStep = (type: GameEventType, description: string, quarter: number, time: string, possessionId?: string) => {
    steps.push({
      type,
      description,
      homeScore,
      awayScore,
      timeRemaining: time,
      quarter,
      teamInPossessionId: possessionId
    });
  };

  addStep('GAME_START', `Welcome to the arena! ${awayTeam.name} faces off against ${homeTeam.name}.`, 1, '15:00');
  addStep('KICKOFF', `${awayTeam.name} kicks off to begin the game!`, 1, '14:55', homeTeam.id);

  // Simple simulation loop for 4 quarters
  for (let q = 1; q <= 4; q++) {
    const drives = Math.floor(Math.random() * 3) + 2; // 2-4 drives per quarter
    
    for (let d = 0; d < drives; d++) {
      const isHomePossession = Math.random() > 0.5;
      const actingTeam = isHomePossession ? homeTeam : awayTeam;
      const otherTeam = isHomePossession ? awayTeam : homeTeam;
      
      const outcomeSeed = Math.random();
      const time = `${Math.floor(Math.random() * 10) + 1}:${Math.floor(Math.random() * 50) + 10}`;

      if (outcomeSeed > 0.85) {
        // Touchdown
        const points = 7;
        if (isHomePossession) homeScore += points; else awayScore += points;
        addStep('TOUCHDOWN', `TOUCHDOWN! ${actingTeam.name} finds the endzone with an incredible run!`, q, time, actingTeam.id);
      } else if (outcomeSeed > 0.7) {
        // Field Goal
        const points = 3;
        if (isHomePossession) homeScore += points; else awayScore += points;
        addStep('FIELD_GOAL', `${actingTeam.name} settles for a field goal. It's good!`, q, time, actingTeam.id);
      } else if (outcomeSeed > 0.6) {
        // Turnover
        const type = Math.random() > 0.5 ? 'INTERCEPTION' : 'FUMBLE';
        addStep(type as GameEventType, `DISASTER! ${actingTeam.name} turns it over! ${otherTeam.name} takes control.`, q, time, otherTeam.id);
      } else {
        // Punt
        addStep('PUNT', `Defense holds strong. ${actingTeam.name} is forced to punt.`, q, time, otherTeam.id);
      }
    }
    
    if (q < 4) {
      addStep('END_OF_QUARTER', `That's the end of Quarter ${q}! Score: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, q, '00:00');
    }
  }

  addStep('GAME_END', `The clock hits zero! Final score: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, 4, '00:00');

  return steps;
}
