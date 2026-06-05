import React, { useState } from "react";
import { useDB } from "../../context/DBContext";
import { getClasses, getTeacherSubjectIds, getSubjectsForClass } from "../../utils/grades";
import StudentCard from "../../components/teacher/StudentCard";
import ScoreEntryForm from "../../components/teacher/ScoreEntryForm";
import StaffCommentPanel from "../../components/teacher/StaffCommentPanel";
import styles from "./TeacherPage.module.css";

export default function TeacherPage({ teacher, toast }) {
  const { db, updateDB, isOnline } = useDB();

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
  // AND who are enrolled in the subject (if an enrollment list exists for it)
  const eligibleStudents = db.students.filter((s) => {
    if (classFilter && s.class !== classFilter) return false;
    if (!activeSubject) return false;
    const classSubjs = getSubjectsForClass(db.subjects, s.class, s.stream);
    if (!classSubjs.some((sub) => sub.id === activeSubject.id)) return false;
    // Enrollment check: if the subject has an explicit list, student must be on it
    const enrolled = (db.enrollment || {})[activeSubject.id];
    if (Array.isArray(enrolled) && enrolled.length > 0) return enrolled.includes(s.id);
    return true;
  });

  const scoredCount = eligibleStudents.filter(
    (s) => (db.scores[s.id] || {})[activeSubject?.id]?.t1 !== undefined
  ).length;

  // Offline: scores always save to localStorage immediately via updateDB.
  // When back online, DBContext auto-pushes localStorage → Firestore.
  const syncBadge = isOnline
    ? { bg:"#f0fdf4", border:"#86efac", color:"#065f46", icon:"🟢", text:"Online · Synced" }
    : { bg:"#fef3c7", border:"#fcd34d", color:"#92400e", icon:"🟡", text:"Offline · Scores saved locally" };

  // Extra roles (form master, house mistress, principal)
  const roles      = db.roles || {};
  const extraRoles = [];
  // Per-class form masters: teacher is FM if assigned to any class
  const formMasters = roles.formMasters || {};
  const myClasses   = Object.entries(formMasters)
    .filter(([, tid]) => tid === teacher.id)
    .map(([cls]) => cls);
  // Also support legacy single formMaster field
  if (myClasses.length > 0 || roles.formMaster === teacher.id) extraRoles.push("formMaster");
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

  function handleSaveScore({ scores, signature }) {
    if (!activeSubject) return;
    updateDB((d) => {
      if (!d.scores[selectedStudent.id]) d.scores[selectedStudent.id] = {};
      d.scores[selectedStudent.id][activeSubject.id] = scores;
      // Persist teacher signature once — auto-fills all result slips
      if (signature) {
        if (!d.teacherSignatures) d.teacherSignatures = {};
        d.teacherSignatures[teacher.id] = signature;
      }
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
  const existingComment  = null; // comments removed — grade interpretation used instead
  const teacherSignature = (db.teacherSignatures || {})[teacher.id] || "";

  return (
    <div className={styles.page}>
      {db.locked && (
        <div className={styles.lockedBanner}>
          🔒 Results have been locked by the admin. Score entry is currently disabled.
        </div>
      )}

      {/* ── Teacher Signature ── */}
      {(() => {
        const sig = (db.teacherSignatures || {})[teacher.id];
        const [showPad, setShowPad] = React.useState(!sig);
        const canvasRef = React.useRef(null);
        const drawing   = React.useRef(false);

        function getPos(e, canvas) {
          const r = canvas.getBoundingClientRect();
          const src = e.touches ? e.touches[0] : e;
          return { x: src.clientX - r.left, y: src.clientY - r.top };
        }
        function startDraw(e) {
          drawing.current = true;
          const ctx = canvasRef.current.getContext("2d");
          const { x, y } = getPos(e, canvasRef.current);
          ctx.beginPath(); ctx.moveTo(x, y);
        }
        function draw(e) {
          if (!drawing.current) return;
          e.preventDefault();
          const ctx = canvasRef.current.getContext("2d");
          const { x, y } = getPos(e, canvasRef.current);
          ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a";
          ctx.lineTo(x, y); ctx.stroke();
        }
        function stopDraw() { drawing.current = false; }
        function clearPad() {
          const c = canvasRef.current;
          c.getContext("2d").clearRect(0, 0, c.width, c.height);
        }
        function saveSig() {
          const dataUrl = canvasRef.current.toDataURL();
          updateDB((d) => { if (!d.teacherSignatures) d.teacherSignatures = {}; d.teacherSignatures[teacher.id] = dataUrl; return d; });
          toast("✅ Signature saved — auto-fills all your result slips.");
          setShowPad(false);
        }

        return (
          <div style={{ background: sig ? "#f0fdf4" : "#fef3c7", border: `1.5px solid ${sig ? "#86efac" : "#fcd34d"}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: showPad ? 12 : 0 }}>
              <div>
                <span style={{ fontWeight:700, fontSize:13, color: sig ? "#065f46" : "#92400e" }}>
                  {sig ? "✅ Signature saved" : "✍️ Sign here — appears on all your result slips"}
                </span>
                {sig && <span style={{ fontSize:12, color:"#64748b", marginLeft:8 }}>Your signature auto-fills every result slip you submit.</span>}
              </div>
              {sig && !showPad && (
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <img src={sig} alt="signature" style={{ height:36, maxWidth:120, objectFit:"contain", background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, padding:"2px 6px" }} />
                  <button onClick={() => setShowPad(true)} style={{ fontSize:12, padding:"4px 10px", borderRadius:7, border:"1px solid #86efac", background:"#fff", cursor:"pointer", color:"#065f46" }}>✏️ Update</button>
                </div>
              )}
            </div>
            {showPad && (
              <div>
                <canvas ref={canvasRef} width={420} height={90}
                  style={{ width:"100%", height:90, border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", touchAction:"none", cursor:"crosshair", display:"block" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                />
                <div style={{ display:"flex", gap:8, marginTop:8 }}>
                  <button onClick={clearPad} style={{ fontSize:12, padding:"5px 12px", borderRadius:7, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>🗑 Clear</button>
                  <button onClick={saveSig} style={{ fontSize:12, padding:"5px 16px", borderRadius:7, border:"none", background:"#059669", color:"#fff", cursor:"pointer", fontWeight:700 }}>💾 Save Signature</button>
                  {sig && <button onClick={() => setShowPad(false)} style={{ fontSize:12, padding:"5px 12px", borderRadius:7, border:"1px solid #e2e8f0", background:"#f8fafc", cursor:"pointer", color:"#64748b" }}>Cancel</button>}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Sync status badge ── */}
      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", background:syncBadge.bg, border:`1px solid ${syncBadge.border}`, borderRadius:8, fontSize:12, fontWeight:600, color:syncBadge.color, marginBottom:12 }}>
        {syncBadge.icon} {syncBadge.text}{!isOnline && <span style={{ fontWeight:400 }}> — will sync when back online</span>}
      </div>

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
          <StaffCommentPanel key={role} extraRoles={[role]} teacher={teacher} toast={toast} formMasterClasses={myClasses} />
        ) : null
      )}

      {/* ══ SCORE ENTRY FORM ══ */}
      {selectedStudent && activeSubject && (
        <ScoreEntryForm
          student={selectedStudent}
          subject={activeSubject}
          existingScore={existingScore}
          existingComment={{ signature: teacherSignature }}
          onSave={handleSaveScore}
          onBack={() => setSelectedStudent(null)}
          locked={db.locked}
        />
      )}
    </div>
  );
}
