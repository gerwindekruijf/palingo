// ── Global ───────────────────────────────────────────────────────────────────
export const WORD_LENGTHS = [4, 5, 6, 7, 8] as const;
export const ROUNDS_PER_GAME = 5;
export const TIMER_SECONDS_BASE = 30;
export const TIMER_SECONDS_PER_WORD = 30;
export const TIMER_SECONDS_MAX = 60;
export const TIMER_SECONDS_BONUS = 60;
export const TIMER_GRACE_SECONDS = 2;
export const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

// ── Animation ────────────────────────────────────────────────────────────────
export const FLIP_DURATION = 250;
export const FLIP_BUFFER = 150;
export const WIN_OVERLAY_DELAY = 2000;

// ── Bonus ────────────────────────────────────────────────────────────────────
export const BONUS_COUNTDOWN_MS = 2000;

// ── Lingo ────────────────────────────────────────────────────────────────────
export const LINGO_WORD_LENGTH = 6;
export const LINGO_MAX_ATTEMPTS = 6;

// ── SuperLingo ───────────────────────────────────────────────────────────────
export const SUPERLINGO_WORD_LENGTH = 7;
export const SUPERLINGO_MAX_ATTEMPTS = 7;
