import { 
  Baby, 
  Cat, 
  Dog, 
  Ghost, 
  Heart, 
  Moon, 
  PawPrint, 
  Star,
  LucideIcon
} from 'lucide-react';
import { StuffyIcon, Team } from './types';

export const STUFFY_ICONS: Record<StuffyIcon, LucideIcon> = {
  TeddyBear: Baby,
  Bunny: Heart,
  Elephant: Star,
  Cat: Cat,
  Dog: Dog,
  Panda: PawPrint,
  Lion: Ghost,
  Monkey: Moon,
};

export const DEFAULT_COLORS = [
  '#FFB7B2', // Pastel Red
  '#FFDAC1', // Pastel Orange
  '#E2F0CB', // Pastel Green
  '#B5EAD7', // Pastel Teal
  '#C7CEEA', // Pastel Blue
  '#F3D1F4', // Pastel Purple
  '#FF9AA2', // Soft Pink
  '#FFCCF9', // Soft Magenta
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#1e293b', // Slate 800
  '#ffffff', // White
];

export const ICON_OPTIONS: StuffyIcon[] = Object.keys(STUFFY_ICONS) as StuffyIcon[];

export const DEFAULT_LEAGUE_TEAMS: Team[] = [
  {
    id: 'bocadilla-univ',
    name: 'Bocadilla University',
    icon: 'Elephant',
    primaryColor: '#F59E0B',
    secondaryColor: '#78350F',
    offenseRating: 85,
    defenseRating: 87,
    specialTeamsRating: 90,
    rivalTeamIds: ['paella-tech'],
    conferenceId: 'AFC',
    divisionId: 'AFC North'
  },
  {
    id: 'paella-tech',
    name: 'Paella Institute of Technology',
    icon: 'Lion',
    primaryColor: '#EF4444',
    secondaryColor: '#7F1D1D',
    offenseRating: 81,
    defenseRating: 83,
    specialTeamsRating: 80,
    rivalTeamIds: ['bocadilla-univ'],
    conferenceId: 'AFC',
    divisionId: 'AFC North'
  },
  {
    id: 'cafe-con-leche',
    name: 'Cafe Con Leche College',
    icon: 'Lion',
    primaryColor: '#F59E0B',
    secondaryColor: '#141414',
    offenseRating: 83,
    defenseRating: 79,
    specialTeamsRating: 78,
    rivalTeamIds: ['kentucky-fried-college'],
    conferenceId: 'NFC',
    divisionId: 'NFC North'
  },
  {
    id: 'alabama-univ',
    name: 'Alabama University',
    icon: 'Elephant',
    primaryColor: '#EF4444',
    secondaryColor: '#141414',
    offenseRating: 82,
    defenseRating: 82,
    specialTeamsRating: 80,
    conferenceId: 'AFC',
    divisionId: 'AFC South'
  },
  {
    id: 'xbox-state',
    name: 'XBOX State',
    icon: 'TeddyBear',
    primaryColor: '#10B981',
    secondaryColor: '#141414',
    offenseRating: 83,
    defenseRating: 84,
    specialTeamsRating: 81,
    rivalTeamIds: ['college-taco-bell'],
    conferenceId: 'NFC',
    divisionId: 'NFC South'
  },
  {
    id: 'college-taco-bell',
    name: 'College of Taco Bell',
    icon: 'TeddyBear',
    primaryColor: '#8B5CF6',
    secondaryColor: '#141414',
    offenseRating: 89,
    defenseRating: 77,
    specialTeamsRating: 77,
    rivalTeamIds: ['xbox-state'],
    conferenceId: 'AFC',
    divisionId: 'AFC South'
  },
  {
    id: 'yale-jr',
    name: 'Yale Jr',
    icon: 'Lion',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E293B',
    offenseRating: 81,
    defenseRating: 92,
    specialTeamsRating: 78,
    rivalTeamIds: ['hershey-univ'],
    conferenceId: 'AFC',
    divisionId: 'AFC North'
  },
  {
    id: 'hershey-univ',
    name: 'Hershey University',
    icon: 'TeddyBear',
    primaryColor: '#78350F',
    secondaryColor: '#FFFFFF',
    offenseRating: 90,
    defenseRating: 85,
    specialTeamsRating: 80,
    rivalTeamIds: ['yale-jr'],
    conferenceId: 'AFC',
    divisionId: 'AFC North'
  },
  {
    id: 'bean-bag-univ',
    name: 'Bean Bag University',
    icon: 'Panda',
    primaryColor: '#C7CEEA',
    secondaryColor: '#141414',
    offenseRating: 80,
    defenseRating: 82,
    specialTeamsRating: 81,
    conferenceId: 'NFC',
    divisionId: 'NFC South'
  },
  {
    id: 'yorks-state',
    name: 'Yorks State',
    icon: 'Cat',
    primaryColor: '#FF9AA2',
    secondaryColor: '#141414',
    offenseRating: 85,
    defenseRating: 84,
    specialTeamsRating: 81,
    conferenceId: 'AFC',
    divisionId: 'AFC South'
  },
  {
    id: 'blankie-college',
    name: 'Blankie College',
    icon: 'Bunny',
    primaryColor: '#FFCCF9',
    secondaryColor: '#141414',
    offenseRating: 87,
    defenseRating: 80,
    specialTeamsRating: 78,
    conferenceId: 'NFC',
    divisionId: 'NFC South'
  },
  {
    id: 'kentucky-fried-college',
    name: 'Kentucky Fried College',
    icon: 'Dog',
    primaryColor: '#EF4444',
    secondaryColor: '#FFFFFF',
    offenseRating: 88,
    defenseRating: 86,
    specialTeamsRating: 40,
    rivalTeamIds: ['cafe-con-leche'],
    conferenceId: 'NFC',
    divisionId: 'NFC North'
  },
  {
    id: 'target-univ',
    name: 'Target University',
    icon: 'Elephant',
    primaryColor: '#EF4444',
    secondaryColor: '#FFFFFF',
    offenseRating: 83,
    defenseRating: 86,
    specialTeamsRating: 80,
    conferenceId: 'NFC',
    divisionId: 'NFC South'
  },
  {
    id: 'kitchen-state',
    name: 'Kitchen State',
    icon: 'Monkey',
    primaryColor: '#B5EAD7',
    secondaryColor: '#141414',
    offenseRating: 79,
    defenseRating: 86,
    specialTeamsRating: 84,
    conferenceId: 'AFC',
    divisionId: 'AFC South'
  },
  {
    id: 'maine-state',
    name: 'Maine State',
    icon: 'Panda',
    primaryColor: '#C7CEEA',
    secondaryColor: '#1E293B',
    offenseRating: 84,
    defenseRating: 86,
    specialTeamsRating: 82,
    conferenceId: 'NFC',
    divisionId: 'NFC North'
  },
  {
    id: 'mercadona-college',
    name: 'Mercadona College',
    icon: 'TeddyBear',
    primaryColor: '#10B981',
    secondaryColor: '#F59E0B',
    offenseRating: 88,
    defenseRating: 82,
    specialTeamsRating: 85,
    conferenceId: 'NFC',
    divisionId: 'NFC North'
  }
];
