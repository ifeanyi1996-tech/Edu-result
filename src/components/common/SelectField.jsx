import React from "react";
import styles from "./SelectField.module.css";

// ─── SelectField ─────────────────────────────────────────────────────────────

export default function SelectField({ label, children, ...props }) {
  return (
    <div className={styles.wrapper}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={styles.select} {...props}>
        {children}
      </select>
    </div>
  );
}
