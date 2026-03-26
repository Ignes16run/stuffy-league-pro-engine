# 🔊 Audio Asset Structure & Documentation

This document outlines the audio system for the Stuffy League Pro engine.

## 📁 Directory Structure
All audio assets are stored in the `/web/public/sounds/` directory.

```text
/public/sounds/
├── Crowd Cheering 1.mp3        (OOH - Turnovers, sacks, negative outcomes)
├── Crowd Cheering 2.mp3        (CHEER / TOUCHDOWN - Scoring, first downs)
├── Crowd Cheering 3.mp3        (FG_GOOD - Field goals)
├── Crowd Cheering Clapping.mp3 (KICKOFF / ZAP - Transitions, punts)
├── Crowd Cheering Stomping.mp3 (DRUM_ROLL / AMBIENT - Quarter breaks, loop)
└── Referee Whistle.mp3         (WHISTLE - Game start, Overtime, Game end)
```

## ⚙️ Implementation Details

### SFX Mapping
The system uses a `SFX_MAP` located in `match-broadcast.tsx` to link game events to their respective audio files.

| Event | Asset | Usage |
| :--- | :--- | :--- |
| `WHISTLE` | `Referee Whistle.mp3` | Start/End of game and Overtime rounds. |
| `CHEER` | `Crowd Cheering 2.mp3` | Triggered by first downs or user interaction. |
| `OOH` | `Crowd Cheering 1.mp3` | Sacks, interceptions, or fumbles. |
| `DRUM_ROLL` | `Crowd Cheering Stomping.mp3` | Quarter transitions and halftime. |
| `ZAP` | `Crowd Cheering Clapping.mp3` | General high-energy moments. |
| `FG_GOOD` | `Crowd Cheering 3.mp3` | Successful field goal attempts. |
| `TOUCHDOWN` | `Crowd Cheering 2.mp3` | Touchdown celebrations. |
| `KICKOFF` | `Crowd Cheering Clapping.mp3` | Kickoffs and Punts. |

### Background Ambience
A continuous background loop is implemented using the `AMBIENT_TRACK` constant in `MatchBroadcast`.
- **File**: `/sounds/Crowd Cheering Stomping.mp3`
- **Volume**: 0.1 (10%)
- **Behavior**: Auto-loops during active broadcasts; pauses when the broadcast is closed.

## 🛠️ Usage in Code
To play a sound, the `playSFX(type)` helper function is used. It handles volume normalization (0.4) and respects the user's mute settings.

---
*Updated: 2026-03-26T10:44:04-04:00*
