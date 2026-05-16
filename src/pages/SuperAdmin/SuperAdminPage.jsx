// ─── Super Admin Dashboard ────────────────────────────────────────────────────
// Only visible when logged in as the super admin (SUPER_ADMIN_EMAIL).
// Lets the app owner add, view, and manage all school accounts.

import React, { useState, useEffect, useRef } from "react";
import { compressImage } from "../../utils/imageUtils";
import { createSchool, fetchAllSchools, setSchoolActive } from "../../utils/superAdmin";

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
                  {["#","Logo","School Name","Principal","Email","Address","Added","Status","Actions"].map((h) => (
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
                        style={{ ...S.actionBtn, background: s.active === false ? "#d1fae5" : "#fee2e2", color: s.active === false ? "#059669" : "#dc2626", marginLeft: 4 }}
                        onClick={() => toggleActive(s)}
                      >{s.active === false ? "✅ Activate" : "🔒 Deactivate"}</button>
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
  toast:      { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", color: "#fff", padding: "12px 24px", borderRadius: 30, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", whiteSpace: "nowrap" },
};
