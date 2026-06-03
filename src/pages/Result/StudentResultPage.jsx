// ─── Public Student Result Page ───────────────────────────────────────────────
// Accessed via: ?result=STUDENT_ID&school=SCHOOL_ID
// No login required — data is fetched directly from Firestore.

import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase";
import { getGrade, rankStudents, getSubjectsForClass } from "../../utils/grades";

const BEHAVIOUR_ROWS = [
  "Punctuality","Attendance in Class","Attentiveness in Class",
  "Carrying out assignments","Participation in Sch. Activities",
  "Neatness","Honesty","Relationship with others",
  "Helping Others","Self Control","Games, Sports",
  "Handling of Tools, Lab & Workshop",
];
const GRADES_OPTS = ["A","B","C","D","E"];

export default function StudentResultPage({ schoolId, studentId }) {
  const [state, setState] = useState("loading"); // loading | error | ready
  const [school, setSchool] = useState(null);
  const [db,     setDb]     = useState(null);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch school profile + school data in parallel
        const [schoolSnap, dataSnap] = await Promise.all([
          getDoc(doc(firestore, "schools",     schoolId)),
          getDoc(doc(firestore, "schoolData",  schoolId)),
        ]);

        if (!schoolSnap.exists() || !dataSnap.exists()) {
          setState("error"); return;
        }

        const schoolData = dataSnap.data();
        const found = (schoolData.students || []).find((s) => s.id === studentId);
        if (!found) { setState("error"); return; }

        setSchool(schoolSnap.data());
        setDb(schoolData);
        setStudent(found);
        setState("ready");
      } catch (e) {
        console.error(e);
        setState("error");
      }
    }
    load();
  }, [schoolId, studentId]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ marginTop: 16, color: "#666", fontSize: 14 }}>Loading result…</p>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div style={styles.center}>
        <div style={{ fontSize: 48 }}>😕</div>
        <h2 style={{ margin: "12px 0 8px", color: "#1e293b" }}>Result Not Found</h2>
        <p style={{ color: "#64748b", fontSize: 14, textAlign: "center", maxWidth: 340 }}>
          This link may be invalid or the result has not been published yet.
          Please contact your school admin.
        </p>
      </div>
    );
  }

  // ── Ready — render result ────────────────────────────────────────────────
  const cls      = student.class;
  const classmates = (db.students || []).filter((s) => s.class === cls);
  const ranked   = rankStudents(classmates, db.scores || {}, db.subjects || []);
  const myRank   = ranked.find((r) => r.id === studentId);
  const position = myRank?.pos ?? "—";
  const total    = ranked.length;

  const info       = (db.studentInfo || {})[studentId] || {};
  const termNames  = ["First Term", "Second Term", "Third Term"];
  const termLabel  = db.currentTerm
    ? `${termNames[(db.currentTerm.term || 1) - 1]} ${db.currentTerm.year}`
    : (info.term || "—");
  const schoolDays    = db.schoolDays || 0;
  const daysPresent   = (db.attendance || {})[studentId];
  const hasAttendance = schoolDays > 0 || daysPresent !== undefined;
  const staffC   = (db.staffComments || {})[studentId] || {};
  const affData  = (db.affective || {})[studentId] || {};
  const subjects = getSubjectsForClass(db.subjects || [], student.class, student.stream);

  let grandTotal = 0;
  const subjectRows = subjects.map((sub) => {
    const sc    = ((db.scores || {})[studentId] || {})[sub.id] || {};
    const tc    = ((db.teacherComments || {})[studentId] || {})[sub.id] || {};
    const t1    = sc.t1   !== undefined ? Number(sc.t1)   : null;
    const t2    = sc.t2   !== undefined ? Number(sc.t2)   : null;
    const exam  = sc.exam !== undefined ? Number(sc.exam) : null;
    const hasS  = sc.t1   !== undefined;
    const rowTotal = (Number(t1)||0) + (Number(t2)||0) + (Number(exam)||0);
    if (hasS) grandTotal += rowTotal;
    const grade = hasS ? getGrade(rowTotal) : null;

    return { sub, t1, t2, exam, rowTotal, hasS, grade, comment: tc.comment || "" };
  });

  const scoredCount = subjectRows.filter((r) => r.hasS).length;
  const maxPossible = scoredCount * 100;
  const avgPct = maxPossible > 0 ? ((grandTotal / maxPossible) * 100).toFixed(1) : null;

  const locked = db.locked;

  return (
    <div style={styles.page}>
      {/* ── Locked banner ── */}
      {locked && (
        <div style={styles.lockedBanner}>
          🔒 Results are currently locked by the admin. Scores are hidden until published.
        </div>
      )}

      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLogoWrap}>
          {school.logo
            ? <img src={school.logo} alt="logo" style={styles.headerLogo} />
            : <div style={styles.headerLogoPlaceholder}>{(school.schoolName||"").substring(0,3)}</div>
          }
        </div>
        <div style={styles.headerCenter}>
          <div style={styles.schoolName}>{(school.schoolName||"").toUpperCase()}</div>
          <div style={styles.schoolAddr}>{school.address}</div>
          {school.principalName && (
            <div style={styles.schoolPrincipal}>Principal: {school.principalName}</div>
          )}
        </div>
        <div style={styles.passportBox}>
          {info.passport
            ? <img src={info.passport} alt="passport" style={styles.passportImg} />
            : <span style={styles.passportPlaceholder}>Passport<br/>Photo</span>
          }
        </div>
      </div>

      {/* ── Title ── */}
      <div style={styles.reportTitle}>Students Termly Report Sheet</div>

      {/* ── Student Info ── */}
      <table style={styles.infoTable}>
        <tbody>
          <tr>
            <td style={styles.infoCell}><b>Name:</b> {student.name}</td>
            <td style={styles.infoCell}><b>Adm. No.:</b> {info.admNo || "—"}</td>
            <td style={styles.infoCell}><b>Class:</b> {cls}</td>
            <td style={styles.infoCell}><b>Sex:</b> {info.sex || "—"}</td>
          </tr>
          <tr>
            <td style={styles.infoCell}><b>Form Position:</b> {position}</td>
            <td style={styles.infoCell}><b>Out of:</b> {total}</td>
            <td style={{ ...styles.infoCell, borderRight: "none" }} colSpan={2}><b>Term:</b> {termLabel}</td>
          </tr>
          {hasAttendance && (
          <tr>
            <td style={styles.infoCell}><b>Days School Opened:</b> {schoolDays || "—"}</td>
            <td style={styles.infoCell}><b>Days Present:</b> {daysPresent !== undefined ? daysPresent : "—"}</td>
            <td style={{ ...styles.infoCell, borderRight: "none" }} colSpan={2}>
              <b>Days Absent:</b> {daysPresent !== undefined && schoolDays ? schoolDays - daysPresent : "—"}
            </td>
          </tr>
          )}
        </tbody>
      </table>

      {/* ── Cognitive Domain ── */}
      <div style={styles.sectionBar}>Cognitive Domain</div>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.cogTable}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: "left", minWidth: 140 }}>SUBJECTS</th>
              <th style={styles.th}>1st C.A.</th>
              <th style={styles.th}>2nd C.A.</th>
              <th style={styles.th}>EXAM</th>
              <th style={styles.th}>TOTAL<br/>100%</th>
              <th style={styles.th}>GRADE</th>
              <th style={{ ...styles.th, minWidth: 140 }}>TEACHER'S COMMENT</th>
            </tr>
          </thead>
          <tbody>
            {subjectRows.map(({ sub, t1, t2, exam, rowTotal, hasS, grade, comment }) => (
              <tr key={sub.id}>
                <td style={{ ...styles.td, textAlign: "left" }}>{sub.name}</td>
                <td style={styles.td}>{locked ? "—" : (t1 !== null ? t1 : "")}</td>
                <td style={styles.td}>{locked ? "—" : (t2 !== null ? t2 : "")}</td>
                <td style={styles.td}>{locked ? "—" : (exam !== null ? exam : "")}</td>
                <td style={{ ...styles.td, fontWeight: 700 }}>{locked ? "—" : (hasS ? rowTotal : "")}</td>
                <td style={{
                  ...styles.td,
                  fontWeight: 700,
                  color: grade?.color || "#000",
                  background: grade?.bg || "transparent",
                }}>
                  {locked ? "—" : (grade?.letter || "")}
                </td>
                <td style={{ ...styles.td, textAlign: "left", fontSize: 11 }}>{comment}</td>
              </tr>
            ))}
            <tr style={{ background: "#f1f5f9" }}>
              <td style={{ ...styles.td, fontWeight: 700, textAlign: "left" }}>TOTAL MARKS</td>
              <td style={styles.td} /><td style={styles.td} /><td style={styles.td} />
              <td style={{ ...styles.td, fontWeight: 700 }}>{locked ? "—" : (grandTotal || "")}</td>
              <td style={styles.td} /><td style={styles.td} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Bottom section ── */}
      <div style={styles.bottom}>
        {/* Left: summary + comments */}
        <div style={styles.bottomLeft}>
          <div style={styles.avgRow}>
            <b>Average Percentage:</b>
            <span style={styles.avgVal}>{locked ? "—" : (avgPct ? avgPct + "%" : "—")}</span>
          </div>

          {[
            { label: "Form Master's Comment:", val: staffC.formMaster },
            { label: "House Mistress Comment:", val: staffC.houseMistress },
            { label: "Principal's Comment:",    val: staffC.principal },
          ].map(({ label, val }) => (
            <div key={label} style={styles.commentBlock}>
              <div style={styles.commentLabel}>{label}</div>
              <div style={styles.commentVal}>{val || <span style={{ color: "#aaa" }}>—</span>}</div>
            </div>
          ))}

          <div style={styles.promotedRow}>
            <b>Promoted / Not Promoted:</b> ___________________________
          </div>
        </div>

        {/* Right: affective */}
        <div style={styles.bottomRight}>
          <div style={styles.affTitle}>Affective &amp; Psychomotor Domains Ratings</div>
          <table style={{ ...styles.cogTable, fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ ...styles.th, textAlign: "left", fontSize: 10 }}>BEHAVIOUR</th>
                {GRADES_OPTS.map((g) => <th key={g} style={{ ...styles.th, width: 28 }}>{g}</th>)}
              </tr>
            </thead>
            <tbody>
              {BEHAVIOUR_ROWS.map((b) => {
                const rating = affData[b] || "";
                return (
                  <tr key={b}>
                    <td style={{ ...styles.td, textAlign: "left", fontSize: 10 }}>{b}</td>
                    {GRADES_OPTS.map((g) => (
                      <td key={g} style={{
                        ...styles.td,
                        background: rating === g ? "#1e293b" : "transparent",
                        color:      rating === g ? "#fff"    : "#000",
                        fontWeight: rating === g ? 700       : 400,
                      }}>{rating === g ? g : ""}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={styles.ratingKey}>
            <b>KEY:</b> A = Excellent · B = Good · C = Fair · D = Poor · E = V. Poor
          </div>
        </div>
      </div>

      {/* ── Principal sig ── */}
      <div style={styles.principalSig}>
        ________________________________<br />Principal's Signature
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        Powered by <b>EduResult</b> · This result was generated online and is valid.
      </div>
    </div>
  );
}

// ── Inline styles (no CSS file needed — works standalone) ──────────────────
const styles = {
  page: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "24px 16px 40px",
    fontFamily: "Arial, sans-serif",
    fontSize: 13,
    color: "#000",
    background: "#fff",
    minHeight: "100vh",
  },
  center: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", minHeight: "100vh", gap: 8,
  },
  spinner: {
    width: 40, height: 40,
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #0f766e",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  lockedBanner: {
    background: "#fef3c7", border: "1.5px solid #f59e0b",
    borderRadius: 8, padding: "10px 16px", marginBottom: 16,
    fontSize: 13, color: "#78350f", fontWeight: 600,
  },
  header: {
    display: "flex", alignItems: "center", gap: 16,
    borderBottom: "3px double #000", paddingBottom: 10, marginBottom: 6,
  },
  headerLogoWrap: { flexShrink: 0 },
  headerLogo: { width: 72, height: 72, objectFit: "contain" },
  headerLogoPlaceholder: {
    width: 72, height: 72, border: "2px solid #000",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 11, textAlign: "center", padding: 6,
  },
  headerCenter: { flex: 1, textAlign: "center" },
  schoolName: { fontSize: 20, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1.2 },
  schoolAddr: { fontSize: 11, marginTop: 4 },
  schoolPrincipal: { fontSize: 11, fontWeight: 700, marginTop: 2 },
  passportBox: {
    width: 72, height: 88, flexShrink: 0,
    border: "1.5px solid #000",
    display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden", fontSize: 10, color: "#888", textAlign: "center",
  },
  passportImg: { width: "100%", height: "100%", objectFit: "cover" },
  passportPlaceholder: { fontSize: 10, color: "#aaa", textAlign: "center", lineHeight: 1.4 },
  reportTitle: {
    textAlign: "center", fontSize: 14, fontWeight: 700,
    textDecoration: "underline", textTransform: "uppercase",
    letterSpacing: 0.5, margin: "6px 0 5px",
  },
  infoTable: {
    width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 4,
  },
  infoCell: {
    border: "1px solid #000", padding: "3px 6px",
  },
  sectionBar: {
    background: "#1e293b", color: "#fff",
    textAlign: "center", fontWeight: 700, fontSize: 12,
    padding: "3px 6px", textTransform: "uppercase", letterSpacing: 1,
    margin: "4px 0 0",
  },
  cogTable: {
    width: "100%", borderCollapse: "collapse", fontSize: 12,
  },
  th: {
    border: "1px solid #000", padding: "3px 5px",
    background: "#e2e8f0", fontWeight: 700, fontSize: 11,
    textAlign: "center", verticalAlign: "middle",
  },
  td: {
    border: "1px solid #000", padding: "2px 5px",
    textAlign: "center", verticalAlign: "middle",
  },
  bottom: {
    display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap",
  },
  bottomLeft: { flex: "1 1 300px" },
  bottomRight: { flex: "0 1 260px" },
  avgRow: {
    fontSize: 12, marginBottom: 10,
    display: "flex", gap: 8, alignItems: "center",
  },
  avgVal: {
    fontWeight: 700, fontSize: 14, color: "#0f766e",
  },
  commentBlock: { marginBottom: 8 },
  commentLabel: { fontWeight: 700, fontSize: 11, marginBottom: 2 },
  commentVal: {
    borderBottom: "1px solid #000", minHeight: 18,
    fontSize: 12, padding: "1px 0",
  },
  promotedRow: {
    marginTop: 10, fontSize: 12, borderTop: "1px solid #000", paddingTop: 6,
  },
  affTitle: {
    background: "#1e293b", color: "#fff", textAlign: "center",
    fontWeight: 700, fontSize: 10, padding: "2px 4px",
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  ratingKey: {
    fontSize: 10, marginTop: 4, color: "#444", lineHeight: 1.6,
  },
  principalSig: {
    textAlign: "right", marginTop: 16, fontSize: 11,
    borderTop: "1px solid #000", paddingTop: 6,
  },
  footer: {
    marginTop: 24, textAlign: "center", fontSize: 11,
    color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 12,
  },
};
