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

export interface TeamStats {
  totalYards: number;
  passingYards: number;
  rushingYards: number;
  firstDowns: number;
  turnovers: number;
  penalties: number;
}

export interface GameStep {
  type: GameEventType;
  description: string;
  commentary?: string;
  soundEffect?: SoundEffectType;
  homeScore: number;
  awayScore: number;
  timeRemaining: string;
  quarter: number;
  teamInPossessionId?: string;
  // Enriched Data for Ultra-Realism
  down?: number;
  distance?: number | string;
  yardLine?: number;
  sideOfField?: string;
  gain?: number;
  isScoringPlay?: boolean;
  stats?: {
    home: TeamStats;
    away: TeamStats;
  };
}

export function simulateGameSteps(
  game: Game, 
  homeTeam: Team, 
  awayTeam: Team,
  initialBoosts: { home: number; away: number } = { home: 0, away: 0 }
): GameStep[] {
  const steps: GameStep[] = [];
  let homeScore = 0;
  let awayScore = 0;
  const homeStats: TeamStats = { totalYards: 0, passingYards: 0, rushingYards: 0, firstDowns: 0, turnovers: 0, penalties: 0 };
  const awayStats: TeamStats = { totalYards: 0, passingYards: 0, rushingYards: 0, firstDowns: 0, turnovers: 0, penalties: 0 };
  
  let currentQuarter = 1;
  let currentTimeSeconds = 15 * 60; // 15 mins per quarter
  let possessionId = Math.random() > 0.5 ? homeTeam.id : awayTeam.id; 
  let yardLine = 25; 
  let sideOfField = possessionId === homeTeam.id ? 'HOME' : 'AWAY';
  let down = 1;
  let distance = 10;
  let otRound = 0;

  const addStep = (type: GameEventType, description: string, options: Partial<GameStep> = {}) => {
    const timeMins = Math.floor(currentTimeSeconds / 60);
    const timeSecs = currentTimeSeconds % 60;
    
    steps.push({
      type,
      description,
      homeScore,
      awayScore,
      timeRemaining: currentQuarter > 4 ? "OT" : `${timeMins.toString().padStart(2, '0')}:${timeSecs.toString().padStart(2, '0')}`,
      quarter: currentQuarter,
      teamInPossessionId: possessionId,
      down,
      distance,
      yardLine,
      sideOfField,
      stats: {
        home: { ...homeStats },
        away: { ...awayStats }
      },
      ...options
    });
  };

  const arcadeCommentary: Record<string, string[]> = {
    'TOUCHDOWN': ["BOOM SHAKALAKA!", "HE'S ON FIRE!", "FROM DOWNTOWN BABY!", "PUT IT ON THE BOARD!", "TO THE HOUSE!", "CAN'T BE STOPPED!"],
    'FIELD_GOAL': ["YES! IT'S GOOD!", "AUTOMATIC!", "FROM DEEP... YES!", "SPLIT THE UPRIGHTS!"],
    'SACK': ["GET THAT OUTTA HERE!", "NOT IN MY HOUSE!", "CRUNCH TIME!", "TOTAL DESTRUCTION!", "TERMINATED!"],
    'INTERCEPTION': ["INTERCEPTED! NO WAY!", "GIMME THAT BALL!", "THIEVERY ON THE FIELD!", "STOLEN!"],
    'FUMBLE': ["BALL IS LOOSE!", "MISTAKE! TURNOVER!", "DISASTER!", "THEY DROPPED THE ROCK!"],
    'TURNOVER_ON_DOWNS': ["DENIED!", "BRICK WALL!", "TURNOVER ON DOWNS!", "NOT TODAY!"],
    'PUNT': ["OUTTA HERE!", "BOOTED!", "SEND IT BACK!", "CAN'T GET PAST 'EM!"],
    'KICKOFF': ["KICKOFF! LET'S GO!", "GAME START!", "READY FOR ACTION!"]
  };

  const getArcadeCommentary = (type: string) => {
    const list = arcadeCommentary[type] || ["UNBELIEVABLE PLAY!", "DID YOU SEE THAT?!", "ARCADE ACTION!"];
    return list[Math.floor(Math.random() * list.length)];
  };

  // Intro
  addStep('KICKOFF', `WELCOME TO STUFFY LEAGUE ARCADE! ${awayTeam.name} @ ${homeTeam.name}!`, { soundEffect: 'KICKOFF' });
  
  // Simulation Loop
  while (currentQuarter <= 4) {
    if (currentTimeSeconds <= 0) {
      if (currentQuarter === 2) {
        addStep('HALF_TIME', "HALF TIME! GET READY FOR THE SHOW!", { soundEffect: 'DRUM_ROLL' });
      } else {
        addStep('END_OF_QUARTER', `QUARTER ${currentQuarter} OVER!`, { soundEffect: 'WHISTLE' });
      }
      currentQuarter++;
      if (currentQuarter > 4) break;
      currentTimeSeconds = 15 * 60;
      if (currentQuarter === 3) {
          possessionId = possessionId === homeTeam.id ? awayTeam.id : homeTeam.id;
          yardLine = 25;
          sideOfField = possessionId === homeTeam.id ? 'HOME' : 'AWAY';
      }
    }

    const isHome = possessionId === homeTeam.id;
    const actingStats = isHome ? homeStats : awayStats;
    const boost = isHome ? initialBoosts.home : initialBoosts.away;
    const offensePower = ((isHome ? homeTeam.overallRating : awayTeam.overallRating) || 75) + (boost * 0.5);
    const defensePower = (isHome ? awayTeam.overallRating : homeTeam.overallRating) || 75;

    const playSeed = Math.random();
    let gain = 0;
    let playType: GameEventType = 'GAME_START';
    let soundEffect: SoundEffectType | undefined;
    let description = "";

    if (down < 4) {
      const successChance = 0.45 + (offensePower - defensePower) / 200;
      if (playSeed < 0.02) {
        playType = 'INTERCEPTION';
        description = `TURNOVER! ${isHome ? homeTeam.name : awayTeam.name} pass is PICKED!`;
        actingStats.turnovers++;
        soundEffect = 'OOH';
        possessionId = isHome ? awayTeam.id : homeTeam.id;
        yardLine = 100 - yardLine;
        sideOfField = sideOfField === 'HOME' ? 'AWAY' : 'HOME';
        down = 1; distance = 10;
      } else if (playSeed < 0.035) {
        playType = 'FUMBLE';
        description = `${isHome ? homeTeam.name : awayTeam.name} FUMBLES THE BALL!`;
        actingStats.turnovers++;
        soundEffect = 'OOH';
        possessionId = isHome ? awayTeam.id : homeTeam.id;
        yardLine = 100 - yardLine;
        sideOfField = sideOfField === 'HOME' ? 'AWAY' : 'HOME';
        down = 1; distance = 10;
      } else if (playSeed < 0.10) {
        playType = 'SACK';
        gain = -Math.floor(Math.random() * 8) - 4;
        description = `CRUNCHED! ${isHome ? homeTeam.name : awayTeam.name} is SACKED for ${Math.abs(gain)} yards!`;
        soundEffect = 'OOH';
        down++;
        distance -= gain;
        yardLine += gain;
      } else if (playSeed < successChance) {
        gain = Math.floor(Math.random() * 12) + 1;
        if (Math.random() > 0.92) gain += Math.floor(Math.random() * 25);
        description = `${isHome ? homeTeam.name : awayTeam.name} rips off ${gain} yards!`;
        actingStats.totalYards += gain;
        yardLine += gain;
        if (yardLine >= 100) {
          playType = 'TOUCHDOWN';
          description = `UNBELIEVABLE! TOUCHDOWN ${isHome ? homeTeam.name : awayTeam.name}!`;
          if (isHome) homeScore += 7; else awayScore += 7;
          soundEffect = 'TOUCHDOWN';
          possessionId = isHome ? awayTeam.id : homeTeam.id;
          yardLine = 25;
          sideOfField = isHome ? 'AWAY' : 'HOME';
          down = 1; distance = 10;
        } else if (gain >= distance) {
          actingStats.firstDowns++;
          down = 1; distance = Math.min(10, 100 - yardLine);
          description += " NEW SET OF DOWNS!";
          soundEffect = 'CHEER';
        } else {
          down++; distance -= gain;
        }
      } else {
        description = `${isHome ? homeTeam.name : awayTeam.name}'s play is SHUT DOWN!`;
        down++;
      }
    } else {
      if (yardLine > 65) {
        const fgChance = 0.85 - (yardLine - 65) / 100;
        if (Math.random() < fgChance) {
          playType = 'FIELD_GOAL';
          description = `FROM DISTANCE... IT'S GOOD! ${isHome ? homeTeam.name : awayTeam.name} strikes for 3!`;
          if (isHome) homeScore += 3; else awayScore += 3;
          soundEffect = 'FG_GOOD';
        } else {
          description = `THE KICK IS WIDE! NO GOOD!`;
          soundEffect = 'OOH';
        }
        possessionId = isHome ? awayTeam.id : homeTeam.id;
        yardLine = 25;
        sideOfField = isHome ? 'AWAY' : 'HOME';
        down = 1; distance = 10;
      } else {
        playType = 'PUNT';
        const puntYards = 35 + Math.floor(Math.random() * 20);
        description = `${isHome ? homeTeam.name : awayTeam.name} punts it away! ${puntYards} yards.`;
        soundEffect = 'WHISTLE';
        possessionId = isHome ? awayTeam.id : homeTeam.id;
        yardLine = Math.max(10, 100 - (yardLine + puntYards));
        sideOfField = sideOfField === 'HOME' ? 'AWAY' : 'HOME';
        down = 1; distance = 10;
      }
    }

    currentTimeSeconds -= (30 + Math.floor(Math.random() * 15)); 
    addStep(playType, description, { 
      commentary: playType !== 'GAME_START' ? getArcadeCommentary(playType) : "NEXT PLAY COMIN' UP!",
      soundEffect, gain,
      isScoringPlay: playType === 'TOUCHDOWN' || playType === 'FIELD_GOAL'
    });
  }

  // COLLEGIATE OVERTIME
  if (homeScore === awayScore) {
    currentQuarter = 5;
    addStep('OVERTIME_START', "COLLEGIATE OVERTIME! BALL ON THE 25!", { soundEffect: 'WHISTLE' });
    
    while (homeScore === awayScore && otRound < 5) {
      otRound++;
      // Round: Each team gets one possession from the 25
      const roundTeams = [awayTeam, homeTeam]; // Away team usually goes first in NCAA
      const roundScores = [0, 0];

      for (let i = 0; i < 2; i++) {
        const team = roundTeams[i];
        possessionId = team.id;
        yardLine = 75; // 25 yards to go (100 - 25 = 75 is wrong, 100 - yardline = distance to endzone. yardLine 75 means 25 to go)
        sideOfField = team.id === homeTeam.id ? 'AWAY' : 'HOME'; // On opponent's side
        down = 1;
        distance = 10;
        let possessionActive = true;

        addStep('GAME_START', `${team.name} possession begins at the 25!`);

        while (possessionActive) {
          const isHome = team.id === homeTeam.id;
          const boost = isHome ? initialBoosts.home : initialBoosts.away;
          const offensePower = ((isHome ? homeTeam.overallRating : awayTeam.overallRating) || 75) + (boost * 0.5);
          const defensePower = (isHome ? awayTeam.overallRating : homeTeam.overallRating) || 75;

          const playSeed = Math.random();
          if (down < 4) {
            const successChance = 0.45 + (offensePower - defensePower) / 200;
            if (playSeed < 0.05) { // Higher turnover risk in OT pressure
              addStep('INTERCEPTION', `PICKED OFF! Possession ends!`, { soundEffect: 'OOH' });
              possessionActive = false;
            } else if (playSeed < successChance) {
              const gain = Math.floor(Math.random() * 8) + 2;
              yardLine += gain;
              if (yardLine >= 100) {
                roundScores[i] = 7;
                if (isHome) homeScore += 7; else awayScore += 7;
                addStep('TOUCHDOWN', `TOUCHDOWN ${team.name}!`, { soundEffect: 'TOUCHDOWN', isScoringPlay: true });
                possessionActive = false;
              } else if (gain >= distance) {
                down = 1; distance = Math.min(10, 100 - yardLine);
                addStep('GAME_START', `First down ${team.name}!`);
              } else {
                down++; distance -= gain;
                addStep('GAME_START', `${team.name} gains ${gain} yards.`);
              }
            } else {
              down++;
              addStep('GAME_START', `Incomplete pass.`);
            }
          } else {
            // 4th Down in OT: Always Field Goal
            if (Math.random() < 0.85) {
              roundScores[i] = 3;
              if (isHome) homeScore += 3; else awayScore += 3;
              addStep('FIELD_GOAL', `FIELD GOAL IS GOOD!`, { soundEffect: 'FG_GOOD', isScoringPlay: true });
            } else {
              addStep('FIELD_GOAL', `MISSED! No points.`, { soundEffect: 'OOH' });
            }
            possessionActive = false;
          }
        }
      }
      
      if (homeScore !== awayScore) break;
      addStep('OVERTIME_START', `Tied index at ${homeScore}! Moving to next OT round.`);
    }
  }

  addStep('GAME_END', `GAME OVER! FINAL SCORE: ${homeScore} - ${awayScore}`, { soundEffect: 'WHISTLE' });
  return steps;
}
