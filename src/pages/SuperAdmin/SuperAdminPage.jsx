// ─── Super Admin Dashboard ────────────────────────────────────────────────────
// Only visible when logged in as the super admin (SUPER_ADMIN_EMAIL).
// Lets the app owner add, view, and manage all school accounts.

import React, { useState, useEffect, useRef } from "react";
import { compressImage } from "../../utils/imageUtils";
import { createSchool, fetchAllSchools, setSchoolActive, setSchoolPlan, setPendingPayment, setSchoolFree, deleteSchool } from "../../utils/superAdmin";

export default function SuperAdminPage({ onLogout }) {
  const [schools,  setSchools]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [toast,    setToast]    = useState(null);
  const [creds,    setCreds]    = useState(null); // { schoolName, email, password }
  const [form,     setForm]     = useState({
    schoolName: "", principalName: "", address: "", email: "", logo: "",
  });
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [planModal, setPlanModal] = useState(null); // school object
  const [planDraft, setPlanDraft] = useState({ primary: false, secondary: false });
  const [planSaving,  setPlanSaving]  = useState(false);
  const [quoteDraft,  setQuoteDraft]  = useState({ secondary: "", primary: "", both: "" });
  const logoRef = useRef();

  // ── Load schools on mount ────────────────────────────────────────────────
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await fetchAllSchools();
    setSchools(data);
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Logo upload ──────────────────────────────────────────────────────────
  async function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setFormErr("Please upload an image."); return; }
    try {
      const compressed = await compressImage(file, 400, 0.75);
      setForm((p) => ({ ...p, logo: compressed }));
      setFormErr("");
    } catch { setFormErr("Could not process image."); }
  }

  // ── Add school ───────────────────────────────────────────────────────────
  async function handleAdd() {
    setFormErr("");
    if (!form.schoolName.trim()) return setFormErr("School name is required.");
    if (!form.email.trim() || !form.email.includes("@")) return setFormErr("Valid email is required.");
    if (!form.address.trim()) return setFormErr("Address is required.");

    setSaving(true);
    const result = await createSchool({
      schoolName:    form.schoolName,
      principalName: form.principalName,
      address:       form.address,
      email:         form.email,
      logoDataURL:   form.logo,
    });
    setSaving(false);

    if (!result.ok) { setFormErr(result.message); return; }

    // Show credentials modal
    setCreds({ schoolName: form.schoolName, email: result.email, password: result.password });
    setModal(false);
    setForm({ schoolName: "", principalName: "", address: "", email: "", logo: "" });
    await load();
  }

  // ── Toggle school active status ──────────────────────────────────────────
  async function toggleActive(school) {
    const next = !school.active;
    await setSchoolActive(school.id, next);
    showToast(next ? `✅ ${school.schoolName} activated.` : `🔒 ${school.schoolName} deactivated.`);
    load();
  }

  // ── Toggle free forever ────────────────────────────────────────────────
  async function toggleFree(s) {
    const isFree = s.plan?.free;
    const result = await setSchoolFree(s.id, !isFree);
    if (!result.ok) { showToast("Error: " + result.message, "error"); return; }
    showToast(isFree ? `✅ ${s.schoolName} removed from free tier.` : `✅ ${s.schoolName} marked as free forever.`);
    load();
  }

  // ── Delete school ────────────────────────────────────────────────────────
  async function handleDelete(s) {
    if (!window.confirm('Permanently delete "' + s.schoolName + '"?\n\nThis removes all their data. This cannot be undone.')) return;
    const result = await deleteSchool(s.id);
    if (!result.ok) { showToast("Error: " + result.message, "error"); return; }
    showToast("School deleted permanently.");
    load();
  }

  // ── Set school plan ──────────────────────────────────────────────────────
  async function handleSetPlan() {
    if (!planDraft.primary && !planDraft.secondary) {
      showToast("Select at least one plan.", "error"); return;
    }
    setPlanSaving(true);
    const result = await setSchoolPlan(planModal.id, planDraft, quoteDraft);
    setPlanSaving(false);
    if (!result.ok) { showToast("Error: " + result.message, "error"); return; }
    showToast(`✅ Plan activated for ${planModal.schoolName}.`);
    setPlanModal(null);
    load();
  }

  // ── Copy helper ──────────────────────────────────────────────────────────
  function copy(text, label) {
    navigator.clipboard.writeText(text);
    showToast(`📋 ${label} copied!`);
  }

  const active   = schools.filter((s) => s.active !== false);
  const inactive = schools.filter((s) => s.active === false);

  return (
    <div style={S.page}>
      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#dc2626" : "#0f766e" }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={S.topbar}>
        <div style={S.brand}>
          <span style={S.brandText}>Edu<span style={S.brandGold}>Result</span></span>
          <span style={S.superBadge}>⚡ Super Admin</span>
        </div>
        <button style={S.logoutBtn} onClick={onLogout}>Sign Out</button>
      </div>

      <div style={S.content}>
        {/* ── Stats ── */}
        <div style={S.statsRow}>
          {[
            { label: "Total Schools",  value: schools.length,  color: "#0f766e" },
            { label: "Active",         value: active.length,   color: "#059669" },
            { label: "Inactive",       value: inactive.length, color: "#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} style={S.statCard}>
              <div style={{ ...S.statNum, color }}>{value}</div>
              <div style={S.statLabel}>{label}</div>
            </div>
          ))}
          <button style={S.addBtn} onClick={() => { setModal(true); setFormErr(""); }}>
            ➕ Add New School
          </button>
        </div>

        {/* ── Schools list ── */}
        {loading ? (
          <div style={S.center}><div style={S.spinner} /></div>
        ) : schools.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 48 }}>🏫</div>
            <p style={{ marginTop: 12, color: "#64748b" }}>No schools yet. Add your first school above.</p>
          </div>
        ) : (
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  {["#","Logo","School Name","Principal","Email","Plan","Pending","Added","Status","Actions"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schools.map((s, i) => (
                  <tr key={s.id} style={{ background: s.active === false ? "#fef2f2" : (i % 2 === 0 ? "#f8fafc" : "#fff") }}>
                    <td style={S.td}>{i + 1}</td>
                    <td style={S.td}>
                      {s.logo
                        ? <img src={s.logo} alt="logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, border: "1px solid #e2e8f0" }} />
                        : <div style={{ width: 36, height: 36, background: "#e2e8f0", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8" }}>No logo</div>
                      }
                    </td>
                    <td style={{ ...S.td, fontWeight: 700, minWidth: 160 }}>{s.schoolName}</td>
                    <td style={S.td}>{s.principalName || "—"}</td>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: 12 }}>{s.email}</td>
                    <td style={S.td}>
                      {s.plan?.paid ? (
                        <div>
                          {s.plan.primary   && <span style={{ ...S.badge, background:"#dbeafe", color:"#1d4ed8" }}>Primary</span>}
                          {s.plan.secondary && <span style={{ ...S.badge, background:"#d1fae5", color:"#065f46", marginLeft:3 }}>Secondary</span>}
                          <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>
                            Expires: {s.plan.expiresAt ? new Date(s.plan.expiresAt).toLocaleDateString() : "—"}
                          </div>
                        </div>
                      ) : <span style={{ ...S.badge, background:"#f1f5f9", color:"#64748b" }}>Trial</span>}
                    </td>
                    <td style={S.td}>
                      {s.plan?.pendingPayment
                        ? <span style={{ ...S.badge, background:"#fef3c7", color:"#92400e", fontWeight:700 }}>⏳ Pending</span>
                        : <span style={{ fontSize:11, color:"#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ ...S.td, maxWidth: 180, fontSize: 12 }}>{s.address}</td>
                    <td style={{ ...S.td, fontSize: 11, color: "#64748b" }}>
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={S.td}>
                      <span style={{
                        display: "inline-block",
                        padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: s.active === false ? "#fee2e2" : "#d1fae5",
                        color:      s.active === false ? "#dc2626" : "#059669",
                      }}>
                        {s.active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                      <button
                        style={{ ...S.actionBtn, background: "#e0f2fe", color: "#0369a1" }}
                        onClick={() => copy(s.email, "Email")}
                      >📋 Email</button>
                      <button
                        title={s.plan?.free ? "Remove free tier" : "Mark as free forever (no paywall)"}
                        style={{ ...S.actionBtn, background: s.plan?.free ? "#fef3c7" : "#f1f5f9", color: s.plan?.free ? "#92400e" : "#64748b", marginLeft:4, fontWeight: s.plan?.free ? 700 : 400 }}
                        onClick={() => toggleFree(s)}
                      >{s.plan?.free ? "🎁 Free ✓" : "🎁 Free"}</button>
                      <button
                        style={{ ...S.actionBtn, background:"#ede9fe", color:"#6d28d9", marginLeft:4 }}
                        onClick={() => {
          setPlanModal(s);
          setPlanDraft({ primary: s.plan?.primary||false, secondary: s.plan?.secondary||false });
          setQuoteDraft({
            secondary: s.plan?.quote?.secondary || "",
            primary:   s.plan?.quote?.primary   || "",
            both:      s.plan?.quote?.both      || "",
          });
        }}
                      >🎯 Plan</button>
                      <button
                        style={{ ...S.actionBtn, background: s.active === false ? "#d1fae5" : "#fee2e2", color: s.active === false ? "#059669" : "#dc2626", marginLeft: 4 }}
                        onClick={() => toggleActive(s)}
                      >{s.active === false ? "✅ Activate" : "🔒 Deactivate"}</button>
                      <button
                        title="Permanently delete this school"
                        style={{ ...S.actionBtn, background:"#fef2f2", color:"#dc2626", marginLeft:4, fontWeight:700 }}
                        onClick={() => handleDelete(s)}
                      >🗑 Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ ADD SCHOOL MODAL ══ */}
      {modal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>🏫 Add New School</span>
              <button style={S.closeBtn} onClick={() => setModal(false)}>✕</button>
            </div>
            <div style={S.modalBody}>

              <Field label="School Name *">
                <input style={S.input} value={form.schoolName}
                  onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
                  placeholder="e.g. Future Pride Model School" />
              </Field>
              <Field label="Principal's Name">
                <input style={S.input} value={form.principalName}
                  onChange={(e) => setForm((p) => ({ ...p, principalName: e.target.value }))}
                  placeholder="e.g. Mrs Jane Doe" />
              </Field>
              <Field label="School Address *">
                <input style={S.input} value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="e.g. B21 Zaria Road, Kaduna" />
              </Field>
              <Field label="School Email Address *">
                <input style={S.input} type="email" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="school@gmail.com" />
                <p style={S.hint}>This becomes the school's login email. A password will be auto-generated.</p>
              </Field>
              <Field label="School Logo (optional)">
                {form.logo && (
                  <img src={form.logo} alt="logo" style={{ width: 64, height: 64, objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: 6, display: "block", marginBottom: 6 }} />
                )}
                <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ fontSize: 12 }} />
              </Field>

              {formErr && <div style={S.errBox}>⚠️ {formErr}</div>}
            </div>
            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={() => setModal(false)} disabled={saving}>Cancel</button>
              <button style={S.saveBtn} onClick={handleAdd} disabled={saving}>
                {saving ? "Creating…" : "✅ Create School Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CREDENTIALS MODAL (shown after school is created) ══ */}
      {creds && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 480 }}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>🎉 School Account Created!</span>
            </div>
            <div style={S.modalBody}>
              <p style={{ marginBottom: 16, color: "#374151", fontSize: 14 }}>
                Share these login credentials with <strong>{creds.schoolName}</strong>. 
                They will use them to log into EduResult.
              </p>

              <div style={S.credBox}>
                <div style={S.credRow}>
                  <span style={S.credLabel}>School:</span>
                  <span style={S.credVal}>{creds.schoolName}</span>
                </div>
                <div style={S.credRow}>
                  <span style={S.credLabel}>Email:</span>
                  <span style={S.credVal}>{creds.email}</span>
                  <button style={S.credCopy} onClick={() => copy(creds.email, "Email")}>Copy</button>
                </div>
                <div style={S.credRow}>
                  <span style={S.credLabel}>Password:</span>
                  <span style={{ ...S.credVal, fontFamily: "monospace", fontWeight: 700, fontSize: 16, letterSpacing: 2, color: "#0f766e" }}>
                    {creds.password}
                  </span>
                  <button style={S.credCopy} onClick={() => copy(creds.password, "Password")}>Copy</button>
                </div>
              </div>

              <button
                style={{ ...S.saveBtn, width: "100%", marginTop: 12 }}
                onClick={() => {
                  const msg = `🏫 *EduResult Login Credentials*\n\nSchool: ${creds.schoolName}\nEmail: ${creds.email}\nPassword: ${creds.password}\n\nLogin at: ${window.location.origin}`;
                  copy(msg, "Full credentials message");
                }}
              >📋 Copy Full Message to Send via WhatsApp</button>

              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10, textAlign: "center" }}>
                Save this password now — it cannot be retrieved later.
              </p>
            </div>
            <div style={S.modalFooter}>
              <button style={S.saveBtn} onClick={() => setCreds(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PLAN MODAL ══ */}
      {planModal && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setPlanModal(null)}>
          <div style={{ ...S.modal, maxWidth: 480 }}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>🎯 Manage Plan — {planModal.schoolName}</span>
              <button style={S.closeBtn} onClick={() => setPlanModal(null)}>✕</button>
            </div>
            <div style={S.modalBody}>
              <p style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>
                Select what this school has paid for. Check payment in your bank app first,
                then tick the plan(s) and click Activate.
              </p>

              {/* Current plan status */}
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", marginBottom:16, fontSize:13 }}>
                <div style={{ fontWeight:700, marginBottom:6, color:"#0f172a" }}>Current Status</div>
                <div>Plan: {planModal.plan?.paid ? (
                  <><span style={{ color:"#059669", fontWeight:700 }}>Paid</span> &nbsp;·&nbsp; Expires: {planModal.plan.expiresAt ? new Date(planModal.plan.expiresAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—"}</>
                ) : <span style={{ color:"#d97706", fontWeight:700 }}>Trial</span>}</div>
                {planModal.plan?.pendingPayment && <div style={{ color:"#92400e", fontWeight:700, marginTop:4 }}>⏳ Payment form submitted — awaiting your verification</div>}
              </div>

              {/* Plan checkboxes */}
              <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
                {[
                  { key:"secondary", label:"Secondary Section", desc:"JSS 1–SSS 3 result management", color:"#065f46", bg:"#d1fae5", price:"₦XX,XXX/year" },
                  { key:"primary",   label:"Primary Section",   desc:"Primary 1–6 result management", color:"#1d4ed8", bg:"#dbeafe", price:"₦XX,XXX/year" },
                ].map(({ key, label, desc, color, bg, price }) => {
                  const checked = planDraft[key];
                  return (
                    <label key={key} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderRadius:10, border:`2px solid ${checked ? color : "#e2e8f0"}`, background: checked ? bg : "#f8fafc", cursor:"pointer", transition:"all .15s" }}>
                      <input type="checkbox" checked={checked} style={{ accentColor:color, width:18, height:18, flexShrink:0, marginTop:1 }}
                        onChange={() => setPlanDraft((p) => ({ ...p, [key]: !p[key] }))} />
                      <div>
                        <div style={{ fontWeight:700, color, fontSize:14 }}>{label}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{desc}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{price} · Yearly + 30-day grace period</div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* ── Price quotes per plan ── */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:8 }}>
                  💰 Quoted Prices (shown to school on paywall)
                </div>
                {[
                  { key:"secondary", label:"Secondary Section" },
                  { key:"primary",   label:"Primary Section"   },
                  { key:"both",      label:"Both Sections"     },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{ fontSize:13, color:"#374151", minWidth:140 }}>{label}</span>
                    <div style={{ position:"relative", flex:1 }}>
                      <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#64748b", fontWeight:700 }}>₦</span>
                      <input
                        type="text"
                        value={quoteDraft[key]}
                        onChange={(e) => setQuoteDraft((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder="e.g. 15,000"
                        style={{ width:"100%", padding:"7px 10px 7px 26px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"inherit", boxSizing:"border-box" }}
                      />
                    </div>
                    <span style={{ fontSize:12, color:"#94a3b8" }}>/year</span>
                  </div>
                ))}
                <p style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>
                  Leave blank to show "Contact us for pricing" on the paywall.
                </p>
              </div>

              <div style={{ background:"#fef3c7", border:"1px solid #f59e0b", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#78350f", marginBottom:8 }}>
                ⚠️ Only activate after confirming the bank transfer in your account. Activation sets a 1-year + 30-day grace expiry from today.
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={() => setPlanModal(null)} disabled={planSaving}>Cancel</button>
              <button style={{ ...S.saveBtn, opacity: planSaving ? 0.7 : 1, cursor: planSaving ? "not-allowed" : "pointer" }}
                onClick={handleSetPlan} disabled={planSaving}>
                {planSaving ? "Activating…" : "✅ Activate Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontWeight: 700, fontSize: 12, marginBottom: 5, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const S = {
  page:       { minHeight: "100vh", background: "#f1f5f9", fontFamily: "Arial, sans-serif" },
  topbar:     { background: "#0f172a", color: "#fff", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  brand:      { display: "flex", alignItems: "center", gap: 12 },
  brandText:  { fontSize: 20, fontWeight: 900 },
  brandGold:  { color: "#f59e0b" },
  superBadge: { background: "#f59e0b", color: "#000", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  logoutBtn:  { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 },
  content:    { maxWidth: 1100, margin: "0 auto", padding: "24px 16px" },
  statsRow:   { display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" },
  statCard:   { background: "#fff", borderRadius: 12, padding: "16px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textAlign: "center", minWidth: 110 },
  statNum:    { fontSize: 28, fontWeight: 900 },
  statLabel:  { fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: 600 },
  addBtn:     { marginLeft: "auto", background: "#0f766e", color: "#fff", border: "none", borderRadius: 10, padding: "12px 22px", cursor: "pointer", fontWeight: 700, fontSize: 14 },
  tableWrap:  { background: "#fff", borderRadius: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.08)", overflowX: "auto" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:         { background: "#0f172a", color: "#fff", padding: "10px 12px", textAlign: "left", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" },
  td:         { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  actionBtn:  { border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 },
  center:     { display: "flex", justifyContent: "center", padding: 40 },
  spinner:    { width: 36, height: 36, border: "4px solid #e2e8f0", borderTop: "4px solid #0f766e", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  empty:      { textAlign: "center", padding: "60px 20px" },
  overlay:    { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal:      { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  modalHeader:{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
  closeBtn:   { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#94a3b8" },
  modalBody:  { padding: "20px 24px", overflowY: "auto" },
  modalFooter:{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, justifyContent: "flex-end" },
  input:      { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  hint:       { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  errBox:     { background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "10px 14px", color: "#dc2626", fontSize: 13, marginTop: 8 },
  cancelBtn:  { background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13 },
  saveBtn:    { background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13 },
  credBox:    { background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "16px 18px" },
  credRow:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  credLabel:  { fontWeight: 700, fontSize: 12, color: "#374151", width: 80, flexShrink: 0 },
  credVal:    { flex: 1, fontSize: 14, color: "#0f172a", wordBreak: "break-all" },
  credCopy:   { background: "#0f766e", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  badge:      { display:"inline-block", padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:600 },
  toast:      { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "12px 24px", borderRadius: 30, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", whiteSpace: "nowrap" },
};
