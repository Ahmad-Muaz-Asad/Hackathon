export const REP_INITIAL = 50.0;
export const REP_MAX = 100.0;
export const REP_SENIOR = 80.0; // Threshold for Tribunal Access
export const VOTE_MULTIPLIER = 0.02; // 50 Rep * 0.02 = 1.0 Power [cite: 1]
export const COST_POST_HIGH = 5;
export const COST_POST_LOW = 10; // [cite: 1]
export const REWARD_CONSENSUS = 5; // [cite: 2]
export const PENALTY_SLASH = 15; // [cite: 2]
export const JITTER_MIN_MS = 60 * 1000; // 1 Minute [cite: 3]
export const JITTER_MAX_MS = 60 * 60 * 1000; // 60 Minutes [cite: 3]
export const SETTLEMENT_TIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days [cite: 3]
export const SETTLEMENT_VOTE_CAP = 50; // [cite: 5]
export const TRIBUNAL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 Hours [cite: 5]
export const TRIBUNAL_REJECTION_RATE = 0.4; // 40% Dislikes kills the rumor [cite: 5]
