import React, { useState } from "react";
import { usePlan } from "../../utils/usePlan";
import PaywallScreen from "./PaywallScreen";

// ─── PlanBanner ───────────────────────────────────────────────────────────────
// Shown at the top of the Admin Dashboard when plan is expiring or in grace.
// Hidden when plan is active with >30 days remaining.

export default function PlanBanner() {
  const { status, showWarn, showGrace, daysUntilExpiry, daysGraceLeft } = usePlan();
  const [showPaywall, setShowPaywall] = useState(false);

  if (!showWarn && !showGrace && status !== "expired") return null;

  let bg, border, icon, message;

  if (status === "expired") {
    bg = "#fef2f2"; border = "#fca5a5"; icon = "⛔";
    message = "Your subscription has expired and the grace period has ended. Printing and result sharing are disabled.";
  } else if (showGrace) {
    bg = "#fef3c7"; border = "#f59e0b"; icon = "⚠️";
    message = `Your subscription expired. You have ${daysGraceLeft} day${daysGraceLeft !== 1 ? "s" : ""} left in your grace period before printing and result sharing are blocked.`;
  } else {
    bg = "#fffbeb"; border = "#fcd34d"; icon = "🔔";
    message = `Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}. Renew now to avoid interruption.`;
  }

  return (
    <>
      <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: "10px 16px", margin: "0 0 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ flex: 1, color: "#1e293b" }}>{message}</span>
        <button
          onClick={() => setShowPaywall(true)}
          style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", whiteSpace: "nowrap" }}
        >
          Renew Now
        </button>
      </div>

      {showPaywall && (
        <PaywallScreen status={status} onClose={() => setShowPaywall(false)} />
      )}
    </>
  );
}
