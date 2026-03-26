# 🏈 Field Representation & Coordinate Mapping

The Stuffy League Pro broadcast uses a realistic 120-yard football field model, ensuring alignment with professional and collegiate football layouts as per the provided inspiration documentation.

## 📏 120-Yard Model

The field is composed of three distinct sections, forming a total visual span of 120 yards:

| Section | Yardage | % of Field (Visual) |
| :--- | :--- | :--- |
| **Away Endzone** | 10 Yards | 8.33% |
| **Playing Field** | 100 Yards | 83.33% |
| **Home Endzone** | 10 Yards | 8.33% |

### 🧭 Orientation

- **Away Team** starts at the **left goal line** and advances **right** toward the Home Endzone.
- **Home Team** starts at the **right goal line** and advances **left** toward the Away Endzone.

## 🗺️ Coordinate Mapping

The core `gameSimulator` maintains an internal 0-100 `yardLine` state (representing "yards of play"). This value is mapped to the 120-yard visual field using the `yardLineToFieldPercent` utility function.

### 📐 Mapping Logic (fieldUtils.ts)

`ENDZONE_PCT` represents the 8.33% of the visual field taken by one endzone.

| Internal state | Side of Field | Formula | Visual % (Left) |
| :--- | :--- | :--- | :--- |
| `yardLine 0` | `AWAY` | `ENDZONE_PCT` | **8.33%** (Goalline) |
| `yardLine 100` | `AWAY` | `ENDZONE_PCT + PLAY_PCT` | **91.67%** (Endzone) |
| `yardLine 25` | `HOME` | `ENDZONE_PCT + (100 - 25) / 100 * PLAY_PCT` | **70.83%** (Own 25) |

## ✅ Features

- **Mirrored Yard Lines**: Labels flip at the 50-yard line (10, 20, 30, 40, 50, 40, 30, 20, 10), matching real-world layouts.
- **Red Zone Detection**: Visual red zone shading is triggered when the `yardLine` exceeds **80** (within the opponent's 20-yard line).
- **Pro Sideline Detail**: Hashmarks are dynamically rendered at every yard in 4 rows across the field.

---
*Updated: 2026-03-26T10:44:04-04:00*
