// ─── usePlan ──────────────────────────────────────────────────────────────────
// Reads plan status from the school profile and derives the gate state.
//
// Gate logic:
//   - No paid plan         → "trial"   (all 4 gated actions blocked)
//   - Paid, not expired    → "active"  (all gated actions open)
//   - Within grace period  → "grace"   (actions open + warning banner)
//   - Past grace period    → "expired" (actions blocked again)
//
// Grace period: 30 days after expiresAt
// Warning banner: shown 30 days before expiresAt

import { useSchool } from "../context/SchoolContext";

export const GATE_ACTIONS = {
  PRINT:      "print",
  LOCK:       "lock",
  END_TERM:   "endTerm",
  RESULT_LINK:"resultLink",
};

const DAY_MS = 1000 * 60 * 60 * 24;

export function usePlan() {
  const { profile } = useSchool();
  const plan = profile?.plan || {};

  const now         = Date.now();
  const expiresAt   = plan.expiresAt   ? new Date(plan.expiresAt).getTime()   : null;
  const activatedAt = plan.activatedAt ? new Date(plan.activatedAt).getTime() : null;

  const graceEnd    = expiresAt ? expiresAt + 30 * DAY_MS : null;
  const warnStart   = expiresAt ? expiresAt - 30 * DAY_MS : null;

  let status;
  if (!plan.paid) {
    status = "trial";
  } else if (now > graceEnd) {
    status = "expired";
  } else if (now > expiresAt) {
    status = "grace";
  } else {
    status = "active";
  }

  const isGated  = status === "trial" || status === "expired";
  const showWarn = status === "active"  && warnStart && now >= warnStart;
  const showGrace= status === "grace";

  // Days until expiry (for banner messages)
  const daysUntilExpiry  = expiresAt ? Math.ceil((expiresAt - now) / DAY_MS)   : null;
  const daysInGrace      = expiresAt ? Math.ceil((now - expiresAt) / DAY_MS)   : null;
  const daysGraceLeft    = graceEnd  ? Math.ceil((graceEnd  - now) / DAY_MS)   : null;

  return {
    plan,
    status,       // "trial" | "active" | "grace" | "expired"
    isGated,      // true → block the 4 gated actions
    showWarn,     // true → show 30-day-before-expiry warning
    showGrace,    // true → show grace period warning
    daysUntilExpiry,
    daysInGrace,
    daysGraceLeft,
    hasPrimary:   !!plan.primary,
    hasSecondary: !!plan.secondary,
  };
}
