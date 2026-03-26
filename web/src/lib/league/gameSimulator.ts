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
  | 'OVERTIME_START'
  | 'GAME_END';

export type SoundEffectType = 
  | 'WHISTLE'
  | 'CHEER'
  | 'OOH'
  | 'DRUM_ROLL'
  | 'ZAP'
  | 'FG_GOOD'
  | 'TOUCHDOWN'
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

  const commentaryMap: Record<string, string[]> = {
    'GAME_START': [
      "The crowd is buzzing as the final preparations are made. We're in for a classic!",
      "An electric atmosphere today as both teams look to make a statement.",
      "The sun is setting, the lights are up, and the fans are ready for kick-off!",
      "A potential championship-preview matchup here today. All eyes on the field."
    ],
    'KICKOFF': [
      "A booming kick deep into the endzone. Let's see how they respond.",
      "The ball is in the air! The chase is on!",
      "Perfect placement on the kick. Special teams getting it done.",
      "Kicked high and deep! The returner decides to take a touchback."
    ],
    'TOUCHDOWN': [
      "UNBELIEVABLE! He breaks one tackle, then another... and he's GONE! TOUCHDOWN!",
      "A laser-sharp pass across the middle. Catch! Reach... YES! SIX POINTS!",
      "The defense was waiting, but the power was too much. Into the endzone they go!",
      "A trick play that works to perfection! The stadium is erupting!",
      "HE TAKES IT TO THE HOUSE! Pure speed on display right there."
    ],
    'FIELD_GOAL': [
      "The snap is good, the hold is perfect... it's high, it's deep... IT'S GOOD!",
      "Adding three points to the board. Clinical efficiency from the kicker.",
      "A pressure kick from 45 yards out. Right down the middle!",
      "Split the uprights! No doubt about that one."
    ],
    'INTERCEPTION': [
      "PICKED OFF! He read that like a book! The momentum just shifted hard.",
      "NO! A forced throw into double coverage leads to a huge turnover!",
      "Intercepted! The safety comes out of nowhere to snag it!",
      "He baited the QB into that one. Defense is having a day!"
    ],
    'FUMBLE': [
      "The ball is loose! IT'S ON THE GROUND! Who's got it?!",
      "A devastating hit jars the ball free! That's going to hurt.",
      "Ball security failure! The defense was hungry for that one.",
      "TURNOVER! He coughs it up in the redzone! Disaster for the offense."
    ],
    'SACK': [
      "BROUGHT DOWN! The offensive line collapses as the pressure hits home.",
      "SACKED! He had nowhere to go. Loss of 8 on the play.",
      "Absolute chaos in the pocket! He's pinned behind the line.",
      "The sack-master strikes again! That offensive line is struggling."
    ],
    'PUNT': [
      "A long, spiraling punt to pin them back deep.",
      "The drive stalls out. Time to trust the defense.",
      "Excellent coverage on the return. They've got a long field ahead.",
      "Fair catch called. The defense did their job."
    ],
    'TURNOVER_ON_DOWNS': [
        "Denied! They went for it on 4th down and got absolutely stuffed!",
        "Stuffed at the line! The gamble doesn't pay off for the offense.",
        "A huge defensive stand! They take over at their own 40."
    ],
    'END_OF_QUARTER': [
      "Quarter complete. Coaches drawing up new strategies on the sideline.",
      "A brief pause to catch their breath. This game is intense!",
      "Tensions are high as both teams regroup for the next 15.",
      "What a battle we have on our hands. Everything to play for."
    ],
    'HALF_TIME': [
      "HALF TIME! We've seen some incredible plays. Time for the show!",
      "A quick breather before the second half battle begins.",
      "Halftime report coming up. Let's recap the highlights.",
      "Both teams heading to the locker room. Adjustments are needed."
    ],
    'OVERTIME_START': [
        "WE ARE HEADED TO OVERTIME! 60 minutes wasn't enough!",
        "Bonus football! The atmosphere is peak intensity right now.",
        "Sudden death rules apply. Next score could end it."
    ],
    'GAME_END': [
      "That is it! A hard-fought victory that will be remembered for years.",
      "The final whistle blows! What a spectacle of sportsmanship and skill.",
      "Emotional scenes on the field as the clock hits zero. Victory is theirs!",
      "What a finish! This one lived up to the hype and more."
    ],
  };

  const getRandomCommentary = (type: string) => {
    const list = commentaryMap[type] || [];
    return list[Math.floor(Math.random() * list.length)] || "";
  };

  addStep('GAME_START', `Welcome to the arena! ${awayTeam.name} faces off against ${homeTeam.name}.`, 1, '15:00', undefined, getRandomCommentary('GAME_START'), 'WHISTLE');
  addStep('KICKOFF', `${awayTeam.name} kicks off to begin the game!`, 1, '14:55', homeTeam.id, getRandomCommentary('KICKOFF'), 'KICKOFF');

  const runQuarters = (start: number, end: number) => {
    for (let q = start; q <= end; q++) {
        const drives = Math.floor(Math.random() * 4) + 2; 
        
        for (let d = 0; d < drives; d++) {
          const isHomePossession = Math.random() > 0.5;
          const actingTeam = isHomePossession ? homeTeam : awayTeam;
          const otherTeam = isHomePossession ? awayTeam : homeTeam;
          
          const outcomeSeed = Math.random();
          const timeMinutes = Math.floor(Math.random() * 10) + 1;
          const timeSeconds = Math.floor(Math.random() * 50) + 10;
          const time = `${timeMinutes.toString().padStart(2, '0')}:${timeSeconds.toString().padStart(2, '0')}`;
    
          if (outcomeSeed > 0.82) {
            // Touchdown
            const points = 7;
            if (isHomePossession) homeScore += points; else awayScore += points;
            addStep('TOUCHDOWN', `TOUCHDOWN! ${actingTeam.name} finds the endzone!`, q, time, actingTeam.id, getRandomCommentary('TOUCHDOWN'), 'TOUCHDOWN');
          } else if (outcomeSeed > 0.65) {
            // Field Goal
            const points = 3;
            if (isHomePossession) homeScore += points; else awayScore += points;
            addStep('FIELD_GOAL', `${actingTeam.name} settles for a field goal. It's good!`, q, time, actingTeam.id, getRandomCommentary('FIELD_GOAL'), 'FG_GOOD');
          } else if (outcomeSeed > 0.55) {
            // Sack
            addStep('SACK', `DISASTER! ${actingTeam.name} QB is sacked for a huge loss!`, q, time, actingTeam.id, getRandomCommentary('SACK'), 'OOH');
          } else if (outcomeSeed > 0.45) {
            // Turnover
            const turners = ['INTERCEPTION', 'FUMBLE', 'TURNOVER_ON_DOWNS'];
            const type = turners[Math.floor(Math.random() * turners.length)];
            addStep(type as GameEventType, `TURNOVER! ${actingTeam.name} loses control!`, q, time, otherTeam.id, getRandomCommentary(type), 'OOH');
          } else {
            // Punt
            addStep('PUNT', `Defense holds strong. ${actingTeam.name} is forced to punt.`, q, time, otherTeam.id, getRandomCommentary('PUNT'), 'WHISTLE');
          }

          // If it's overtime (q > 4), we stop at the first score
          if (q > 4 && (homeScore !== awayScore)) break;
        }
        
        if (q === 2) {
          addStep('HALF_TIME', `HALF TIME! Score: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, 2, '00:00', undefined, getRandomCommentary('HALF_TIME'), 'DRUM_ROLL');
        } else if (q < 4) {
          addStep('END_OF_QUARTER', `That's the end of Quarter ${q}! Score: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, q, '00:00', undefined, getRandomCommentary('END_OF_QUARTER'), 'WHISTLE');
        }

        // If it's overtime (q > 4), we stop as soon as someone scores
        if (q > 4 && homeScore !== awayScore) break;
    }
  };

  // Run first 4 quarters
  runQuarters(1, 4);

  // Overtime logic
  if (homeScore === awayScore) {
    addStep('OVERTIME_START', `Regulation isn't enough! Score: ${awayScore}-${homeScore}. We're going to OVERTIME!`, 5, '15:00', undefined, getRandomCommentary('OVERTIME_START'), 'WHISTLE');
    
    // Simulate OT - higher chance of scoring to avoid tie
    for (let otDrive = 0; otDrive < 4; otDrive++) {
        if (homeScore !== awayScore) break;
        
        const isHomePossession = Math.random() > 0.5;
        const actingTeam = isHomePossession ? homeTeam : awayTeam;
        const time = `${Math.floor(Math.random() * 5) + 1}:${Math.floor(Math.random() * 40) + 10}`;
        
        const otSeed = Math.random();
        if (otSeed > 0.5) { // 50% chance of score in OT drive to end it
            if (Math.random() > 0.4) {
                homeScore += isHomePossession ? 7 : 0;
                awayScore += isHomePossession ? 0 : 7;
                addStep('TOUCHDOWN', `WALK-OFF TOUCHDOWN! ${actingTeam.name} wins it in Overtime!`, 5, time, actingTeam.id, getRandomCommentary('TOUCHDOWN'), 'CHEER');
            } else {
                homeScore += isHomePossession ? 3 : 0;
                awayScore += isHomePossession ? 0 : 3;
                addStep('FIELD_GOAL', `GAME WINNER! The kick is GOOD! ${actingTeam.name} wins!`, 5, time, actingTeam.id, getRandomCommentary('FIELD_GOAL'), 'CHEER');
            }
        } else {
            addStep('PUNT', `OT continues as ${actingTeam.name} is forced to punt.`, 5, time, undefined, "Keep the heart medication close, folks!", 'WHISTLE');
        }
    }
  }

  addStep('GAME_END', `Game Over! Final: ${awayTeam.name} ${awayScore}, ${homeTeam.name} ${homeScore}`, homeScore === awayScore ? 5 : 4, '00:00', undefined, getRandomCommentary('GAME_END'), homeScore === awayScore ? 'DRUM_ROLL' : 'WHISTLE');

  return steps;
}
