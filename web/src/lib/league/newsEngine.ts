// Last Updated: 2026-03-27T01:10:00-04:00
import { Game, Team, Player, NewsStory } from './types';
import { generateUUID } from './utils';

const RECAP_TEMPLATES = [
  "The {winner} utterly dismantled {loser} in a shocking display of dominance.",
  "A defensive masterclass ends in a nail-biter as {winner} edge out {loser}.",
  "Points raining from the sky! {winner} and {loser} combine for {total} points in a track meet.",
  "David defeats Goliath! The underdog {winner} shock the mighty {loser}.",
  "The {winner} continue their reign of terror, leaving {loser} in the dust.",
  "A quiet afternoon for the scorekeepers as {winner} grind out a win against {loser}."
];

const DRAMA_TEMPLATES = [
  "Sources say {player} was seen eating extra honey instead of training. {team} coaches are not amused.",
  "LEAK: {player} is demanding a custom silk jersey. Is there trouble in the {team} locker room?",
  "Spotted: {player} having a secret meeting with an agent from the {rival} camp. Treason or tea time?",
  "{player} takes to StuffyGram to claim they are 'too fluffy for this league'. Team officials have no comment.",
  "TRAGEDY: {player} has lost their favorite button. Performance issues expected for {team} this week.",
];

const INTERVIEW_TEMPLATES = [
  "'{quote}' - {player} gives a cryptic post-game interview after the {team} result.",
  "'{quote}' - {player} reflects on the victory over {rival}.",
  "'{quote}' - Coach {team_name} reflects on a tough loss.",
];

const QUOTES = [
  "We gave it 110% fluff out there today.",
  "The grass was a bit too ticklish on my paws, but we made it work.",
  "Honestly? I just wanted a nap, but then I saw the ball.",
  "Cotton candy in the locker room really made the difference.",
  "I'm not saying it was rigged, but the ref's ears were very floppy today.",
  "It's about the stitches in your heart, not the stitches on the ball."
];

export function generateWeeklyNews(week: number, currentGames: Game[], teams: Team[], players: Player[]): NewsStory[] {
  const stories: NewsStory[] = [];
  const now = new Date().toISOString();

  // 1. Recaps for every game
  currentGames.forEach(game => {
    if (game.homeScore === undefined || game.awayScore === undefined) return;

    const homeTeam = teams.find(t => t.id === game.homeTeamId);
    const awayTeam = teams.find(t => t.id === game.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const winner = game.homeScore > game.awayScore ? homeTeam : (game.awayScore > game.homeScore ? awayTeam : null);
    const loser = winner === homeTeam ? awayTeam : homeTeam;
    const totalPoints = game.homeScore + game.awayScore;
    const diff = Math.abs(game.homeScore - game.awayScore);

    let title = "";
    let content = "";

    if (!winner) {
      title = `Stalemate: ${homeTeam.name} vs ${awayTeam.name}`;
      content = `Neither side could find the final push in a gritty 14-14 draw. "It's like looking in a mirror," said one spectator.`;
    } else {
      const isBlowout = diff >= 21;
      const isHighScoring = totalPoints >= 45;
      const isNailBiter = diff <= 3;
      
// Updated: 2026-03-31T16:15:00-04:00
      let template = RECAP_TEMPLATES[Math.floor(Math.random() * RECAP_TEMPLATES.length)]; // Use all templates
      if (isBlowout) template = RECAP_TEMPLATES[0];
      else if (isNailBiter) template = RECAP_TEMPLATES[1];
      else if (isHighScoring) template = RECAP_TEMPLATES[2];

      title = `${winner.name} ${isBlowout ? 'Crushes' : 'Defeats'} ${loser.name}`;
      content = template
        .replace("{winner}", winner.name)
        .replace("{loser}", loser.name)
        .replace("{total}", totalPoints.toString());
    }

// Updated: 2026-03-31T16:17:00-04:00
    stories.push({
      id: generateUUID(),
      week,
      type: 'GAME_RECAP',
      title,
      content,
      relatedTeamIds: [game.homeTeamId, game.awayTeamId],
      gameId: game.id,
      timestamp: now
    });
  });

  // 2. Add 1-2 Drama stories
  const dramaCount = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < dramaCount; i++) {
    const randomPlayer = players[Math.floor(Math.random() * players.length)];
    const playerTeam = teams.find(t => t.id === randomPlayer.teamId);
    const rival = teams.filter(t => t.id !== randomPlayer.teamId)[Math.floor(Math.random() * (teams.length - 1))];
    if (!randomPlayer || !playerTeam) continue;

    const template = DRAMA_TEMPLATES[Math.floor(Math.random() * DRAMA_TEMPLATES.length)];
    const content = template
      .replace("{player}", randomPlayer.name)
      .replace("{team}", playerTeam.name)
      .replace("{rival}", rival?.name || "the league");

    stories.push({
      id: generateUUID(),
      week,
      type: 'PLAYER_DRAMA',
      title: `Drama Alert: ${randomPlayer.name}`,
      content,
      relatedPlayerIds: [randomPlayer.id],
      relatedTeamIds: [playerTeam.id],
      timestamp: now
    });
  }

  // 3. Add an Interview
  const interviewPlayer = players[Math.floor(Math.random() * players.length)];
  const interviewTeam = teams.find(t => t.id === interviewPlayer.teamId);
  const rival = teams.find(t => t.id !== interviewPlayer?.teamId);
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const template = INTERVIEW_TEMPLATES[Math.floor(Math.random() * INTERVIEW_TEMPLATES.length)];
  
  stories.push({
    id: generateUUID(),
    week,
    type: 'INTERVIEW',
    title: `Exclusive: Behind the Fluff`,
    content: template
      .replace("{quote}", quote)
      .replace("{player}", interviewPlayer.name)
      .replace("{team}", interviewTeam?.name || "Team")
      .replace("{team_name}", interviewTeam?.name || "Team")
      .replace("{rival}", rival?.name || "the opponent"),
    relatedPlayerIds: [interviewPlayer.id],
    timestamp: now
  });

  return stories;
}
