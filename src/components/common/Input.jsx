import React from "react";
import styles from "./Input.module.css";

// ─── Input ───────────────────────────────────────────────────────────────────

export default function Input({ label, error, ...props }) {
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <input
        className={[styles.input, error ? styles.inputError : ""].join(" ")}
        {...props}
      />
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
}
