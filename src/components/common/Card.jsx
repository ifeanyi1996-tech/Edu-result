import React from "react";
import styles from "./Card.module.css";

// ─── Card ────────────────────────────────────────────────────────────────────

export default function Card({ children, className = "" }) {
  return (
    <div className={[styles.card, className].join(" ")}>
      {children}
    </div>
  );
}
