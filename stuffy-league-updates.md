# Stuffy League Feature Updates

## 📋 Features Implemented

- **Team Records on Schedule**: Displaying W-L-T records under team names on the `SeasonPredictor` screen.
- **Season Length Setting**: Added a configuration modal to choose the number of weeks in a season.
- **12-Player Rosters**: Every team now has 12 unique stuffy players with archetypes, abilities, and stats.
- **Personnel View**: A new dashboard tab to view rosters, leaderboards, and edit player details.
- **Playoff Fix**: Resolved the bug where playoff winners were not advancing in the bracket.

## 🛠️ Technical Changes

- **Player Generation**: Built `generateTeamRoster` logic in `players.ts`.
- **State Integration**: Balanced `LeagueProvider` to handle player data and overall team ratings.
- **UI Polish**: Created `RosterView` with search and filtering capabilities.

## 📊 Player Stats Schema

| Category | Description | Stats Tracked |
| :--- | :--- | :--- |
| **Offense** | TDs, Yards, Assists | Primary for scoring impact |
| **Defense** | Tackles, INTs, Sacks | Primary for defensive impact |
| **Overall** | Rating, Stuffy Points | General performance rank |

## 🚀 Next Steps

1. **GitHub Push**: Finalize local testing and sync all changes to the remote repository.
2. **Additional Polish**: Further refine animations and UI transitions if needed.
- `web/src/components/league/player-stats.tsx`: New component for the stats/leaderboard page.
- `web/src/components/league/settings-modal.tsx`: New component for league settings.

## 🛠️ Task Breakdown

### Phase 1: Foundation & Bug Fix (Core Engine)
| Task ID | Task Name | Agent | Skills | Priority | Dependencies |
|---------|-----------|-------|--------|----------|--------------|
| T1.1 | Fix Playoff Advancement | `debugger` | `react-best-practices` | P0 | None |
| T1.2 | Update Data Types | `backend-specialist` | `typescript-expert` | P1 | T1.1 |
| T1.3 | Update League Provider (State/Sync) | `backend-specialist` | `database-design` | P1 | T1.2 |

**INPUT → OUTPUT → VERIFY (T1.1)**
- **INPUT**: `league-context.tsx` with nested `setPlayoffGames` calls.
- **OUTPUT**: Redesigned `handlePick` that updates all relevant playoff games in a single state update.
- **VERIFY**: Clicking a winner in the Quarterfinals correctly populates their name in the Semifinals.

### Phase 2: Feature Implementation (Rosters & Stats)
| Task ID | Task Name | Agent | Skills | Priority | Dependencies |
|---------|-----------|-------|--------|----------|--------------|
| T2.1 | Player Generation Logic | `game-developer` | `clean-code` | P1 | T1.3 |
| T2.2 | Game-to-Stat Simulation | `game-developer` | `clean-code` | P1 | T2.1 |
| T2.3 | Team Record Utility | `backend-specialist` | `clean-code` | P2 | T1.3 |

**INPUT → OUTPUT → VERIFY (T2.1)**
- **INPUT**: Function to generate 12 players per team with names and abilities.
- **OUTPUT**: `generateTeamRoster(teamId)` utility.
- **VERIFY**: Unit test or console log shows diverse player profiles for a team.

### Phase 3: UI/UX Updates
| Task ID | Task Name | Agent | Skills | Priority | Dependencies |
|---------|-----------|-------|--------|----------|--------------|
| T3.1 | Records on Schedule Screen | `frontend-specialist` | `frontend-design` | P2 | T2.3 |
| T3.2 | Season Settings Modal | `frontend-specialist` | `frontend-design` | P2 | T1.3 |
| T3.3 | Player Stats & Leaderboard View | `frontend-specialist` | `frontend-design` | P3 | T2.2 |
| T3.4 | Player Profile Editing/Upload | `frontend-specialist` | `frontend-design` | P3 | T3.3 |

**INPUT → OUTPUT → VERIFY (T3.1)**
- **INPUT**: `calculateStandings` data available in `SeasonPredictor`.
- **OUTPUT**: Team records displayed under team names.
- **VERIFY**: Visual confirmation that "Bocadilla Univ (5-2-0)" appears in the matchup.

## 🏁 Phase X: Final Verification
- [ ] Run `python .agent/scripts/checklist.py .`
- [ ] Run `npm run lint` and `npx tsc --noEmit`
- [ ] Verify Supabase tables (`players`) are created and synced.
- [ ] Manual walkthrough of all new UI features.
- [ ] No purple/violet hex codes used (Purple Ban).
