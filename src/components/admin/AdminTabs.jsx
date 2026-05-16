import React from "react";
import styles from "./AdminTabs.module.css";

// ─── AdminTabs ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "students", label: "🎓 Students" },
  { id: "teachers", label: "👨‍🏫 Teachers" },
  { id: "subjects",  label: "📚 Subjects" },
  { id: "results",   label: "📊 Class Results" },
  { id: "school",    label: "🏫 School Profile" },
  { id: "pastterms", label: "📂 Past Terms" },
];

export default function AdminTabs({ active, onChange }) {
  return (
    <div className={styles.tabs}>
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={[styles.tab, active === t.id ? styles.activeTab : ""].join(" ")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
