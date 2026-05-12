// ─── RegisterPage ─────────────────────────────────────────────────────────────
// New school sign-up form.
// Fields: school name, principal/head teacher, address, logo upload, email, password.

import React, { useState, useRef } from "react";
import { compressImage } from "../../utils/imageUtils";
import styles from "./RegisterPage.module.css";

export default function RegisterPage({ onRegister, onBackToLogin }) {
  const [schoolName,    setSchoolName]    = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [address,       setAddress]       = useState("");
  const [logoDataURL,   setLogoDataURL]   = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [confirmPass,   setConfirmPass]   = useState("");
  const [showPass,      setShowPass]      = useState(false);
  const [errorMsg,      setErrorMsg]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [step,          setStep]          = useState(1); // 1 = school info, 2 = account
  const fileRef = useRef(null);

  function clearError() { if (errorMsg) setErrorMsg(""); }

  // ── Logo upload ────────────────────────────────────────────────────────
  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return setErrorMsg("Please upload an image file (PNG, JPG, SVG…).");
    if (file.size > 5 * 1024 * 1024)
      return setErrorMsg("Logo must be smaller than 5 MB.");
    try {
      const compressed = await compressImage(file, 400, 0.75);
      setLogoDataURL(compressed);
      clearError();
    } catch {
      setErrorMsg("Could not process the image. Please try a different file.");
    }
  }

  // ── Step 1 validation ─────────────────────────────────────────────────
  function handleStep1() {
    if (!schoolName.trim())    return setErrorMsg("School name is required.");
    if (!principalName.trim()) return setErrorMsg("Principal / Head Teacher name is required.");
    if (!address.trim())       return setErrorMsg("School address is required.");
    setErrorMsg("");
    setStep(2);
  }

  // ── Final submit ──────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!email.includes("@"))    return setErrorMsg("Please enter a valid email address.");
    if (password.length < 6)     return setErrorMsg("Password must be at least 6 characters.");
    if (password !== confirmPass) return setErrorMsg("Passwords do not match.");

    setLoading(true);
    setErrorMsg("");
    try {
      const result = await onRegister({
        email, password, schoolName, principalName, address, logoDataURL,
      });
      if (!result.ok) setErrorMsg(result.message);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e) {
    if (e.key === "Enter") step === 1 ? handleStep1() : handleSubmit();
  }

  return (
    <div className={styles.screen}>
      <div className={styles.blobTop} />
      <div className={styles.blobBottom} />

      <div className={`${styles.card} anim-fade-up`}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.logoMark}>ER</div>
          <div>
            <div className={styles.logoText}>Edu<span className={styles.gold}>Result</span></div>
            <div className={styles.tagline}>School Result Management Platform</div>
          </div>
        </div>

        {/* ── Step indicator ── */}
        <div className={styles.stepRow}>
          <div className={[styles.step, step === 1 ? styles.stepActive : styles.stepDone].join(" ")}>
            <div className={styles.stepCircle}>{step > 1 ? "✓" : "1"}</div>
            <span>School Info</span>
          </div>
          <div className={styles.stepLine} />
          <div className={[styles.step, step === 2 ? styles.stepActive : ""].join(" ")}>
            <div className={styles.stepCircle}>2</div>
            <span>Account</span>
          </div>
        </div>

        {/* ── STEP 1: School Details ── */}
        {step === 1 && (
          <div className={styles.form}>
            <p className={styles.stepTitle}>Tell us about your school</p>

            <div className={styles.field}>
              <label className={styles.label}>Name of School <span className={styles.req}>*</span></label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => { setSchoolName(e.target.value); clearError(); }}
                onKeyDown={onKey}
                placeholder="e.g. Future Pride Model Secondary School"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Name of Principal / Head Teacher <span className={styles.req}>*</span></label>
              <input
                type="text"
                value={principalName}
                onChange={(e) => { setPrincipalName(e.target.value); clearError(); }}
                onKeyDown={onKey}
                placeholder="e.g. Mr. James Okafor"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>School Address <span className={styles.req}>*</span></label>
              <textarea
                value={address}
                onChange={(e) => { setAddress(e.target.value); clearError(); }}
                placeholder="e.g. B 21, Zaria Road, By Benin Street, Kaduna"
                rows={2}
                className={[styles.input, styles.textarea].join(" ")}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>School Logo <span className={styles.optional}>(optional — appears on report cards)</span></label>
              <div
                className={styles.logoUpload}
                onClick={() => fileRef.current.click()}
              >
                {logoDataURL ? (
                  <img src={logoDataURL} alt="School logo" className={styles.logoPreview} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <span className={styles.uploadIcon}>🏫</span>
                    <span className={styles.uploadText}>Click to upload logo</span>
                    <span className={styles.uploadSub}>PNG, JPG, SVG · max 2 MB</span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                style={{ display: "none" }}
              />
              {logoDataURL && (
                <button className={styles.removeLogo} onClick={() => setLogoDataURL("")}>
                  Remove logo
                </button>
              )}
            </div>

            {errorMsg && (
              <div className={styles.errorBox}>⚠️ {errorMsg}</div>
            )}

            <button className={styles.nextBtn} onClick={handleStep1}>
              Continue to Account Setup →
            </button>
          </div>
        )}

        {/* ── STEP 2: Account Credentials ── */}
        {step === 2 && (
          <div className={styles.form}>
            <p className={styles.stepTitle}>Create your login account</p>

            <div className={styles.schoolSummary}>
              {logoDataURL && <img src={logoDataURL} alt="logo" className={styles.summaryLogo} />}
              <div>
                <div className={styles.summaryName}>{schoolName}</div>
                <div className={styles.summaryPrincipal}>{principalName}</div>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Email Address <span className={styles.req}>*</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                onKeyDown={onKey}
                placeholder="school@gmail.com"
                autoComplete="email"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password <span className={styles.req}>*</span></label>
              <div className={styles.passWrap}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  onKeyDown={onKey}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className={[styles.input, styles.inputGrow].join(" ")}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirm Password <span className={styles.req}>*</span></label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => { setConfirmPass(e.target.value); clearError(); }}
                onKeyDown={onKey}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={styles.input}
              />
            </div>

            {errorMsg && (
              <div className={styles.errorBox}>⚠️ {errorMsg}</div>
            )}

            <div className={styles.twoBtn}>
              <button className={styles.backBtn} onClick={() => { setStep(1); setErrorMsg(""); }} disabled={loading}>
                ← Back
              </button>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : "Create Account 🎉"}
              </button>
            </div>
          </div>
        )}

        {/* ── Back to login ── */}
        <p className={styles.loginLink}>
          Already have an account?{" "}
          <button className={styles.linkBtn} onClick={onBackToLogin} disabled={loading}>
            Sign In →
          </button>
        </p>

      </div>
    </div>
  );
}
