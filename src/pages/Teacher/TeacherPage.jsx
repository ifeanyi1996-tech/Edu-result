import React, { useState } from "react";
import { useDB } from "../../context/DBContext";
import { getClasses } from "../../utils/grades";
import StudentCard from "../../components/teacher/StudentCard";
import ScoreEntryForm from "../../components/teacher/ScoreEntryForm";
import StaffCommentPanel from "../../components/teacher/StaffCommentPanel";
import styles from "./TeacherPage.module.css";

export default function TeacherPage({ teacher, toast }) {
  const { db, updateDB } = useDB();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classFilter, setClassFilter] = useState("");
  const [activeSection, setActiveSection] = useState("scores");

  const subject  = db.subjects.find((s) => s.id === teacher.subject);
  const classes  = getClasses(db.students);
  const filteredStudents = db.students.filter((s) => !classFilter || s.class === classFilter);
  const scoredCount = db.students.filter(
    (s) => (db.scores[s.id] || {})[subject?.id]?.t1 !== undefined
  ).length;

  // Derive extra roles dynamically from DB (so role changes take effect without re-login)
  const roles = db.roles || {};
  const extraRoles = [];
  if (roles.formMaster === teacher.id)    extraRoles.push("formMaster");
  if (roles.houseMistress === teacher.id) extraRoles.push("houseMistress");
  if (roles.principal === teacher.id)     extraRoles.push("principal");
  const hasRoles = extraRoles.length > 0;

  const ROLE_LABELS = {
    formMaster:    "Form Master",
    houseMistress: "House Mistress",
    principal:     "Principal",
  };

  function handleStudentClick(student) {
    if (db.locked) { toast("🔒 Results are locked. Contact your admin.", "error"); return; }
    setSelectedStudent(student);
  }

  function handleSaveScore({ scores, comment, signature }) {
    updateDB((d) => {
      if (!d.scores[selectedStudent.id]) d.scores[selectedStudent.id] = {};
      d.scores[selectedStudent.id][subject.id] = scores;
      if (!d.teacherComments) d.teacherComments = {};
      if (!d.teacherComments[selectedStudent.id]) d.teacherComments[selectedStudent.id] = {};
      d.teacherComments[selectedStudent.id][subject.id] = { comment, signature };
      return d;
    });
    toast(`✅ Score saved for ${selectedStudent.name}!`);
    setSelectedStudent(null);
  }

  if (!subject) {
    return (
      <div className={styles.noSubject}>
        <div className={styles.noSubjectIcon}>⚠️</div>
        <h2>No Subject Assigned</h2>
        <p>Your account has no subject assigned. Please contact your admin.</p>
      </div>
    );
  }

  const existingScore   = selectedStudent ? (db.scores[selectedStudent.id] || {})[subject.id] : null;
  const existingComment = selectedStudent ? ((db.teacherComments || {})[selectedStudent.id] || {})[subject.id] : null;

  return (
    <div className={styles.page}>
      {db.locked && (
        <div className={styles.lockedBanner}>
          🔒 Results have been locked by the admin. Score entry is currently disabled.
        </div>
      )}

      {/* Section switcher — only shown if teacher has a staff role too */}
      {hasRoles && !selectedStudent && (
        <div className={styles.sectionTabs}>
          <button
            className={[styles.sectionTab, activeSection === "scores" ? styles.sectionTabActive : ""].join(" ")}
            onClick={() => setActiveSection("scores")}
          >
            📝 Scores — {subject.name}
          </button>
          <button
            className={[styles.sectionTab, activeSection === "comments" ? styles.sectionTabActive : ""].join(" ")}
            onClick={() => setActiveSection("comments")}
          >
            💬 Staff Comments ({extraRoles.map((r) => ROLE_LABELS[r]).join(", ")})
          </button>
        </div>
      )}

      {selectedStudent ? (
        /* ── Score + Comment Entry ── */
        <ScoreEntryForm
          student={selectedStudent}
          subject={subject}
          existingScore={existingScore}
          existingComment={existingComment}
          locked={db.locked}
          onSave={handleSaveScore}
          onBack={() => setSelectedStudent(null)}
        />
      ) : activeSection === "comments" && hasRoles ? (
        /* ── Staff Comment Panel ── */
        <StaffCommentPanel teacher={teacher} extraRoles={extraRoles} toast={toast} />
      ) : (
        /* ── Student Grid ── */
        <>
          <div className={styles.subjectBanner}>
            <div className={styles.bannerIcon}>📖</div>
            <div className={styles.bannerText}>
              <div className={styles.bannerSubject}>{subject.name}</div>
              <div className={styles.bannerSub}>
                {db.locked ? "⚠️ Results locked — view only" : "Click a student card to enter scores and comments"}
              </div>
            </div>
            <div className={styles.bannerStats}>
              <div className={styles.bannerNum}>{scoredCount}/{db.students.length}</div>
              <div className={styles.bannerNumLabel}>Students Scored</div>
            </div>
          </div>

          <div className={styles.filterBar}>
            <select className={styles.filterSelect} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {!filteredStudents.length ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎓</div>
              <p>No students found. Ask your admin to add students.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  subject={subject}
                  scores={db.scores}
                  locked={db.locked}
                  onClick={handleStudentClick}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
