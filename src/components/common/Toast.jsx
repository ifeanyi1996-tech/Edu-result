import React from "react";
import styles from "./Toast.module.css";

// ─── Toast ───────────────────────────────────────────────────────────────────

export default function Toast({ toasts }) {
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={[styles.toast, styles[t.type], "anim-slide-right"].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
