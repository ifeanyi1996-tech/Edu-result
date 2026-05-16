import React from "react";
import { rankStudents, getGrade, getSubjectsForClass } from "../../utils/grades";
import styles from "./ClassResultsTable.module.css";

// ─── ClassResultsTable ────────────────────────────────────────────────────────
// Renders a ranked results table for a single class.
// Only shows subjects that apply to this class's section (JSS or SSS).

export default function ClassResultsTable({ className, students, subjects, scores }) {
  // Filter subjects to only those relevant for this class section
  const classSubjects = getSubjectsForClass(subjects, className);
  const maxTotal      = classSubjects.length * 100;
  const ranked        = rankStudents(students, scores, subjects);

  return (
    <div className={styles.wrapper}>
      <div className={styles.classHeader}>
        <span>
          Class: <span className={styles.className}>{className}</span>
        </span>
        <span className={styles.count}>{students.length} Students · {classSubjects.length} Subjects</span>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Student</th>
              {classSubjects.map((s) => (
                <th key={s.id}>{s.name}</th>
              ))}
              <th>Total</th>
              <th>%</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s) => {
              const pct   = maxTotal ? Math.round((s.total / maxTotal) * 100) : 0;
              const grade = getGrade(pct);
              return (
                <tr key={s.id}>
                  <td><span className={styles.rankBadge}>{s.pos}</span></td>
                  <td className={styles.studentName}>{s.name}</td>
                  {classSubjects.map((sub) => {
                    const sc = (scores[s.id] || {})[sub.id] || {};
                    const t  = (Number(sc.t1)||0) + (Number(sc.t2)||0) + (Number(sc.exam)||0);
                    return (
                      <td key={sub.id} className={styles.center}>
                        {sc.t1 !== undefined ? t : "—"}
                      </td>
                    );
                  })}
                  <td className={styles.center}><strong>{s.total}</strong></td>
                  <td className={styles.center}>{pct}%</td>
                  <td>
                    <span className={styles.gradeChip} style={{ background: grade.bg, color: grade.color }}>
                      {grade.letter}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
