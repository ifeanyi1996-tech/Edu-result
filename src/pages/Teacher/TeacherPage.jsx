import React, { useState } from "react";
import { useDB } from "../../context/DBContext";
import { getClasses, getTeacherSubjectIds, getSubjectsForClass } from "../../utils/grades";
import StudentCard from "../../components/teacher/StudentCard";
import ScoreEntryForm from "../../components/teacher/ScoreEntryForm";
import StaffCommentPanel from "../../components/teacher/StaffCommentPanel";
import styles from "./TeacherPage.module.css";

export default function TeacherPage({ teacher, toast }) {
  const { db, updateDB } = useDB();

  // Teacher may now have multiple subjects
  const subjectIds   = getTeacherSubjectIds(teacher);
  const allSubjects  = db.subjects.filter((s) => subjectIds.includes(s.id));

  // Which subject is the teacher currently entering scores for?
  const [activeSubjectId, setActiveSubjectId] = useState(allSubjects[0]?.id || "");
  const activeSubject = db.subjects.find((s) => s.id === activeSubjectId) || allSubjects[0];

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classFilter,     setClassFilter]     = useState("");
  const [activeSection,   setActiveSection]   = useState("scores");

  const classes = getClasses(db.students);

  // Only show students whose class has this subject in scope
  const eligibleStudents = db.students.filter((s) => {
    if (classFilter && s.class !== classFilter) return false;
    if (!activeSubject) return false;
    const classSubjs = getSubjectsForClass(db.subjects, s.class);
    return classSubjs.some((sub) => sub.id === activeSubject.id);
  });

  const scoredCount = eligibleStudents.filter(
    (s) => (db.scores[s.id] || {})[activeSubject?.id]?.t1 !== undefined
  ).length;

  // Extra roles (form master, house mistress, principal)
  const roles      = db.roles || {};
  const extraRoles = [];
  if (roles.formMaster    === teacher.id) extraRoles.push("formMaster");
  if (roles.houseMistress === teacher.id) extraRoles.push("houseMistress");
  if (roles.principal     === teacher.id) extraRoles.push("principal");
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
    if (!activeSubject) return;
    updateDB((d) => {
      if (!d.scores[selectedStudent.id]) d.scores[selectedStudent.id] = {};
      d.scores[selectedStudent.id][activeSubject.id] = scores;
      if (!d.teacherComments) d.teacherComments = {};
      if (!d.teacherComments[selectedStudent.id]) d.teacherComments[selectedStudent.id] = {};
      d.teacherComments[selectedStudent.id][activeSubject.id] = { comment, signature };
      return d;
    });
    toast(`✅ ${activeSubject.name} score saved for ${selectedStudent.name}!`);
    setSelectedStudent(null);
  }

  // No subjects assigned at all
  if (allSubjects.length === 0) {
    return (
      <div className={styles.noSubject}>
        <div className={styles.noSubjectIcon}>⚠️</div>
        <h2>No Subject Assigned</h2>
        <p>Your account has no subject assigned yet. Please contact your admin.</p>
      </div>
    );
  }

  const existingScore   = selectedStudent ? (db.scores[selectedStudent.id] || {})[activeSubject?.id] : null;
  const existingComment = selectedStudent ? ((db.teacherComments || {})[selectedStudent.id] || {})[activeSubject?.id] : null;

  return (
    <div className={styles.page}>
      {db.locked && (
        <div className={styles.lockedBanner}>
          🔒 Results have been locked by the admin. Score entry is currently disabled.
        </div>
      )}

      {/* ── Section switcher (scores vs staff comments) ── */}
      {hasRoles && !selectedStudent && (
        <div className={styles.sectionTabs}>
          <button
            className={[styles.sectionTab, activeSection === "scores" ? styles.sectionTabActive : ""].join(" ")}
            onClick={() => setActiveSection("scores")}
          >📝 Score Entry</button>
          {extraRoles.map((r) => (
            <button key={r}
              className={[styles.sectionTab, activeSection === r ? styles.sectionTabActive : ""].join(" ")}
              onClick={() => setActiveSection(r)}
            >🗣 {ROLE_LABELS[r]} Comments</button>
          ))}
        </div>
      )}

      {/* ══ SCORE ENTRY SECTION ══ */}
      {(activeSection === "scores" || !hasRoles) && !selectedStudent && (
        <>
          {/* ── Subject picker (shown only if teacher has >1 subject) ── */}
          {allSubjects.length > 1 && (
            <div className={styles.subjectPickerWrap}>
              <p className={styles.subjectPickerLabel}>📚 Select subject to enter scores:</p>
              <div className={styles.subjectPicker}>
                {allSubjects.map((s) => {
                  const isActive = s.id === activeSubjectId;
                  const secColor = s.section === "SSS" ? "#1d4ed8" : s.section === "JSS" ? "#065f46" : "#6d28d9";
                  const secBg   = s.section === "SSS" ? "#dbeafe" : s.section === "JSS" ? "#d1fae5" : "#f3e8ff";
                  return (
                    <button
                      key={s.id}
                      className={styles.subjectChip}
                      style={{
                        background:   isActive ? secColor : secBg,
                        color:        isActive ? "#fff"   : secColor,
                        border:       `2px solid ${secColor}`,
                        fontWeight:   isActive ? 700 : 600,
                      }}
                      onClick={() => { setActiveSubjectId(s.id); setSelectedStudent(null); }}
                    >
                      {s.name}
                      <span style={{ fontSize:10, opacity:0.8, marginLeft:4 }}>({s.section || "All"})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Info bar ── */}
          <div className={styles.infoBar}>
            <span className={styles.subjectLabel}>
              📝 {activeSubject?.name}
              {activeSubject?.section && (
                <span className={styles.sectionPill}>{activeSubject.section}</span>
              )}
            </span>
            <span className={styles.progressBadge}>{scoredCount}/{eligibleStudents.length} scored</span>
          </div>

          {/* ── Class filter ── */}
          <div className={styles.filterRow}>
            <label className={styles.filterLabel}>Filter by class:</label>
            <select className={styles.filterSelect} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {eligibleStudents.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎓</div>
              <p>No students found for <strong>{activeSubject?.name}</strong> in {classFilter || "any class"}.</p>
              <p style={{ fontSize:12, color:"#94a3b8", marginTop:6 }}>This subject may not be assigned to that class section (JSS/SSS).</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {eligibleStudents.map((s) => (
                <StudentCard
                  key={s.id}
                  student={s}
                  subject={activeSubject}
                  scores={db.scores}
                  onClick={handleStudentClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ══ STAFF COMMENT SECTIONS ══ */}
      {hasRoles && extraRoles.map((role) =>
        activeSection === role && !selectedStudent ? (
          <StaffCommentPanel key={role} role={role} teacher={teacher} toast={toast} />
        ) : null
      )}

      {/* ══ SCORE ENTRY FORM ══ */}
      {selectedStudent && activeSubject && (
        <ScoreEntryForm
          student={selectedStudent}
          subject={activeSubject}
          existingScore={existingScore}
          existingComment={existingComment}
          onSave={handleSaveScore}
          onCancel={() => setSelectedStudent(null)}
          locked={db.locked}
        />
      )}
    </div>
  );
}
