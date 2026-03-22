// Last Updated: 2026-03-21T15:42:00-04:00
import { Player, PlayerPosition, PlayerAbility } from './types';

// Use native crypto.randomUUID() for ID generation to avoid external dependencies

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

const POSITIONS: PlayerPosition[] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K'];

export function generateTeamRoster(teamId: string): Player[] {
  const roster: Player[] = [];
  
  // Required core positions
  roster.push(createPlayer(teamId, 'QB'));
  roster.push(createPlayer(teamId, 'RB'));
  roster.push(createPlayer(teamId, 'WR'));
  roster.push(createPlayer(teamId, 'WR'));
  roster.push(createPlayer(teamId, 'TE'));
  roster.push(createPlayer(teamId, 'OL'));
  roster.push(createPlayer(teamId, 'DL'));
  roster.push(createPlayer(teamId, 'DL'));
  roster.push(createPlayer(teamId, 'LB'));
  roster.push(createPlayer(teamId, 'LB'));
  roster.push(createPlayer(teamId, 'DB'));
  roster.push(createPlayer(teamId, 'DB'));
  roster.push(createPlayer(teamId, 'K'));

  return roster;
}

function createPlayer(teamId: string, position: PlayerPosition): Player {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  
  const baseRating = 70 + Math.floor(Math.random() * 20); // 70-90 initial
  
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `p-${Math.random().toString(36).substring(2, 11)}`,
    teamId,
    name: `${firstName} ${lastName}`,
    position,
    rating: baseRating,
    archetype: archetype.name,
    jerseyNumber: Math.floor(Math.random() * 100).toString().padStart(2, '0'),
    profile: archetype.profile,
    abilities: generateAbilities(position, baseRating),
    stats: {
      gamesPlayed: 0,
      points: 0,
      assists: 0,
      tackles: 0,
      interceptions: 0,
      yards: 0,
      touchdowns: 0
    }
  };
}

function generateAbilities(position: PlayerPosition, baseRating: number): PlayerAbility[] {
  const abilities: PlayerAbility[] = [];
  const primaryAbilityVal = Math.min(99, baseRating + 5);
  const secondaryAbilityVal = Math.min(99, baseRating - 5);

  switch (position) {
    case 'QB':
      abilities.push({ name: 'Arm Strength', value: primaryAbilityVal, description: 'Power behind throws' });
      abilities.push({ name: 'Accuracy', value: secondaryAbilityVal, description: 'Precision passing' });
      break;
    case 'WR':
      abilities.push({ name: 'Speed', value: primaryAbilityVal, description: 'Top end velocity' });
      abilities.push({ name: 'Hands', value: secondaryAbilityVal, description: 'Catching reliability' });
      break;
    case 'RB':
      abilities.push({ name: 'Agility', value: primaryAbilityVal, description: 'Quick cuts and moves' });
      abilities.push({ name: 'Stability', value: secondaryAbilityVal, description: 'Balance after contact' });
      break;
    case 'DL':
    case 'OL':
      abilities.push({ name: 'Strength', value: primaryAbilityVal, description: 'Pushing power' });
      abilities.push({ name: 'Stance', value: secondaryAbilityVal, description: 'Defensive/Offensive leverage' });
      break;
    default:
      abilities.push({ name: 'Motor', value: primaryAbilityVal, description: 'Consistent effort' });
      abilities.push({ name: 'IQ', value: secondaryAbilityVal, description: 'Game awareness' });
  }

  return abilities;
}
