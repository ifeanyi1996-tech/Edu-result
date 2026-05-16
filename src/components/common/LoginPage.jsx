import React, { useState } from "react";
import styles from "./LoginPage.module.css";

export default function LoginPage({ portal, onLogin, onSwitchPortal }) {
  const isAdmin = portal === "admin";
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [pin,      setPin]      = useState("");
  // Pre-fill from localStorage so returning teachers don't re-enter it
  const [schoolId, setSchoolId] = useState(() => localStorage.getItem("schoolUid") || "");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading,  setLoading]  = useState(false);

  function clearError() { if (errorMsg) setErrorMsg(""); }

  async function handleSubmit() {
    setErrorMsg(""); setLoading(true);
    try {
      const result = isAdmin
        ? await onLogin(email.trim(), password)
        : await onLogin(pin.trim(), schoolId.trim());
      if (!result.ok) { setErrorMsg(result.message); if (!isAdmin) setPin(""); }
    } catch { setErrorMsg("Unexpected error. Please try again."); }
    finally { setLoading(false); }
  }

  function onKey(e) { if (e.key === "Enter") handleSubmit(); }

  return (
    <div className={[styles.screen, isAdmin ? styles.adminBg : styles.teacherBg].join(" ")}>
      <div className={styles.blobTop} />
      <div className={styles.blobBottom} />

      <div className={`${styles.card} anim-fade-up`}>

        {/* Header */}
        <div className={styles.logoRow}>
          <div className={styles.logoCircle}>ER</div>
          <div>
            <div className={styles.logoText}>Edu<span className={styles.logoAccent}>Result</span></div>
            <div className={styles.tagline}>School Result Management Platform</div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={[styles.tab, isAdmin ? styles.tabActiveAdmin : ""].join(" ")}
            onClick={isAdmin ? undefined : onSwitchPortal}
            disabled={loading}
          >🔐 Admin</button>
          <button
            className={[styles.tab, !isAdmin ? styles.tabActiveTeacher : ""].join(" ")}
            onClick={!isAdmin ? undefined : onSwitchPortal}
            disabled={loading}
          >📝 Teacher</button>
        </div>

        {/* Firebase badge */}
        <div className={styles.firebaseBadge}>
          <span className={[styles.dot, isAdmin ? styles.dotAdmin : styles.dotTeacher].join(" ")} />
          Secured by Firebase Authentication
        </div>

        {/* Admin form */}
        {isAdmin ? (
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Email Address</label>
              <input type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                onKeyDown={onKey} placeholder="school@gmail.com"
                disabled={loading} autoComplete="email"
                className={[styles.input, errorMsg ? styles.inputErr : ""].join(" ")} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.passWrap}>
                <input type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  onKeyDown={onKey} placeholder="Your password"
                  disabled={loading} autoComplete="current-password"
                  className={[styles.input, styles.inputGrow, errorMsg ? styles.inputErr : ""].join(" ")} />
                <button type="button" className={styles.eyeBtn}
                  onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Teacher form */
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>School ID</label>
              <input
                type="text"
                value={schoolId}
                onChange={(e) => { setSchoolId(e.target.value); clearError(); }}
                onKeyDown={onKey}
                placeholder="Paste the School ID from your admin"
                disabled={loading}
                className={[styles.input, errorMsg && !schoolId ? styles.inputErr : ""].join(" ")}
              />
              <p className={styles.pinNote}>
                {localStorage.getItem("schoolUid")
                  ? "✅ School ID remembered on this device."
                  : "Ask your admin for the School ID (shown in their dashboard)."}
              </p>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Your PIN</label>
              <input type="password" inputMode="numeric" value={pin}
                onChange={(e) => { setPin(e.target.value); clearError(); }}
                onKeyDown={onKey} placeholder="· · · ·"
                maxLength={6} disabled={loading}
                className={[styles.input, styles.inputPin, errorMsg ? styles.inputErr : ""].join(" ")} />
              <p className={styles.pinNote}>Use the PIN your admin gave you.</p>
            </div>
          </div>
        )}

        {errorMsg && <div className={styles.errorBox}><span>⚠️</span> {errorMsg}</div>}

        <button onClick={handleSubmit} disabled={loading}
          className={[styles.submitBtn, isAdmin ? styles.submitAdmin : styles.submitTeacher].join(" ")}>
          {loading ? <span className={styles.spinner} />
            : isAdmin ? "Sign In to Admin Portal" : "Enter Teacher Portal"}
        </button>



      </div>
    </div>
  );
}
