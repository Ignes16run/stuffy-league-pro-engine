import { GameStep } from './gameSimulator';
import { Player, Team } from './types';
import { generateDynamicCommentary, CommentaryContext } from './commentaryEngine';

/**
 * broadcastEngine.ts 
 * 
 * Logic to filter, pace, and enhance a full game simulation into a 
 * 2-3 minute broadcast-worthy highlight reel.
 * 
 * Updated: 2026-03-26T10:46:18-04:00
 */

export interface BroadcastStep extends GameStep {
  playbackDelay: number; // ms to wait after showing this step
}

// --- CONFIGURATION ---
const TARGET_DURATION_MS = 150000; // 2.5 minutes target
const MIN_EVENTS = 18;
const MAX_EVENTS = 30;

/**
 * Main engine entry point.
 * Transforms a full array of steps into a curated broadcast sequence.
 */
export function generateBroadcastSequence(
  fullSteps: GameStep[],
  homeTeam: Team,
  awayTeam: Team,
  players: Player[]
): BroadcastStep[] {
  // 1. Filter for "Broadcast Worthy" moments
  const essentialSteps = fullSteps.filter((step) => {
    // Always include these
    if (step.type === 'KICKOFF' || 
        step.type === 'TOUCHDOWN' || 
        step.type === 'FIELD_GOAL' || 
        step.type === 'INTERCEPTION' || 
        step.type === 'FUMBLE' || 
        step.type === 'TURNOVER_ON_DOWNS' || 
        step.type === 'GAME_END' || 
        step.type === 'HALF_TIME' || 
        step.type === 'OVERTIME_START') return true;

    // High impact
    if (step.type === 'SACK') return true;
    if (step.gain && Math.abs(step.gain) >= 15) return true;
    
    return false;
  });

  // 2. Add padding if too short
  let sequence = [...essentialSteps];
  if (sequence.length < MIN_EVENTS) {
    const fillerCandidates = fullSteps.filter(s => !essentialSteps.includes(s) && (s.soundEffect === 'CHEER' || s.description.includes('First down')));
    const needed = MIN_EVENTS - sequence.length;
    sequence = [...sequence, ...fillerCandidates.slice(0, needed)].sort((a, b) => {
        // We need original indices to sort correctly
        return fullSteps.indexOf(a) - fullSteps.indexOf(b);
    });
  }

  // 3. Trim if too long
  if (sequence.length > MAX_EVENTS) {
     const nonEssential = sequence.filter(s => s.type === 'GAME_START' || s.type === 'PUNT' || s.type === 'SACK');
     const toRemove = sequence.length - MAX_EVENTS;
     // Remove non-essential items from the middle
     for (let i = 0; i < toRemove; i++) {
        const item = nonEssential[Math.floor(Math.random() * nonEssential.length)];
        const idx = sequence.indexOf(item);
        if (idx > -1) sequence.splice(idx, 1);
     }
  }

  // 4. Enhance Commentary & Inject Players with Anti-Repetition
  const recentTemplateIds: string[] = [];
  const enhancedSteps = sequence.map(step => {
    const context: CommentaryContext = { step, homeTeam, awayTeam, players };
    const { text, templateId } = generateDynamicCommentary(context, recentTemplateIds);
    
    // Manage memory (keep last 5)
    recentTemplateIds.push(templateId);
    if (recentTemplateIds.length > 5) recentTemplateIds.shift();

    return {
      ...step,
      description: text,
      commentary: step.commentary // Keep existing high-level context if any
    };
  });

  // 5. Calculate Timings to hit the 2-3 minute window
  const totalEvents = enhancedSteps.length;
  const avgDelay = TARGET_DURATION_MS / totalEvents;

  return enhancedSteps.map(step => ({
    ...step,
    playbackDelay: calculateDelay(step, avgDelay)
  }));
}

/**
 * Calculates how long to display an event based on its significance.
 */
function calculateDelay(step: GameStep, avgBase: number): number {
  let multiplier = 1.0;

  if (step.type === 'TOUCHDOWN') multiplier = 2.4;
  if (step.type === 'FIELD_GOAL' || step.type === 'INTERCEPTION' || step.type === 'FUMBLE') multiplier = 1.8;
  if (step.type === 'HALF_TIME' || step.type === 'OVERTIME_START') multiplier = 1.2;
  if (step.type === 'GAME_END') multiplier = 3.0;

  // Base range 4-8s
  return Math.min(12000, Math.max(3500, avgBase * multiplier));
}
