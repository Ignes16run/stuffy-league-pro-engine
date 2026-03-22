// Last Updated: 2026-03-22T16:20:00Z
import { Player, AwardsHistoryEntry, NarrativeMemoryEntry, PlayerPosition } from './types';
import { AwardType } from './awards';

export type NarrativeTag = 
  | 'first_time' 
  | 'repeat_winner' 
  | 'back_to_back' 
  | 'comeback' 
  | 'breakout' 
  | 'dynasty';

export interface NarrativeTemplate {
  id: string;
  awardType: AwardType;
  positionGroups?: PlayerPosition[];
  tags: NarrativeTag[];
  content: string; // Has placeholders: {playerName}, {teamName}, {value}, {statName}
  variations?: string[]; // Multiple versions for the same template ID (Option A)
}

const PHRASES = {
  dominant: ["dominant season", "outstanding campaign", "elite performance", "historic run", "masterful display"],
  lead: ["guiding", "powering", "leading", "driving", "propelling"],
  earned: ["secured", "earned", "unlocked", "captured", "clinched"]
};

const getRandomPhrase = (key: keyof typeof PHRASES) => {
  const options = PHRASES[key];
  return options[Math.floor(Math.random() * options.length)];
};

export const NARRATIVE_BANK: NarrativeTemplate[] = [
  // MVP - First Time
  {
    id: 'mvp-breakout',
    awardType: 'MVP',
    tags: ['first_time', 'breakout'],
    content: "{playerName} put together a {phrase_dominant} for {teamName}, {phrase_earned} his first MVP after {phrase_lead} the league with {value} {statName}."
  },
  // MVP - Back to Back
  {
    id: 'mvp-b2b',
    awardType: 'MVP',
    tags: ['back_to_back', 'repeat_winner'],
    content: "{playerName} continues his dominance, securing back-to-back MVP honors after another {phrase_dominant} with {value} {statName}."
  },
  // MVP - Repeat (not necessarily b2b)
  {
    id: 'mvp-repeat',
    awardType: 'MVP',
    tags: ['repeat_winner'],
    content: "{playerName} has done it again. The {teamName} star captures his latest MVP trophy after a {phrase_dominant} totaling {value} {statName}."
  },
  // OPOY - First Time
  {
    id: 'opoy-first',
    awardType: 'OPOY',
    tags: ['first_time'],
    content: "The offensive explosion of {playerName} was the story of the year. He {phrase_earned} OPOY honors after {phrase_lead} the {teamName} attack with {value} {statName}."
  },
  // DPOY
  {
    id: 'dpoy-dominant',
    awardType: 'DPOY',
    tags: ['first_time'],
    content: "A nightmare for opposing offenses, {playerName} {phrase_earned} his first DPOY after a {phrase_dominant} for {teamName} recording {value} {statName}."
  },
  // STPOY (Kicker)
  {
    id: 'stpoy-clutch',
    awardType: 'STPOY',
    tags: ['first_time'],
    content: "{playerName} was the definition of clutch this year, {phrase_earned} STPOY for {teamName} with {value} total points."
  }
];

export function selectNarrativeTemplate(
  awardType: AwardType, 
  position: PlayerPosition,
  history: AwardsHistoryEntry[], 
  memory: NarrativeMemoryEntry[],
  currentSeasonId: string
) {
  // 1. Determine Context Tags
  const tags: NarrativeTag[] = [];
  const awardMatches = history.filter(h => h.awardType === awardType);
  
  if (awardMatches.length === 0) {
    tags.push('first_time');
    tags.push('breakout');
  } else {
    tags.push('repeat_winner');
    const lastSeasonId = (parseInt(currentSeasonId) - 1).toString();
    if (awardMatches.some(h => h.seasonId === lastSeasonId)) {
      tags.push('back_to_back');
    }
  }

  if (awardMatches.length >= 2) {
    tags.push('dynasty');
  }

  // 2. Filter Bank
  let matches = NARRATIVE_BANK.filter(t => t.awardType === awardType);
  
  // Filter by position group if template specifies it
  matches = matches.filter(t => !t.positionGroups || t.positionGroups.includes(position));

  // Filter by tags (try to find the best match)
  const taggedMatches = matches.filter(t => t.tags.some(tag => tags.includes(tag)));
  if (taggedMatches.length > 0) matches = taggedMatches;

  // 3. Apply Memory Filter
  const recentlyUsedIds = memory
    .filter(m => parseInt(m.seasonId) >= parseInt(currentSeasonId) - 2)
    .map(m => m.templateId);

  const cleanMatches = matches.filter(m => !recentlyUsedIds.includes(m.id));
  
  // 4. Select Final
  const pool = cleanMatches.length > 0 ? cleanMatches : matches;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Generates the full narrative string
 */
export function generateNarrative(
  player: Player, 
  awardType: AwardType, 
  teamName: string,
  statValue: string | number,
  statName: string,
  template: NarrativeTemplate
): string {
  let text = template.content;

  // Replace phrases (Option B)
  text = text.replace('{phrase_dominant}', getRandomPhrase('dominant'));
  text = text.replace('{phrase_lead}', getRandomPhrase('lead'));
  text = text.replace('{phrase_earned}', getRandomPhrase('earned'));

  // Replace placeholders
  text = text.replace('{playerName}', player.name);
  text = text.replace('{teamName}', teamName);
  text = text.replace('{value}', statValue.toString());
  text = text.replace('{statName}', statName);

  return text;
}
