// ALL time access goes through here, so tests can freeze the clock (CLAUDE.md §12).
// Karachi helpers (UTC+05:00, no DST) are added with slot generation in Phase 3.

let frozen: Date | null = null;

export function now(): Date {
  return frozen ? new Date(frozen) : new Date();
}

// Tests only: pass a date to freeze the clock, or null to unfreeze.
export function setNow(date: Date | null) {
  frozen = date;
}
