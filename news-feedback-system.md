# News Feedback System Plan

## Goal
Implement a modular, persistent feedback system for the "Daily Stuffy" news feed that allows users to influence future narrative outcomes through thumbs up/down interactions.

## 1. UI Placement & Interactions
- **Target Component**: `NewsCard` in `web/src/components/league/daily-stuffy.tsx`.
- **Placement**: Bottom-right corner of the card, aligned with the "Full Match Report" button (if present).
- **Icons**: `ThumbsUp` and `ThumbsDown` from `lucide-react`.
- **Visual State**: 
  - Standard: Low-opacity slate icons.
  - Active: Colorful fill (Emerald for Up, Rose for Down) with subtle glow.
- **Accessibility**: Tooltips ("Like this type of story", "Fewer stories like this") and unique IDs for testing.

## 2. Data Model
- **Interface Update**: Add `feedback?: 'UP' | 'DOWN' | null` to `NewsStory` in `web/src/lib/league/types.ts`.
- **State Management**: Handled via `news` state in `LeagueContext`.
- **Persistence**: Automatically synced via existing `useLeaguePersistence` (LocalStorage).
- **Aggregation**:
  - **Per Story**: Stored directly on the story object.
  - **Per Week**: Aggregated by `newsEngine` during the generation phase of the *next* week.

## 3. Feedback Logic
- **Toggle Mechanism**: 
  - Click UP while null -> Set to UP.
  - Click UP while UP -> Set to null.
  - Click DOWN while UP -> Set to DOWN.
- **Context Integration**: Add `toggleStoryFeedback(storyId, type)` to `LeagueContextType`.

## 4. Narrative Influence (Controlled Rules)
User feedback will influence the **News Template Selection** for the following week:
- **Story Type Weighting**:
  - `UP` counts: Increase the probability weight of that `type` (e.g., `PLAYER_DRAMA`) by 20% for the next week.
  - `DOWN` counts: Decrease the probability weight by 20% (minimum 5% floor).
- **Entity Persistence**:
  - If a story about a specific `Player` or `Team` gets an `UP`, that entity is flagged as "High Interest". 
  - `newsEngine` will prioritize that entity for "Interviews" or "Follow-up" stories in the next generation cycle.
- **No Mechanical Instability**: Feedback affects **Narrative Selection** only, not core sim results (scores, stats).

## 5. Tasks
- [ ] **Task 1: Extend Types** → Update `NewsStory` interface in `types.ts`.
- [ ] **Task 2: Context Logic** → Implement `toggleStoryFeedback` in `league-context.tsx`.
- [ ] **Task 3: UI Implementation** → Add interaction buttons to `NewsCard` in `daily-stuffy.tsx`.
- [ ] **Task 4: Narrative Engine Update** → Update `generateWeeklyNews` in `newsEngine.ts` to consume previous feedback.
- [ ] **Task 5: Verification** → Advance week, upvote drama, verify next week contains more drama/follow-ups.

## Done When
- [ ] Users can like/dislike stories with persistent UI feedback.
- [ ] Feedback state survives page reloads.
- [ ] Narrative engine weights shift based on the previous week's aggregated feedback.
- [ ] System remains modular with no regressions in sim logic.
