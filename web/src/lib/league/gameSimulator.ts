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
  | 'HALF_TIME'
  | 'GAME_END';

export type SoundEffectType = 
  | 'WHISTLE'
  | 'CHEER'
  | 'OOH'
  | 'DRUM_ROLL'
  | 'ZAP'
  | 'FG_GOOD'
  | 'KICKOFF';

export interface GameStep {
  type: GameEventType;
  description: string;
  commentary?: string;
  soundEffect?: SoundEffectType;
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
  
  const addStep = (type: GameEventType, description: string, quarter: number, time: string, possessionId?: string, commentary?: string, soundEffect?: SoundEffectType) => {
    steps.push({
      type,
      description,
      commentary,
      soundEffect,
      homeScore,
      awayScore,
      timeRemaining: time,
      quarter,
      teamInPossessionId: possessionId
    });
  };

  const commentaryMap: Record<GameEventType, string[]> = {
    'GAME_START': [
      "The crowd is buzzing as the final preparations are made. We're in for a classic!",
      "An electric atmosphere today as both teams look to make a statement.",
      "History in the making. The rivalry continues under the bright lights."
    ],
    'KICKOFF': [
      "A booming kick deep into the endzone. Let's see how they respond.",
      "The ball is in the air! The chase is on!",
      "Perfect placement on the kick. Special teams getting it done."
    ],
    'TOUCHDOWN': [
      "UNBELIEVABLE! He breaks one tackle, then another... and he's GONE! TOUCHDOWN!",
      "A laser-sharp pass across the middle. Catch! Reach... YES! SIX POINTS!",
      "The defense was waiting, but the power was too much. Into the endzone they go!",
      "A trick play that works to perfection! The stadium is erupting!"
    ],
    'FIELD_GOAL': [
      "The snap is good, the hold is perfect... it's high, it's deep... IT'S GOOD!",
      "Adding three points to the board. Clinical efficiency from the kicker.",
      "A pressure kick from 45 yards out. Right down the middle!"
    ],
    'INTERCEPTION': [
      "PICKED OFF! He read that like a book! The momentum just shifted hard.",
      "NO! A forced throw into double coverage leads to a huge turnover!",
      "Intercepted! The safety comes out of nowhere to snag it!"
    ],
    'FUMBLE': [
      "The ball is loose! IT'S ON THE GROUND! Who's got it?!",
      "A devastating hit jars the ball free! That's going to hurt.",
      "Ball security failure! The defense was hungry for that one."
    ],
    'SACK': [
      "BROUGHT DOWN! The offensive line collapses as the pressure hits home.",
      "SACKED! He had nowhere to go. Loss of 8 on the play.",
      "Absolute chaos in the pocket! He's pinned behind the line."
    ],
    'PUNT': [
      "A long, spiraling punt to pin them back deep.",
      "The drives stalls out. Time to trust the defense.",
      "Excellent coverage on the return. They've got a long field ahead."
    ],
    'END_OF_QUARTER': [
      "Quarter complete. Coaches drawing up new strategies on the sideline.",
      "A brief pause to catch their breath. This game is intense!",
      "Tensions are high as both teams regroup for the next 15."
    ],
    'HALF_TIME': [
      "HALF TIME! We've seen some incredible plays. Time for the show!",
      "A quick breather before the second half battle begins.",
      " halftime analysis coming up. Let's recap the highlights."
    ],
    'GAME_END': [
      "That is it! A hard-fought victory that will be remembered for years.",
      "The final whistle blows! What a spectacle of sportsmanship and skill.",
      "Emotional scenes on the field as the clock hits zero. Victory is theirs!"
    ],
    'TURNOVER_ON_DOWNS': [],
  };

  const getRandomCommentary = (type: GameEventType) => {
    const list = commentaryMap[type] || [];
    return list[Math.floor(Math.random() * list.length)] || "";
  };

  addStep('GAME_START', `Welcome to the arena! ${awayTeam.name} faces off against ${homeTeam.name}.`, 1, '15:00', undefined, getRandomCommentary('GAME_START'), 'WHISTLE');
  addStep('KICKOFF', `${awayTeam.name} kicks off to begin the game!`, 1, '14:55', homeTeam.id, getRandomCommentary('KICKOFF'), 'KICKOFF');

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
        addStep('TOUCHDOWN', `TOUCHDOWN! ${actingTeam.name} finds the endzone!`, q, time, actingTeam.id, getRandomCommentary('TOUCHDOWN'), 'CHEER');
      } else if (outcomeSeed > 0.7) {
        // Field Goal
        const points = 3;
        if (isHomePossession) homeScore += points; else awayScore += points;
        addStep('FIELD_GOAL', `${actingTeam.name} settles for a field goal. It's good!`, q, time, actingTeam.id, getRandomCommentary('FIELD_GOAL'), 'FG_GOOD');
      } else if (outcomeSeed > 0.6) {
        // Turnover
        const type = Math.random() > 0.5 ? 'INTERCEPTION' : 'FUMBLE';
        addStep(type as GameEventType, `TURNOVER! ${actingTeam.name} loses control!`, q, time, otherTeam.id, getRandomCommentary(type as GameEventType), 'OOH');
      } else {
        // Punt
        addStep('PUNT', `Defense holds strong. ${actingTeam.name} is forced to punt.`, q, time, otherTeam.id, getRandomCommentary('PUNT'), 'WHISTLE');
      }
    }
    
    if (q === 2) {
      addStep('HALF_TIME', `HALF TIME! Score: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, 2, '00:00', undefined, getRandomCommentary('HALF_TIME'), 'DRUM_ROLL');
    } else if (q < 4) {
      addStep('END_OF_QUARTER', `That's the end of Quarter ${q}! Score: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, q, '00:00', undefined, getRandomCommentary('END_OF_QUARTER'), 'WHISTLE');
    }
  }

  addStep('GAME_END', `Game Over! Final: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, 4, '00:00', undefined, getRandomCommentary('GAME_END'), 'WHISTLE');

  return steps;
}
