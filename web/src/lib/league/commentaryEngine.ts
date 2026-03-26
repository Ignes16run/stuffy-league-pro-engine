import { GameStep } from './gameSimulator';
import { Player, Team } from './types';

/**
 * commentaryEngine.ts
 * 
 * A modular commentary template and variation system for the Stuffy League broadcast.
 * Provides deterministic, varied commentary without AI dependencies.
 * 
 * Updated: 2026-03-26T11:02:01-04:00
 */

export type CommentaryCategory = 
  | 'SHORT_RUN' | 'LONG_RUN' | 'SHORT_PASS' | 'DEEP_PASS' 
  | 'TD_PASS' | 'TD_RUN' | 'FIELD_GOAL' | 'SACK' 
  | 'INTERCEPTION' | 'FUMBLE' | 'TURNOVER_DOWNS' 
  | 'RED_ZONE' | 'CLUTCH' | 'GENERIC_TRANSITION' | 'KICKOFF';

interface TemplatePool {
  [key: string]: string[];
}

const TEMPLATES: TemplatePool = {
  SHORT_RUN: [
    "{playerName} finds a small gap for {yards} yards.",
    "A hard-fought {yards} yard gain by {playerName}.",
    "{teamName} keeps it on the ground, {playerName} with a short burst.",
    "Routine stop by the defense after {playerName} picks up {yards}."
  ],
  LONG_RUN: [
    "{playerName} breaks free! He's got room! A massive {yards} yard gain!",
    "Look at {playerName} go! Shaking off tackles for {yards} yards!",
    "Explosive run by {playerName}! He puts {teamName} in great position with {yards} yards.",
    "{playerName} finds the seam and bursts through for {yards}!"
  ],
  SHORT_PASS: [
    "{playerName} with a quick strike over the middle.",
    "Efficient pass by {playerName} to move the chains.",
    "{playerName} connects for a short gain of {yards}.",
    "Quick release from {playerName}, {teamName} is moving methodically."
  ],
  DEEP_PASS: [
    "{playerName} UNLEASHES A CANNON! Deep down the sideline!",
    "A beautiful spiral from {playerName}! {yards} yards through the air!",
    "{playerName} goes long! What a catch by the receiver!",
    "Big time throw from {playerName}! That's {yards} yards of pure air mail!"
  ],
  TD_PASS: [
    "{playerName} finds the open man... TOUCHDOWN {teamName}!",
    "A pinpoint strike by {playerName}! SIX POINTS!",
    "{playerName} lofts it up... CAUGHT! TOUCHDOWN!",
    "What a drive! {playerName} caps it off with a masterful TD pass!"
  ],
  TD_RUN: [
    "{playerName} plows through! TOUCHDOWN!",
    "{playerName} finds the pylon! {teamName} scores!",
    "No stopping {playerName} there! He carries the whole defense into the endzone!",
    "Touchdown {teamName}! {playerName} with the elite vision."
  ],
  FIELD_GOAL: [
    "The kick is up... and IT IS GOOD!",
    "Straight through the uprights for {teamName}!",
    "A perfect kick! {teamName} adds three to the board.",
    "No doubt about that one. Clean strike."
  ],
  SACK: [
    "SACKED! {playerName} had nowhere to go!",
    "The pocket collapses! A huge loss for {teamName}!",
    "Defensive dominance! {playerName} is taken down in the backfield.",
    "Nowhere to run, nowhere to hide. Big time sack!"
  ],
  INTERCEPTION: [
    "PICKED OFF! {teamName} turns it over!",
    "INTERCEPTED! The defense read that all the way!",
    "A disaster for {playerName}! That ball is going the other way!",
    "The ball is up for grabs... and the defense snags it!"
  ],
  FUMBLE: [
    "FUMBLE! The ball is loose!",
    "He dropped the rock! Who's got it?!",
    "Ball is on the turf! {teamName} gives it up!",
    "Stripped! The defense comes up with a huge takeaway!"
  ],
  TURNOVER_DOWNS: [
    "Stopped! The defense clears the field on 4th down!",
    "{teamName} fails to convert! A massive stand by the defense.",
    "Turnover on downs! Momentum just shifted entirely.",
    "The gamble doesn't pay off. Defense takes over."
  ],
  RED_ZONE: [
    "{teamName} is knocking on the door here.",
    "First and Goal! This is where champions are made.",
    "In the Red Zone now. {playerName} looking for the score.",
    "The field is shrinking. Can the defense hold?"
  ],
  CLUTCH: [
    "Game on the line... {playerName} steps up!",
    "CLUTCH moment for {teamName}! Can they deliver?",
    "Under pressure, {playerName} stays cool as ice.",
    "This is what we wait for! Late game heroics needed."
  ],
  GENERIC_TRANSITION: [
    "{teamName} huddles up for the next play.",
    "Let's see how they respond after that one.",
    "Methodical drive continuing for {teamName}.",
    "The tempo is picking up now."
  ],
  KICKOFF: [
    "And we are underway! {teamName} back to receive.",
    "The kick is deep! Let's get this game started.",
    "Kickoff time! Elite competition starts now.",
    "Booming kick to start the action."
  ]
};

export interface CommentaryContext {
  step: GameStep;
  homeTeam: Team;
  awayTeam: Team;
  players: Player[];
}

/**
 * Main entry point for generating dynamic commentary.
 */
export function generateDynamicCommentary(
  context: CommentaryContext,
  recentTemplateIds: string[]
): { text: string; templateId: string } {
  const { step, homeTeam, awayTeam, players } = context;
  const isHome = step.teamInPossessionId === homeTeam.id;
  const team = isHome ? homeTeam : awayTeam;
  
  // Find key players
  const teamPlayers = players.filter(p => p.teamId === team.id);
  const qb = (teamPlayers.find(p => p.position === 'QB') || { name: 'The QB' }) as Player;
  const rb = (teamPlayers.find(p => p.position === 'RB') || { name: 'The RB' }) as Player;
  const wr = (teamPlayers.find(p => p.position === 'WR') || { name: 'The WR' }) as Player;

  // 1. Determine Category
  const category = determineCategory(step);
  
  // 2. Select Template (with anti-repetition)
  const pool = TEMPLATES[category] || TEMPLATES['GENERIC_TRANSITION'];
  const { template, templateId } = selectBalancedTemplate(category, pool, recentTemplateIds);

  // 3. Resolve Placeholders
  const resolvedText = template
    .replace(/{playerName}/g, resolvePlayerName(step, qb, rb, wr))
    .replace(/{teamName}/g, team.name)
    .replace(/{yards}/g, Math.abs(step.gain || 0).toString())
    .replace(/{quarter}/g, step.quarter.toString())
    .replace(/{downDistance}/g, step.distance === 'Goal' ? `${step.down} & Goal` : `${step.down} & ${step.distance}`);

  return { text: resolvedText, templateId };
}

/**
 * Picks a template from the pool while avoiding recently used ones.
 */
function selectBalancedTemplate(category: string, pool: string[], recentIds: string[]): { template: string; templateId: string } {
  // Simple ID is category + index
  const available = pool.map((t, i) => ({ template: t, id: `${category}_${i}` }));
  
  // Filter out recently used if we have choices
  let candidates = available.filter(item => !recentIds.includes(item.id));
  
  if (candidates.length === 0) candidates = available; // Fallback if all recently used

  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return { template: selected.template, templateId: selected.id };
}

function determineCategory(step: GameStep): CommentaryCategory {
  if (step.type === 'KICKOFF') return 'KICKOFF';
  if (step.type === 'TOUCHDOWN') {
    return step.description.toLowerCase().includes('pass') ? 'TD_PASS' : 'TD_RUN';
  }
  if (step.type === 'FIELD_GOAL') return 'FIELD_GOAL';
  if (step.type === 'SACK') return 'SACK';
  if (step.type === 'INTERCEPTION') return 'INTERCEPTION';
  if (step.type === 'FUMBLE') return 'FUMBLE';
  if (step.type === 'PUNT') return 'GENERIC_TRANSITION';
  if (step.type === 'TURNOVER_ON_DOWNS') return 'TURNOVER_DOWNS';

  // Gain-based pass/run logic
  const isPass = step.description.toLowerCase().includes('pass') || step.description.toLowerCase().includes('complete');
  const yards = Math.abs(step.gain || 0);

  if (isPass) {
    return yards > 15 ? 'DEEP_PASS' : 'SHORT_PASS';
  } else {
    return yards > 10 ? 'LONG_RUN' : 'SHORT_RUN';
  }
}

function resolvePlayerName(step: GameStep, qb: Player, rb: Player, wr: Player): string {
  if (step.type === 'SACK') return qb.name;
  if (step.description.toLowerCase().includes('pass')) return qb.name;
  if (step.description.toLowerCase().includes('run') || step.description.toLowerCase().includes('rush')) return rb.name;
  
  // Randomly assign to a skill player if generic
  const r = Math.random();
  if (r > 0.6) return wr.name;
  if (r > 0.3) return rb.name;
  return qb.name;
}

