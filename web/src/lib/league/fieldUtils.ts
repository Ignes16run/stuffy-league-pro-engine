/**
 * fieldUtils.ts — Field coordinate utilities for the Match Broadcast
 * 
 * The game simulator uses an INTERNAL model where:
 *   yardLine 0   = own goal line
 *   yardLine 25  = own 25 (typical kickoff return start)
 *   yardLine 50  = midfield
 *   yardLine 75  = opponent's 25 (red zone)
 *   yardLine 100 = opponent's endzone (touchdown)
 *   sideOfField  = 'HOME' | 'AWAY' (which team's perspective)
 *
 * A real football field is 120 yards:
 *   [Away Endzone 10yd] [100 yards of play] [Home Endzone 10yd]
 *
 * This module maps between the two without changing simulation logic.
 * 
 * Updated: 2026-03-26T10:39:44-04:00
 */

// --- Constants matching NCAA/NFL field dimensions ---
export const ENDZONE_YARDS = 10;
export const PLAY_YARDS = 100;
export const TOTAL_FIELD_YARDS = ENDZONE_YARDS + PLAY_YARDS + ENDZONE_YARDS; // 120

/** Percentage of total field taken by one endzone */
export const ENDZONE_PCT = (ENDZONE_YARDS / TOTAL_FIELD_YARDS) * 100; // ~8.33%

/** Percentage of total field that is playable area */
export const PLAY_PCT = (PLAY_YARDS / TOTAL_FIELD_YARDS) * 100; // ~83.33%

/**
 * Mirrored yard-line labels as shown on a real field.
 * Positioned at boundaries between 10-yard segments of the playing area.
 * From left goal line to right goal line: G, 10, 20, 30, 40, 50, 40, 30, 20, 10, G
 */
export const YARD_LINE_LABELS = ['G', '10', '20', '30', '40', '50', '40', '30', '20', '10', 'G'] as const;

/**
 * Convert simulator yardLine + sideOfField to a CSS left-% on a 120-yard field.
 *
 * Layout (left → right):
 *   [Away EZ]  Playing Field   [Home EZ]
 *   0%  ~8.3%               ~91.7%  100%
 *
 * Away team advances left-to-right (toward Home EZ).
 * Home team advances right-to-left (toward Away EZ).
 */
export function yardLineToFieldPercent(
  yardLine: number,
  sideOfField: string
): number {
  // Clamp yardLine to valid range
  const yl = Math.max(0, Math.min(100, yardLine));

  if (sideOfField === 'AWAY') {
    // Away starts at left goal line, advances right
    // yl=0 → left goal line (8.33%), yl=100 → right endzone (91.67%+)
    return ENDZONE_PCT + (yl / PLAY_YARDS) * PLAY_PCT;
  } else {
    // Home starts at right goal line, advances left
    // yl=0 → right goal line (91.67%), yl=100 → left endzone (8.33%-ish)
    return ENDZONE_PCT + ((PLAY_YARDS - yl) / PLAY_YARDS) * PLAY_PCT;
  }
}

/**
 * Get the human-readable yard line (e.g. "own 25", "OPP 40", "50")
 * from simulator coordinates.
 */
export function formatYardLine(yardLine: number): string {
  if (yardLine <= 0) return 'Goal Line';
  if (yardLine >= 100) return 'End Zone';
  if (yardLine === 50) return '50';
  if (yardLine < 50) return `Own ${yardLine}`;
  return `OPP ${100 - yardLine}`;
}

/**
 * Check if the ball is in the red zone (within opponent's 20).
 */
export function isRedZone(yardLine: number): boolean {
  return yardLine >= 80;
}
