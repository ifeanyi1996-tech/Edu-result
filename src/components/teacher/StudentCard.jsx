import React from "react";
import { hasScore, getSubjectScore } from "../../utils/grades";
import styles from "./StudentCard.module.css";

// ─── StudentCard ──────────────────────────────────────────────────────────────
// Clickable card shown in the teacher's student grid.

export default function StudentCard({ student, subject, scores, onClick, locked }) {
  const scored = hasScore(scores, student.id, subject.id);
  const sc = (scores[student.id] || {})[subject.id] || {};
  const total = getSubjectScore(scores, student.id, subject.id);
  const pct = total; // out of 100

  function handleClick() {
    if (locked) return;
    onClick(student);
  }

  return (
    <div
      className={[styles.card, scored ? styles.scored : "", locked ? styles.lockedCard : ""].join(" ")}
      onClick={handleClick}
      title={locked ? "Results are locked" : undefined}
    >
      <div className={styles.name}>{student.name}</div>
      <div className={styles.className}>{student.class}</div>

      <div className={styles.preview}>
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{ width: scored ? `${pct}%` : "0%" }}
          />
        </div>
        <div className={styles.scoreText}>
          {scored
            ? `${total}/100 · T1:${sc.t1} T2:${sc.t2} Exam:${sc.exam}`
            : "No score entered"}
        </div>
        <span className={[styles.statusBadge, scored ? styles.doneBadge : styles.pendingBadge].join(" ")}>
          {scored ? "✓ Scored" : "Pending"}
        </span>
      </div>
    </div>
  );
}
