// Last Updated: 2026-03-22T17:35:00Z
import { Player, PlayerPosition, PlayerAbility, PlayerStats } from './types';
import { generateWeightedOVR, generateInitialRatings, calculateOVR } from './ratings';
import { POSITION_CONFIGS } from './position-system';

const FIRST_NAMES = [
  "Buster", "Bubbles", "Cuddles", "Duffy", "Fluffy", "Gizmo", "Hugs", "Jiggles",
  "Lucky", "Muffin", "Noodles", "Puddles", "Rusty", "Snuggles", "Tippy", "Whiskers",
  "Ziggy", "Barnaby", "Casper", "Dexter", "Felix", "Gunner", "Hunter", "Jasper",
  "Leo", "Max", "Oliver", "Pip", "Rex", "Sammy", "Toby", "Zane"
];

const LAST_NAMES = [
  "Cotton", "Wool", "Felt", "Stitch", "Button", "Patch", "Thread", "Fleece",
  "Velvet", "Satin", "Denim", "Linen", "Silk", "Flannel", "Corduroy", "Tweed",
  "Bear", "Bunny", "Kitty", "Puppy", "Elephant", "Giraffe", "Lion", "Tiger",
  "Blue", "Red", "Green", "Yellow", "Orange", "Purple", "Pink", "Gold"
];

const ARCHETYPES = [
  { name: "The Veteran", profile: "Experienced and reliable, provides leadership to the team." },
  { name: "The Rookie", profile: "Young and energetic with high potential but prone to mistakes." },
  { name: "The Speedster", profile: "Focuses on agility and quickness to outpace opponents." },
  { name: "The Powerhouse", profile: "Relies on brute strength and physical dominance." },
  { name: "The Tactician", profile: "Highly intelligent and excels at positioning and strategy." },
  { name: "The Underdog", profile: "Small in stature but big on heart and determination." }
];

export function generateTeamRoster(teamId: string): Player[] {
  const roster: Player[] = [];
  
  // Personnel configuration (Total = 23)
  const positions: { pos: PlayerPosition; count: number }[] = [
    { pos: 'QB', count: 1 },
    { pos: 'RB', count: 2 },
    { pos: 'WR', count: 2 },
    { pos: 'TE', count: 1 },
    { pos: 'OL', count: 5 },
    { pos: 'K',  count: 1 },
    { pos: 'DL', count: 2 },
    { pos: 'EDGE', count: 2 },
    { pos: 'CB', count: 3 },
    { pos: 'S',  count: 2 },
    { pos: 'LB', count: 2 },
  ];

  // Audit: Only generate players for ENABLED positions
  positions.forEach(({ pos, count }) => {
    if (POSITION_CONFIGS[pos]?.isEnabled) {
        for (let i = 0; i < count; i++) {
            roster.push(createPlayer(teamId, pos));
        }
    }
  });

  return roster;
}

function createPlayer(teamId: string, position: PlayerPosition): Player {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  
  const baseRating = generateWeightedOVR(); 
  const initialAbilities = generateInitialRatings(position, baseRating);
  const derivedRating = calculateOVR(initialAbilities);
  
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `p-${Math.random().toString(36).substring(2, 11)}`,
    teamId,
    name: `${firstName} ${lastName}`,
    position,
    rating: derivedRating,
    archetype: archetype.name,
    jerseyNumber: Math.floor(Math.random() * 100).toString().padStart(2, '0'),
    profile: archetype.profile,
    abilities: initialAbilities,
    stats: {
      gamesPlayed: 0,
      points: 0,
      tackles: 0,
      yards: 0,
      touchdowns: 0
    },
    careerStats: {
      gamesPlayed: 0,
      points: 0,
      tackles: 0,
      yards: 0,
      touchdowns: 0
    },
    awards: []
  };
}

export function migratePlayerRatings(player: Player): Player {
  if (player.abilities && player.abilities.length === 5) return player;
  
  const migratedAbilities = generateInitialRatings(player.position, player.rating);
  return {
    ...player,
    abilities: migratedAbilities,
    rating: calculateOVR(migratedAbilities)
  };
}
