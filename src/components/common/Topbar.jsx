import React from "react";
import styles from "./Topbar.module.css";

// ─── Topbar ───────────────────────────────────────────────────────────────────

export default function Topbar({ role, teacherName, subjectName, locked, onLogout }) {
  const isAdmin = role === "admin";

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        Edu<span className={styles.brandAccent}>Result</span>
        <span className={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.teacherBadge].join(" ")}>
          {isAdmin ? "ADMIN" : "TEACHER"}
        </span>
      </div>

      <div className={styles.right}>
        {!isAdmin && teacherName && (
          <>
            <span className={styles.teacherInfo}>
              Signed in as: <strong>{teacherName}</strong>
            </span>
            {subjectName && (
              <span className={styles.subjectBadge}>{subjectName}</span>
            )}
          </>
        )}

        <span className={[styles.lockBadge, locked ? styles.locked : styles.unlocked].join(" ")}>
          {locked ? "🔒 Locked" : "🔓 Open"}
        </span>

        <button className={styles.logoutBtn} onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
