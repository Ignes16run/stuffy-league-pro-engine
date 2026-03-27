# Implementation Plan - Broadcast Identity v2

We are upgrading the match broadcast to feel more "Pro" by tying the UI atmosphere and celebrations directly to the teams involved.

## 1. Possession-Based UI Bleed
We will modify the main containers to react to the team currently in possession.
- **Target**: `Elite Score Header` and `Football Field` containers.
- **Logic**: 
    - Home Possession -> `homeTeam.primaryColor` (default Cyan).
    - Away Possession -> `awayTeam.primaryColor` (default Rose).
    - Neutral -> `emerald-500` or `white/10`.
- **Animation**: Smooth color transitions using `framer-motion`.

## 2. Team-Specific Mascot Celebrations
The touchdown pop-up will no longer be a generic image.
- **Mascot Logic**: Fetch the correct render from `STUFFY_RENDER_MAP` based on the scoring team's icon.
- **Theming**: The celebration background and glow will match the team's primary color.
- **Dynamic Text**: Add the team's name and mascot type to the celebration title (e.g., "BUFFALO BEAR TOUCHDOWN!").

## 3. Implementation Steps

### Step 1: Update MatchBroadcast.tsx
- [ ] Define `possessionColor` and `possessionGlow` helper constants.
- [ ] Convert static `div` containers to `motion.div`.
- [ ] Refactor the `isScoringPlay` celebration block.

### Step 2: Verification
- [ ] Watch a broadcast session.
- [ ] Verify colors switch when possession changes.
- [ ] Verify correct mascot appears on score.

---
Timestamp: 2026-03-26T20:12:30-04:00
