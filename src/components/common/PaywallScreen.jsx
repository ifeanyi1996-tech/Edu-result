import React, { useState } from "react";

// ─── PaywallScreen ────────────────────────────────────────────────────────────
// Shown when a gated action is triggered and isGated === true.
// Displays payment instructions + a form the school fills in to notify you.

const WHATSAPP = "https://wa.me/2348XXXXXXXXX"; // ← replace with your number
const FACEBOOK = "https://facebook.com/yourpage"; // ← replace with your page

const PLANS = [
  { key: "secondary", label: "Secondary Section (JSS 1 – SSS 3)", price: "₦XX,XXX / year" },
  { key: "primary",   label: "Primary Section (Primary 1 – 6)",   price: "₦XX,XXX / year" },
  { key: "both",      label: "Both Sections",                      price: "₦XX,XXX / year" },
];

const BANK = {
  name:    "Your Bank Name",       // ← replace
  account: "0000000000",           // ← replace
  holder:  "Your Name / Business", // ← replace
};

export default function PaywallScreen({ onClose, status }) {
  const [step,    setStep]    = useState(1); // 1=info, 2=form, 3=submitted
  const [form,    setForm]    = useState({ plan: "", ref: "", schoolName: "", phone: "" });
  const [err,     setErr]     = useState("");
  const [copying, setCopying] = useState(false);

  const isExpired = status === "expired";

  function handleSubmit() {
    if (!form.plan)       { setErr("Please select a plan.");             return; }
    if (!form.ref.trim()) { setErr("Please enter your payment reference."); return; }
    if (!form.phone.trim()){ setErr("Please enter your phone number.");   return; }
    // In a future Paystack integration this would be an API call.
    // For now, compose a WhatsApp message with the details and open it.
    const msg = encodeURIComponent(
      `*EduResult Payment Notification*\n\nSchool: ${form.schoolName || "(not entered)"}\nPlan: ${form.plan}\nPayment Ref: ${form.ref}\nPhone: ${form.phone}\n\nPlease activate my account.`
    );
    window.open(`${WHATSAPP}?text=${msg}`, "_blank");
    setStep(3);
  }

  async function copyBank() {
    await navigator.clipboard.writeText(`${BANK.name}\n${BANK.account}\n${BANK.holder}`);
    setCopying(true);
    setTimeout(() => setCopying(false), 1800);
  }

  return (
    <div style={S.overlay}>
      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ fontSize: 36 }}>{isExpired ? "⏰" : "🔒"}</div>
          <div style={S.headerText}>
            <div style={S.title}>
              {isExpired ? "Your Subscription Has Expired" : "Activate Your Plan to Continue"}
            </div>
            <div style={S.sub}>
              {isExpired
                ? "Your grace period has ended. Renew to unlock printing, result sharing, and end-of-term archiving."
                : "You're in free trial mode. To print results or share the parent link, activate a paid plan."}
            </div>
          </div>
        </div>

        {step === 1 && (
          <>
            {/* Plans */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Choose a Plan</div>
              {PLANS.map((p) => (
                <div key={p.key} style={S.planRow}>
                  <span style={S.planName}>{p.label}</span>
                  <span style={S.planPrice}>{p.price}</span>
                </div>
              ))}
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                All plans include a 30-day grace period after expiry. Yearly billing.
              </div>
            </div>

            {/* Bank details */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Pay via Bank Transfer</div>
              <div style={S.bankBox}>
                <div style={S.bankRow}><span style={S.bankLabel}>Bank</span><span>{BANK.name}</span></div>
                <div style={S.bankRow}><span style={S.bankLabel}>Account</span><span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 1 }}>{BANK.account}</span></div>
                <div style={S.bankRow}><span style={S.bankLabel}>Name</span><span>{BANK.holder}</span></div>
              </div>
              <button style={S.copyBtn} onClick={copyBank}>
                {copying ? "✅ Copied!" : "📋 Copy Bank Details"}
              </button>
            </div>

            {/* Actions */}
            <div style={S.actions}>
              <button style={S.secondaryBtn} onClick={() => window.open(FACEBOOK, "_blank")}>
                💬 Contact on Facebook
              </button>
              <button style={S.primaryBtn} onClick={() => setStep(2)}>
                I've Paid — Notify Us →
              </button>
            </div>
            {onClose && (
              <button style={S.skipBtn} onClick={onClose}>
                Continue in trial (results locked)
              </button>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div style={S.section}>
              <div style={S.sectionTitle}>Payment Notification Form</div>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>
                Fill this in after making the transfer. We'll verify and activate your account within a few hours.
              </p>

              <Field label="Your School Name">
                <input style={S.input} value={form.schoolName}
                  onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
                  placeholder="e.g. Christ Anglican Primary School" />
              </Field>
              <Field label="Plan Selected">
                <select style={S.input} value={form.plan}
                  onChange={(e) => { setForm((p) => ({ ...p, plan: e.target.value })); setErr(""); }}>
                  <option value="">— Select plan —</option>
                  {PLANS.map((p) => <option key={p.key} value={p.label}>{p.label} · {p.price}</option>)}
                </select>
              </Field>
              <Field label="Payment Reference / Teller Number">
                <input style={S.input} value={form.ref}
                  onChange={(e) => { setForm((p) => ({ ...p, ref: e.target.value })); setErr(""); }}
                  placeholder="e.g. FBN2406120012345" />
              </Field>
              <Field label="Your Phone Number">
                <input style={S.input} type="tel" value={form.phone}
                  onChange={(e) => { setForm((p) => ({ ...p, phone: e.target.value })); setErr(""); }}
                  placeholder="e.g. 08012345678" />
              </Field>

              {err && <div style={S.errBox}>⚠️ {err}</div>}
            </div>

            <div style={S.actions}>
              <button style={S.secondaryBtn} onClick={() => setStep(1)}>← Back</button>
              <button style={S.primaryBtn} onClick={handleSubmit}>
                📲 Send via WhatsApp
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <div style={{ textAlign: "center", padding: "24px 0 12px" }}>
            <div style={{ fontSize: 52 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "12px 0 8px" }}>
              Notification Sent!
            </div>
            <p style={{ fontSize: 14, color: "#64748b", maxWidth: 320, margin: "0 auto 20px" }}>
              We've received your payment details on WhatsApp. Your account will be activated
              within a few hours once we verify the transfer.
            </p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Need faster help?{" "}
              <a href={FACEBOOK} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>
                Message us on Facebook
              </a>
            </p>
            {onClose && (
              <button style={{ ...S.primaryBtn, marginTop: 16 }} onClick={onClose}>
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: 0.5, color: "#374151", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const S = {
  overlay:     { position: "fixed", inset: 0, background: "rgba(15,31,53,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9000, padding: 16, backdropFilter: "blur(3px)" },
  card:        { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.35)" },
  header:      { background: "linear-gradient(135deg,#0f1f35,#1a3352)", padding: "28px 28px 24px", display: "flex", alignItems: "flex-start", gap: 16, borderRadius: "20px 20px 0 0" },
  headerText:  { flex: 1 },
  title:       { fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.3 },
  sub:         { fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 6, lineHeight: 1.5 },
  section:     { padding: "20px 28px 0" },
  sectionTitle:{ fontSize: 13, fontWeight: 800, color: "#0f1f35", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  planRow:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 },
  planName:    { color: "#1e293b", fontWeight: 500 },
  planPrice:   { fontWeight: 700, color: "#059669" },
  bankBox:     { background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  bankRow:     { display: "flex", gap: 14, alignItems: "center", marginBottom: 6, fontSize: 13 },
  bankLabel:   { fontWeight: 700, color: "#64748b", minWidth: 60 },
  copyBtn:     { fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 600, color: "#374151" },
  actions:     { display: "flex", gap: 10, padding: "20px 28px 16px", justifyContent: "flex-end" },
  primaryBtn:  { background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "11px 22px", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" },
  secondaryBtn:{ background: "#f1f5f9", color: "#1e293b", border: "none", borderRadius: 10, padding: "11px 18px", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" },
  skipBtn:     { display: "block", width: "100%", textAlign: "center", fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", paddingBottom: 16, fontFamily: "inherit" },
  input:       { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  errBox:      { background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "9px 14px", color: "#dc2626", fontSize: 13, marginTop: 8 },
};
