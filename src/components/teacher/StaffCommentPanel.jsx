import React, { useState } from "react";
import { useDB } from "../../context/DBContext";
import { getClasses } from "../../utils/grades";
import Button from "../common/Button";
import styles from "./StaffCommentPanel.module.css";

const ROLE_LABELS = {
  formMaster:   "Form Master's Comment",
  houseMistress: "House Mistress Comment",
  principal:    "Principal's Comment",
};

export default function StaffCommentPanel({ teacher, extraRoles, toast }) {
  const { db, updateDB } = useDB();
  const [classFilter, setClassFilter] = useState("");
  const [drafts, setDrafts] = useState({}); // drafts[studentId][role] = text

  const classes = getClasses(db.students);
  const students = db.students.filter((s) => !classFilter || s.class === classFilter);

  function getDraft(studentId, role) {
    if (drafts[studentId]?.[role] !== undefined) return drafts[studentId][role];
    return (db.staffComments[studentId] || {})[role] || "";
  }

  function setDraft(studentId, role, val) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [role]: val },
    }));
  }

  function saveComment(studentId) {
    const studentDrafts = drafts[studentId] || {};
    updateDB((d) => {
      if (!d.staffComments[studentId]) d.staffComments[studentId] = {};
      extraRoles.forEach((role) => {
        if (studentDrafts[role] !== undefined) {
          d.staffComments[studentId][role] = studentDrafts[role];
        }
      });
      return d;
    });
    setDrafts((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
    toast("✅ Comment saved.");
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>💬 Staff Comments</h2>
      <p className={styles.sub}>
        You can edit: {extraRoles.map((r) => ROLE_LABELS[r]).join(" · ")}
      </p>

      <div className={styles.filterBar}>
        <select className={styles.filterSelect} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.studentList}>
        {!students.length ? (
          <div className={styles.empty}>No students found.</div>
        ) : students.map((student) => {
          const isDirty = Object.keys(drafts[student.id] || {}).some(
            (role) => drafts[student.id][role] !== ((db.staffComments[student.id] || {})[role] || "")
          );
          return (
            <div key={student.id} className={styles.studentBlock}>
              <div className={styles.studentHeader}>
                <strong>{student.name}</strong>
                <span className={styles.classBadge}>{student.class}</span>
                {isDirty && <span className={styles.unsavedDot}>Unsaved</span>}
              </div>

              {extraRoles.map((role) => (
                <div key={role} className={styles.roleRow}>
                  <label className={styles.roleLabel}>{ROLE_LABELS[role]}:</label>
                  <textarea
                    className={styles.textarea}
                    rows={2}
                    maxLength={200}
                    placeholder={`Enter ${ROLE_LABELS[role].toLowerCase()}...`}
                    value={getDraft(student.id, role)}
                    onChange={(e) => setDraft(student.id, role, e.target.value)}
                  />
                </div>
              ))}

              <div className={styles.saveRow}>
                <Button size="sm" variant="teal" onClick={() => saveComment(student.id)}>
                  💾 Save Comments
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
