import React from "react";
import styles from "./StatsRow.module.css";

// ─── StatsRow ─────────────────────────────────────────────────────────────────
// Shows summary numbers at the top of the Admin dashboard.

export default function StatsRow({ students, teachers, subjects, classes }) {
  const stats = [
    { num: students, label: "Students", color: "#0ea5e9" },
    { num: teachers, label: "Teachers", color: "#0d9488" },
    { num: subjects, label: "Subjects", color: "#f0a500" },
    { num: classes,  label: "Classes",  color: "#059669" },
  ];

  return (
    <div className={styles.row}>
      {stats.map(({ num, label, color }) => (
        <div key={label} className={styles.card}>
          <div className={styles.num} style={{ color }}>{num}</div>
          <div className={styles.label}>{label}</div>
        </div>
      ))}
    </div>
  );
}
