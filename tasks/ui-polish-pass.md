# UI Polish Pass Implementation Plan (Refined)

Implementation of a focused UI polish pass across the Stuffy League Pro application to improve visual hierarchy, clarity, interaction feedback, and broadcast immersion, prioritizing **clarity** and **minimalism**.

## 1. Core Principles (Updated)
1. **Clarity Over Effects**: All changes must improve readability and visual hierarchy.
2. **Subtle Motion**: Animations should be brief, purposeful, and non-distracting.
- [x] **Subtle Broadcast Motion** (Score pops, Big Play banners)
- [ ] **Phase 2 Expansion Review** (Final pass on interactions)
3. **Hierarchy First**: Information flow: Primary (Image/Score) → Secondary (Name/Description) → Tertiary (Details).
4. **Minimal Aesthetic**: Preserve current brand colors and spacing philosophy while tightening horizontal layouts.

## 2. File-by-File Refinements (Phase 1 Focused)

### 1. Broadcast Screen (`web/src/components/league/match-broadcast.tsx`)
- **Scoreboard Hierarchy**: 
    - Scale scores significantly; diminish metadata (Down, Quarter) labels to subtle secondary weights.
    - Group score and game-state into a more compact, centered "Broadcast Pod."
- **Event Readability**:
    - Increase spacing and hierarchy between the "Play Result Header" and the details.
- **Field Context**:
    - Add a subtle yard-line highlight on the active position (no heavy glows).
    - Use a simple spring transition for ball movement instead of complex effects.

### 2. Season / Schedule Screen (`web/src/components/league/season-predictor.tsx`)
- **Scanning Matchups**:
    - Constrain maximum width of game cards for easier scanning on desktop.
    - Slim down the "Center" VS/Tie area to reduce visual weight between teams.
- **Noise Reduction**:
    - Simplify status badges and labels to be cleaner and less button-like.

### 3. Management Hub (`web/src/components/league/management-view.tsx`)
- **Header Balancing**:
    - Restructure the header into a 2-column layout: Left (Title/Sub) and Right (League Stats Summary).
- **Active Navigation**:
    - Subtle color indicating active tabs; no flashy animations.

### 4. Player Card Grid (`web/src/components/league/roster-view.tsx`)
- **Information Flow**:
    - Reorder elements for image → name → rating → attributes hierarchy.
- **Minimal Differentiation**:
    - Use subtle color-coded accents (e.g., small position tags) rather than full systems.

## 3. Phase 1 Implementation Status

- [x] **Broadcast Screen Refinement** (Scoreboard pod, metadata hierarchy)
- [x] **Management Hub Rebalance** (2-column header, league stats)
- [x] **Schedule Screen Scanability** (Tightened cards, reduced noise)
- [x] **Player Card Hierarchy Pass** (Image -> Name -> OVR -> Attributes)
- [x] **Syntax/Lint Cleanup** (Fixed broken SeasonPredictor)

**Phase 1 Complete.**
**Phase 2 (Advanced Polish) deferred until review of Phase 1 completes.**

**Last Updated: 2026-03-26T15:33:05-04:00**
