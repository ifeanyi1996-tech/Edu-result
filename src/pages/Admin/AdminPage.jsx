import React, { useState, useRef } from "react";
import { useDB } from "../../context/DBContext";
import { useSchool } from "../../context/SchoolContext";
import { compressImage } from "../../utils/imageUtils";
import { getClasses, rankStudents, getGrade } from "../../utils/grades";
import StatsRow from "../../components/admin/StatsRow";
import AdminTabs from "../../components/admin/AdminTabs";
import ClassResultsTable from "../../components/admin/ClassResultsTable";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import Modal from "../../components/common/Modal";
import Input from "../../components/common/Input";
import SelectField from "../../components/common/SelectField";
import styles from "./AdminPage.module.css";

const BEHAVIOUR_ROWS = [
  "Punctuality","Attendance in Class","Attentiveness in Class",
  "Carrying out assignments","Participation in Sch. Activities",
  "Neatness","Honesty","Relationship with others",
  "Helping Others","Self Control","Games, Sports",
  "Handling of Tools, Lab & Workshop",
];
const GRADES_OPTS = ["A","B","C","D","E"];

export default function AdminPage({ toast, school = {} }) {
  const { db, updateDB } = useDB();
  const [activeTab, setActiveTab] = useState("students");
  const [classFilter, setClassFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  // Modals
  const [studentModal, setStudentModal] = useState(false);
  const [teacherModal, setTeacherModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [editStudentModal, setEditStudentModal] = useState(null); // student object
  const [affectiveModal, setAffectiveModal] = useState(null);     // student object
  const [rolesModal, setRolesModal] = useState(false);

  // New item forms
  const [newStudent, setNewStudent] = useState({ name: "", class: "" });
  const [newTeacher, setNewTeacher] = useState({ name: "", subject: "" });
  const [newSubject, setNewSubject] = useState("");

  // Edit student info form
  const [editInfo, setEditInfo] = useState({ admNo: "", sex: "", term: "", passport: "" });

  // Affective draft
  const [affDraft, setAffDraft] = useState({});

  // Roles draft
  const [rolesDraft, setRolesDraft] = useState({ formMaster: "", houseMistress: "", principal: "" });

  const classes = getClasses(db.students);

  // ── Add / Delete helpers ────────────────────────────────────────────
  function addStudent() {
    const name = newStudent.name.trim();
    const cls  = newStudent.class.trim();
    if (!name) return toast("Student name is required.", "error");
    if (!cls)  return toast("Class is required.", "error");
    if (db.students.some((s) => s.name.toLowerCase() === name.toLowerCase()))
      return toast(`⚠️ Student "${name}" already exists!`, "error");
    updateDB((d) => { const id = Date.now().toString(); d.students.push({ id, name, class: cls }); d.scores[id] = {}; return d; });
    setNewStudent({ name: "", class: "" });
    setStudentModal(false);
    toast(`✅ Student "${name}" added.`);
  }

  function generateUniquePin() {
    const usedPins = new Set(db.teachers.map((t) => t.pin));
    let pin;
    let attempts = 0;
    do {
      // 6-digit PIN: 100000–999999
      pin = String(Math.floor(100000 + Math.random() * 900000));
      attempts++;
    } while (usedPins.has(pin) && attempts < 1000);
    return pin;
  }

  function addTeacher() {
    const name = newTeacher.name.trim();
    if (!name)               return toast("Teacher name is required.", "error");
    if (!newTeacher.subject) return toast("Please assign a subject.", "error");
    if (db.teachers.some((t) => t.name.toLowerCase() === name.toLowerCase()))
      return toast(`⚠️ Teacher "${name}" already exists!`, "error");
    const pin = generateUniquePin();
    updateDB((d) => { d.teachers.push({ id: Date.now().toString(), name, subject: newTeacher.subject, pin }); return d; });
    setNewTeacher({ name: "", subject: "" });
    setTeacherModal(false);
    toast(`✅ Teacher "${name}" added. Login PIN: ${pin}`);
  }

  function addSubject() {
    const name = newSubject.trim();
    if (!name) return toast("Subject name is required.", "error");
    if (db.subjects.some((s) => s.name.toLowerCase() === name.toLowerCase()))
      return toast(`⚠️ Subject "${name}" already exists!`, "error");
    updateDB((d) => { d.subjects.push({ id: Date.now().toString(), name }); return d; });
    setNewSubject(""); setSubjectModal(false);
    toast(`✅ Subject "${name}" added.`);
  }

  function deleteStudent(id) {
    if (!window.confirm("Delete this student and all their scores?")) return;
    updateDB((d) => { d.students = d.students.filter((s) => s.id !== id); delete d.scores[id]; return d; });
    toast("Student removed.", "info");
  }
  function deleteTeacher(id) {
    if (!window.confirm("Delete this teacher?")) return;
    updateDB((d) => { d.teachers = d.teachers.filter((t) => t.id !== id); return d; });
    toast("Teacher removed.", "info");
  }
  function deleteSubject(id) {
    if (!window.confirm("Delete this subject? All scores for it will be removed.")) return;
    updateDB((d) => { d.subjects = d.subjects.filter((s) => s.id !== id); Object.keys(d.scores).forEach((sid) => delete d.scores[sid][id]); return d; });
    toast("Subject removed.", "info");
  }
  function toggleLock() {
    updateDB((d) => { d.locked = !d.locked; return d; });
    toast(db.locked ? "🔓 Results unlocked!" : "🔒 Results locked!", db.locked ? "success" : "error");
  }

  // ── Edit student info ───────────────────────────────────────────────
  function openEditStudent(student) {
    const info = (db.studentInfo || {})[student.id] || {};
    setEditInfo({ admNo: info.admNo || "", sex: info.sex || "", term: info.term || "", passport: info.passport || "" });
    setEditStudentModal(student);
  }
  function saveStudentInfo() {
    updateDB((d) => {
      if (!d.studentInfo) d.studentInfo = {};
      d.studentInfo[editStudentModal.id] = { admNo: editInfo.admNo, sex: editInfo.sex, term: editInfo.term, passport: editInfo.passport || "" };
      return d;
    });
    setEditStudentModal(null);
    toast("✅ Student info saved.");
  }

  // ── Affective ratings ───────────────────────────────────────────────
  function openAffective(student) {
    const existing = (db.affective || {})[student.id] || {};
    setAffDraft({ ...existing });
    setAffectiveModal(student);
  }
  function saveAffective() {
    updateDB((d) => {
      if (!d.affective) d.affective = {};
      d.affective[affectiveModal.id] = { ...affDraft };
      return d;
    });
    setAffectiveModal(null);
    toast("✅ Ratings saved.");
  }

  // ── Roles ───────────────────────────────────────────────────────────
  function openRoles() {
    setRolesDraft({ ...db.roles });
    setRolesModal(true);
  }
  function saveRoles() {
    updateDB((d) => { d.roles = { ...rolesDraft }; return d; });
    setRolesModal(false);
    toast("✅ Role assignments saved.");
  }

  // ── Print ───────────────────────────────────────────────────────────
  function printResults() {
    if (!classes.length) return toast("No students to print.", "error");

    // School profile from Firestore (passed in via props)
    const schoolName    = school.schoolName    || "School Name";
    const schoolAddress = school.address       || "";
    const schoolLogo    = school.logo          || ""; // base64 dataURL or ""
    const principalName = school.principalName || "";

    const classRankings = {};
    classes.forEach((cls) => {
      classRankings[cls] = rankStudents(db.students.filter((s) => s.class === cls), db.scores);
    });

    const css = `
      @page { size: A4 portrait; margin: 8mm 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 10.5px; color: #000; background: #fff; }
      .page { width: 100%; page-break-after: always; }
      .page:last-child { page-break-after: avoid; }

      /* ── Header: logo | school info | passport ── */
      .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 6px; border-bottom: 3px double #000; margin-bottom: 4px; }
      .header-logo { width: 72px; height: 72px; flex-shrink: 0; }
      .header-logo img { width: 72px; height: 72px; object-fit: contain; }
      .header-logo-placeholder { width: 72px; height: 72px; border: 2px solid #000; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; text-align: center; padding: 4px; line-height: 1.2; }
      .header-center { flex: 1; text-align: center; padding: 0 10px; }
      .header-center h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2; }
      .header-center .addr { font-size: 10px; margin-top: 3px; }
      .header-passport { width: 72px; height: 85px; flex-shrink: 0; border: 1.5px solid #000; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #555; text-align: center; overflow: hidden; }
      .header-passport img { width: 100%; height: 100%; object-fit: cover; display: block; }

      /* ── Report title ── */
      .report-title { text-align: center; font-size: 12px; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin: 5px 0 4px; letter-spacing: 0.5px; }

      /* ── Student info rows ── */
      .info-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 3px; }
      .info-table td { border: 1px solid #000; padding: 2px 5px; }
      .info-label { font-weight: bold; white-space: nowrap; }
      .info-val { border-bottom: 1px solid #000; display: inline-block; min-width: 80px; }

      /* ── Cognitive domain ── */
      .section-bar { background: #000; color: #fff; text-align: center; font-weight: bold; font-size: 10.5px; padding: 2px 4px; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0; }
      .cog-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
      .cog-table th, .cog-table td { border: 1px solid #000; padding: 1.5px 3px; text-align: center; vertical-align: middle; }
      .cog-table thead th { background: #c8c8c8; font-weight: bold; font-size: 9px; }
      .cog-table .subj { text-align: left; width: 22%; }
      .cog-table tbody tr { height: 15px; }
      .cog-table .total-row td { font-weight: bold; background: #e8e8e8; }

      /* ── Bottom split ── */
      .bottom { display: flex; gap: 6px; margin-top: 5px; align-items: flex-start; }
      .bottom-left { flex: 1.7; }
      .bottom-right { width: 210px; flex-shrink: 0; }

      /* ── Comments ── */
      .avg-row { font-size: 10px; font-weight: bold; margin-bottom: 6px; display: flex; gap: 4px; align-items: flex-end; }
      .avg-line { flex: 1; border-bottom: 1px solid #000; }
      .comment-block { margin-bottom: 5px; font-size: 10px; }
      .comment-block .clabel { font-weight: bold; }
      .comment-block .ctext { border-bottom: 1px solid #000; min-height: 13px; font-size: 9.5px; padding: 1px 0; }
      .comment-block .cline { border-bottom: 1px solid #000; height: 13px; margin-top: 2px; }
      .sig-row { text-align: right; font-size: 9px; margin-top: 2px; }
      .sig-line { display: inline-block; border-bottom: 1px solid #000; width: 90px; margin-left: 4px; }
      .promoted { margin-top: 7px; font-size: 10px; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; }

      /* ── Affective ── */
      .aff-title { background: #000; color: #fff; text-align: center; font-weight: bold; font-size: 8.5px; padding: 2px; text-transform: uppercase; letter-spacing: 0.3px; }
      .aff-table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
      .aff-table th, .aff-table td { border: 1px solid #000; padding: 1.5px 2px; text-align: center; vertical-align: middle; }
      .aff-table .arow { text-align: left; font-size: 8px; }
      .aff-table thead th { background: #c8c8c8; font-weight: bold; font-size: 8px; }
      .aff-table tbody tr { height: 13px; }
      .aff-key { font-size: 7.5px; margin-top: 3px; line-height: 1.6; }

      /* ── Principal sig ── */
      .prin-sig { text-align: right; margin-top: 8px; font-size: 9.5px; border-top: 1px solid #000; padding-top: 4px; }

      /* ── Teacher initials img ── */
      .sig-img { height: 24px; max-width: 70px; object-fit: contain; display: block; margin: auto; }
    `;

    let pages = "";

    db.students.forEach((student) => {
      const cls = student.class;
      const ranked = classRankings[cls] || [];
      const studentRank = ranked.find((r) => r.id === student.id);
      const position = studentRank ? studentRank.pos : "—";
      const totalStudents = ranked.length;
      const info = (db.studentInfo || {})[student.id] || {};
      const staffC = (db.staffComments || {})[student.id] || {};
      const affData = (db.affective || {})[student.id] || {};

      let subjectRows = "";
      let grandTotal = 0;

      db.subjects.forEach((sub) => {
        const sc = (db.scores[student.id] || {})[sub.id] || {};
        const tc = (db.teacherComments?.[student.id] || {})[sub.id] || {};
        const t1   = sc.t1   !== undefined ? Number(sc.t1)   : "";
        const t2   = sc.t2   !== undefined ? Number(sc.t2)   : "";
        const exam = sc.exam !== undefined ? Number(sc.exam) : "";
        const total = (Number(t1) || 0) + (Number(t2) || 0) + (Number(exam) || 0);
        const hasScore = sc.t1 !== undefined;
        if (hasScore) grandTotal += total;
        const pct = hasScore ? total : "";
        const grade = hasScore ? getGrade(total).letter : "";
        const sigImg = tc.signature ? `<img src="${tc.signature}" class="sig-img" alt="sig"/>` : "";

        subjectRows += `<tr>
          <td class="subj">${sub.name}</td>
          <td>${t1 !== "" ? t1 : ""}</td>
          <td>${t2 !== "" ? t2 : ""}</td>
          <td>${exam !== "" ? exam : ""}</td>
          <td>${hasScore ? total : ""}</td>
          <td>${grade}</td>
          <td style="font-size:8.5px;text-align:left;padding:1px 3px">${tc.comment || ""}</td>
          <td>${sigImg}</td>
        </tr>`;
      });

      const scoredSubjects = db.subjects.filter((sub) => (db.scores[student.id] || {})[sub.id]?.t1 !== undefined).length;
      const maxPossible = scoredSubjects * 100;
      const avgPct = maxPossible > 0 ? ((grandTotal / maxPossible) * 100).toFixed(1) : "";

      const affRows = BEHAVIOUR_ROWS.map((b) => {
        const rating = affData[b] || "";
        const cells = GRADES_OPTS.map((g) =>
          `<td style="${rating === g ? "background:#000;color:#fff;font-weight:bold" : ""}">${rating === g ? g : ""}</td>`
        ).join("");
        return `<tr><td class="act-col">${b}</td>${cells}</tr>`;
      }).join("");

      const passportSrc = info.passport || "";

      pages += `<div class="page">

        <!-- ══ HEADER ══ -->
        <div class="header">
          <div class="header-logo">
            ${schoolLogo
              ? `<img src="${schoolLogo}" alt="logo" style="width:72px;height:72px;object-fit:contain;"/>`
              : `<div class="header-logo-placeholder">${schoolName.substring(0,12)}</div>`}
          </div>
          <div class="header-center">
            <h1>${schoolName.toUpperCase()}</h1>
            <div class="addr">${schoolAddress}</div>
          </div>
          <div class="header-passport">
            ${passportSrc
              ? `<img src="${passportSrc}" alt="passport"/>`
              : `Passport<br/>Photo`}
          </div>
        </div>

        <!-- ══ TITLE ══ -->
        <div class="report-title">J.S.S Students Termly Report Sheet</div>

        <!-- ══ STUDENT INFO ══ -->
        <table class="info-table">
          <tr>
            <td style="width:40%"><span class="info-label">Name: </span><span class="info-val">${student.name}</span></td>
            <td style="width:20%"><span class="info-label">Adm. No.: </span><span class="info-val">${info.admNo || ""}</span></td>
            <td style="width:20%"><span class="info-label">Class: </span><span class="info-val">${cls}</span></td>
            <td style="width:20%"><span class="info-label">Sex: </span><span class="info-val">${info.sex || ""}</span></td>
          </tr>
          <tr>
            <td><span class="info-label">Form Position this Term: </span><span class="info-val">${position}</span></td>
            <td><span class="info-label">Out of: </span><span class="info-val">${totalStudents}</span></td>
            <td colspan="2"><span class="info-label">Term: </span><span class="info-val">${info.term || ""}</span></td>
          </tr>
        </table>

        <!-- ══ COGNITIVE DOMAIN ══ -->
        <div class="section-bar">Cognitive Domain</div>
        <table class="cog-table">
          <thead>
            <tr>
              <th class="subj" rowspan="2">SUBJECTS</th>
              <th style="width:6%">1st<br/>C.A.</th>
              <th style="width:6%">2nd<br/>C.A.</th>
              <th style="width:9%">EXAM<br/>MARKS</th>
              <th style="width:9%">TOTAL<br/>100%</th>
              <th style="width:6%">GRADE</th>
              <th style="width:22%">TEACHER'S COMMENT</th>
              <th style="width:8%">TEACHER'S<br/>INITIALS</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
            <tr class="total-row">
              <td class="subj"><strong>TOTAL MARKS</strong></td>
              <td></td><td></td><td></td>
              <td><strong>${grandTotal || ""}</strong></td>
              <td></td><td></td><td></td>
            </tr>
          </tbody>
        </table>

        <!-- ══ BOTTOM ══ -->
        <div class="bottom">
          <!-- Left: comments -->
          <div class="bottom-left">
            <div class="avg-row">Average Percentage: <span class="avg-line"></span><strong>${avgPct ? avgPct + "%" : ""}</strong></div>

            <div class="comment-block">
              <div class="clabel">Form master's Comment(s):</div>
              <div class="ctext">${staffC.formMaster || ""}</div>
              <div class="cline"></div>
              <div class="sig-row">Signature: <span class="sig-line"></span></div>
            </div>

            <div class="comment-block">
              <div class="clabel">House Mistress Comments (s):</div>
              <div class="ctext">${staffC.houseMistress || ""}</div>
              <div class="cline"></div>
              <div class="sig-row">Signature: <span class="sig-line"></span></div>
            </div>

            <div class="comment-block">
              <div class="clabel">Principal's Comment(s):</div>
              <div class="ctext">${staffC.principal || ""}</div>
              <div class="cline"></div>
            </div>

            <div class="promoted">Promoted/Not Promoted: ______________________________</div>
          </div>

          <!-- Right: affective -->
          <div class="bottom-right">
            <div class="aff-title">Affective &amp; Psychomotor Domains Ratings</div>
            <table class="aff-table">
              <thead>
                <tr>
                  <th class="arow">BEHAVIOUR AND ACTIVITIES</th>
                  <th>A</th><th>B</th><th>C</th><th>D</th><th>E</th>
                </tr>
              </thead>
              <tbody>${affRows}</tbody>
            </table>
            <div class="aff-key">
              <b>KEY TO RATING:</b> A = Excellent &nbsp; B = Good &nbsp; C = Fair<br/>D = Poor &nbsp; E = V. Poor
            </div>
          </div>
        </div>

        <!-- ══ PRINCIPAL SIGNATURE ══ -->
        <div class="prin-sig">________________________________<br/>Principal's Signature</div>

      </div>`;
    });

    // Use a hidden iframe with srcdoc — this allows base64 images (logos, signatures)
    // to render correctly. window.open() can block them due to CSP in some browsers.
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
      <title>Report Sheets</title><style>${css}</style></head>
      <body>${pages}</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 500);
    };
  }

  // ── Derived ─────────────────────────────────────────────────────────
  const filteredStudents = db.students.filter((s) => !classFilter || s.class === classFilter);
  const resultClasses = resultFilter ? [resultFilter] : classes;
  const roles = db.roles || { formMaster: "", houseMistress: "", principal: "" };
  const getTeacherName = (id) => db.teachers.find((t) => t.id === id)?.name || "— Not assigned —";

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Admin Dashboard</h1>
          <p className={styles.pageSub}>Manage students, teachers, subjects and result entry.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" onClick={openRoles}>👥 Assign Roles</Button>
          <Button variant={db.locked ? "emerald" : "red"} onClick={toggleLock}>
            {db.locked ? "🔓 Unlock Results" : "🔒 Lock Results"}
          </Button>
          <Button variant="gold" onClick={printResults}>🖨️ Print Results</Button>
        </div>
      </div>

      {/* ── School ID banner — admin copies this and shares with teachers ── */}
      {(() => {
        const uid = localStorage.getItem("schoolUid");
        return uid ? (
          <div style={{
            background: "#fffbeb", border: "1.5px solid #f59e0b", borderRadius: 10,
            padding: "10px 16px", marginBottom: 8, display: "flex", alignItems: "center",
            gap: 12, flexWrap: "wrap", fontSize: 13,
          }}>
            <span style={{ fontWeight: 700, color: "#92400e" }}>📋 School ID (share with teachers):</span>
            <code style={{ background: "#fef3c7", padding: "3px 10px", borderRadius: 6, fontFamily: "monospace", fontSize: 13, letterSpacing: 1, color: "#78350f" }}>
              {uid}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(uid); }}
              style={{ padding: "4px 12px", background: "#f59e0b", border: "none", borderRadius: 6, fontFamily: "inherit", fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#fff" }}
            >Copy</button>
            <span style={{ color: "#92400e", fontSize: 12 }}>Teachers paste this on first login from a new device.</span>
          </div>
        ) : null;
      })()}

      <StatsRow students={db.students.length} teachers={db.teachers.length} subjects={db.subjects.length} classes={classes.length} />

      <AdminTabs active={activeTab} onChange={setActiveTab} />

      {/* ── STUDENTS TAB ── */}
      {activeTab === "students" && (
        <div className="anim-fade-up">
          <Card>
            <div className={styles.cardTopRow}>
              <span className={styles.cardTitle}>🎓 Students</span>
              <div className={styles.cardActions}>
                <select className={styles.filterSelect} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="">All Classes</option>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Button size="sm" onClick={() => setStudentModal(true)}>➕ Add Student</Button>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>#</th><th>Student Name</th><th>Class</th><th>Adm No.</th><th>Sex</th><th>Term</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {!filteredStudents.length ? (
                    <tr><td colSpan={7} className={styles.emptyCell}>No students yet. Add one above.</td></tr>
                  ) : filteredStudents.map((s, i) => {
                    const info = (db.studentInfo || {})[s.id] || {};
                    return (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td className={styles.bold}>{s.name}</td>
                        <td><span className={styles.classBadge}>{s.class}</span></td>
                        <td className={styles.muted}>{info.admNo || <em>—</em>}</td>
                        <td className={styles.muted}>{info.sex || <em>—</em>}</td>
                        <td className={styles.muted}>{info.term || <em>—</em>}</td>
                        <td className={styles.actionCell}>
                          <Button size="sm" variant="sky" onClick={() => openEditStudent(s)}>✏️ Edit Info</Button>
                          <Button size="sm" variant="teal" onClick={() => openAffective(s)}>📊 Affective</Button>
                          <Button size="sm" variant="red" onClick={() => deleteStudent(s.id)}>🗑</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── TEACHERS TAB ── */}
      {activeTab === "teachers" && (
        <div className="anim-fade-up">
          <Card>
            <div className={styles.cardTopRow}>
              <span className={styles.cardTitle}>👨‍🏫 Teachers</span>
              <Button size="sm" onClick={() => setTeacherModal(true)}>➕ Add Teacher</Button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Teacher Name</th><th>Assigned Subject</th><th>Role</th><th>Login PIN</th><th>Actions</th></tr></thead>
                <tbody>
                  {!db.teachers.length ? (
                    <tr><td colSpan={6} className={styles.emptyCell}>No teachers yet.</td></tr>
                  ) : db.teachers.map((t, i) => {
                    const sub = db.subjects.find((s) => s.id === t.subject);
                    const teacherRoles = [];
                    if (roles.formMaster === t.id) teacherRoles.push("Form Master");
                    if (roles.houseMistress === t.id) teacherRoles.push("House Mistress");
                    if (roles.principal === t.id) teacherRoles.push("Principal");
                    return (
                      <tr key={t.id}>
                        <td>{i + 1}</td>
                        <td className={styles.bold}>{t.name}</td>
                        <td>{sub ? <span className={styles.subjectBadge}>{sub.name}</span> : <em className={styles.muted}>Unassigned</em>}</td>
                        <td>{teacherRoles.length ? teacherRoles.map((r) => <span key={r} className={styles.rolePill}>{r}</span>) : <em className={styles.muted}>—</em>}</td>
                        <td>
                          <div className={styles.pinCell}>
                            <code className={styles.pinCode}>{t.pin}</code>
                            <button
                              className={styles.copyPinBtn}
                              title="Copy PIN"
                              onClick={() => {
                                navigator.clipboard?.writeText(t.pin).catch(() => {});
                                toast(`📋 PIN ${t.pin} copied for ${t.name}`);
                              }}
                            >📋</button>
                          </div>
                        </td>
                        <td><Button size="sm" variant="red" onClick={() => deleteTeacher(t.id)}>🗑 Remove</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {db.teachers.length > 0 && (
              <p className={styles.pinHint} style={{ marginTop: 10 }}>
                📱 Teachers can log in from <strong>any device</strong> (phone, tablet, laptop) using their PIN at this app's URL.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── SUBJECTS TAB ── */}
      {activeTab === "subjects" && (
        <div className="anim-fade-up">
          <Card>
            <div className={styles.cardTopRow}>
              <span className={styles.cardTitle}>📚 Subjects</span>
              <Button size="sm" onClick={() => setSubjectModal(true)}>➕ Add Subject</Button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Subject Name</th><th>Assigned Teacher</th><th>Actions</th></tr></thead>
                <tbody>
                  {!db.subjects.length ? (
                    <tr><td colSpan={4} className={styles.emptyCell}>No subjects yet.</td></tr>
                  ) : db.subjects.map((s, i) => {
                    const teacher = db.teachers.find((t) => t.subject === s.id);
                    return (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td className={styles.bold}>{s.name}</td>
                        <td>{teacher ? teacher.name : <em className={styles.muted}>No teacher</em>}</td>
                        <td><Button size="sm" variant="red" onClick={() => deleteSubject(s.id)}>🗑 Remove</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {activeTab === "results" && (
        <div className="anim-fade-up">
          <div className={styles.filterBar}>
            <label className={styles.filterLabel}>Filter by Class:</label>
            <select className={styles.filterSelect} value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {!classes.length ? (
            <div className={styles.emptyState}><div className={styles.emptyIcon}>📊</div><p>No students added yet.</p></div>
          ) : resultClasses.map((cls) => (
            <ClassResultsTable key={cls} className={cls} students={db.students.filter((s) => s.class === cls)} subjects={db.subjects} scores={db.scores} />
          ))}
        </div>
      )}

      {/* ── SCHOOL PROFILE TAB ── */}
      {activeTab === "school" && (
        <SchoolProfileTab school={school} toast={toast} />
      )}

      {/* ──────────────── MODALS ──────────────── */}

      {/* Add Student */}
      <Modal open={studentModal} onClose={() => setStudentModal(false)} title="Add New Student">
        <div className={styles.modalForm}>
          <Input label="Full Name" value={newStudent.name} onChange={(e) => setNewStudent((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Amara Johnson" />
          <Input label="Class" value={newStudent.class} onChange={(e) => setNewStudent((p) => ({ ...p, class: e.target.value }))} placeholder="e.g. JSS 1A" />
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setStudentModal(false)}>Cancel</Button>
            <Button onClick={addStudent}>Add Student</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Student Info */}
      <Modal open={!!editStudentModal} onClose={() => setEditStudentModal(null)} title={`Edit Info — ${editStudentModal?.name || ""}`}>
        <div className={styles.modalForm}>
          <Input label="Admission Number" value={editInfo.admNo} onChange={(e) => setEditInfo((p) => ({ ...p, admNo: e.target.value }))} placeholder="e.g. FP/2024/001" />
          <SelectField label="Sex" value={editInfo.sex} onChange={(e) => setEditInfo((p) => ({ ...p, sex: e.target.value }))}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </SelectField>
          <Input label="Term" value={editInfo.term} onChange={(e) => setEditInfo((p) => ({ ...p, term: e.target.value }))} placeholder="e.g. First Term 2024/2025" />

          {/* Passport Photo */}
          <div>
            <label style={{ fontWeight: 700, fontSize: 13, display: "block", marginBottom: 6 }}>Passport Photo</label>
            {editInfo.passport && (
              <img src={editInfo.passport} alt="passport" style={{ width: 80, height: 90, objectFit: "cover", border: "2px solid #ccc", borderRadius: 4, display: "block", marginBottom: 6 }} />
            )}
            <input
              type="file"
              accept="image/*"
              style={{ fontSize: 12 }}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const { compressImage } = await import("../../utils/imageUtils");
                const compressed = await compressImage(file, 200, 0.8);
                setEditInfo((p) => ({ ...p, passport: compressed }));
              }}
            />
            <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Appears on the printed report card. Use a clear face photo.</p>
          </div>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setEditStudentModal(null)}>Cancel</Button>
            <Button variant="emerald" onClick={saveStudentInfo}>💾 Save Info</Button>
          </div>
        </div>
      </Modal>

      {/* Affective ratings */}
      <Modal open={!!affectiveModal} onClose={() => setAffectiveModal(null)} title={`Affective Ratings — ${affectiveModal?.name || ""}`}>
        <div className={styles.affGrid}>
          <div className={styles.affHeader}>
            <span className={styles.affBehCol}>Behaviour</span>
            {GRADES_OPTS.map((g) => <span key={g} className={styles.affGradeHead}>{g}</span>)}
          </div>
          {BEHAVIOUR_ROWS.map((b) => (
            <div key={b} className={styles.affRow}>
              <span className={styles.affBehCol}>{b}</span>
              {GRADES_OPTS.map((g) => (
                <button
                  key={g}
                  className={[styles.affGradeBtn, affDraft[b] === g ? styles.affGradeSelected : ""].join(" ")}
                  onClick={() => setAffDraft((p) => ({ ...p, [b]: p[b] === g ? "" : g }))}
                >{g}</button>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.affKey}>A = Excellent · B = Good · C = Fair · D = Poor · E = V.Poor</div>
        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <Button variant="outline" onClick={() => setAffectiveModal(null)}>Cancel</Button>
          <Button variant="emerald" onClick={saveAffective}>💾 Save Ratings</Button>
        </div>
      </Modal>

      {/* Roles assignment */}
      <Modal open={rolesModal} onClose={() => setRolesModal(false)} title="Assign Staff Roles">
        <p className={styles.pinHint} style={{ marginBottom: 16 }}>
          The assigned teacher will be able to edit that comment section in the Teacher Portal.
        </p>
        <div className={styles.modalForm}>
          {[
            { key: "formMaster", label: "Form Master" },
            { key: "houseMistress", label: "House Mistress" },
            { key: "principal", label: "Principal" },
          ].map(({ key, label }) => (
            <SelectField key={key} label={label} value={rolesDraft[key] || ""} onChange={(e) => setRolesDraft((p) => ({ ...p, [key]: e.target.value }))}>
              <option value="">— Not assigned —</option>
              {db.teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </SelectField>
          ))}
          <p className={styles.pinHint}>
            Currently: Form Master = {getTeacherName(roles.formMaster)} · 
            House Mistress = {getTeacherName(roles.houseMistress)} · 
            Principal = {getTeacherName(roles.principal)}
          </p>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setRolesModal(false)}>Cancel</Button>
            <Button variant="emerald" onClick={saveRoles}>💾 Save Roles</Button>
          </div>
        </div>
      </Modal>

      {/* Add Teacher */}
      <Modal open={teacherModal} onClose={() => setTeacherModal(false)} title="Add New Teacher">
        <div className={styles.modalForm}>
          <Input label="Teacher Name" value={newTeacher.name} onChange={(e) => setNewTeacher((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Mr. Emeka Obi" />
          <SelectField label="Assigned Subject" value={newTeacher.subject} onChange={(e) => setNewTeacher((p) => ({ ...p, subject: e.target.value }))}>
            <option value="">— Select Subject —</option>
            {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </SelectField>
          <p className={styles.pinHint}>
            🔐 A unique 6-digit login PIN will be <strong>automatically generated</strong> for this teacher. Share it with them — they can use it to log in from any device.
          </p>
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setTeacherModal(false)}>Cancel</Button>
            <Button onClick={addTeacher}>Add Teacher</Button>
          </div>
        </div>
      </Modal>

      {/* Add Subject */}
      <Modal open={subjectModal} onClose={() => setSubjectModal(false)} title="Add New Subject">
        <div className={styles.modalForm}>
          <Input label="Subject Name" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="e.g. Mathematics" />
          <div className={styles.modalActions}>
            <Button variant="outline" onClick={() => setSubjectModal(false)}>Cancel</Button>
            <Button onClick={addSubject}>Add Subject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── SchoolProfileTab ─────────────────────────────────────────────────────────
// Inline sub-component — lets the admin edit school name, principal, address, logo.
// Changes are saved to Firestore via SchoolContext.updateProfile.

function SchoolProfileTab({ school, toast }) {
  const { updateProfile } = useSchool();
  const [name,      setName]      = React.useState(school.schoolName    || "");
  const [principal, setPrincipal] = React.useState(school.principalName || "");
  const [address,   setAddress]   = React.useState(school.address       || "");
  const [logo,      setLogo]      = React.useState(school.logo          || "");
  const [saving,    setSaving]    = React.useState(false);
  const fileRef = useRef(null);

  // Keep form in sync if school prop updates (e.g. first load from Firestore)
  React.useEffect(() => {
    setName(school.schoolName    || "");
    setPrincipal(school.principalName || "");
    setAddress(school.address       || "");
    setLogo(school.logo            || "");
  }, [school]);

  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Please upload an image file.", "error");
    if (file.size > 5 * 1024 * 1024) return toast("Logo must be smaller than 5 MB.", "error");
    try {
      const compressed = await compressImage(file, 400, 0.75);
      setLogo(compressed);
    } catch {
      toast("Could not process the image. Try a different file.", "error");
    }
  }

  async function handleSave() {
    if (!name.trim()) return toast("School name is required.", "error");
    setSaving(true);
    const result = await updateProfile({
      schoolName:    name.trim(),
      principalName: principal.trim(),
      address:       address.trim(),
      logo,
    });
    setSaving(false);
    if (result.ok) toast("✅ School profile saved. Report cards will reflect these changes.");
    else toast("❌ Save failed: " + result.message, "error");
  }

  return (
    <div className="anim-fade-up" style={{ maxWidth: 680 }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"32px 36px", boxShadow:"0 4px 24px rgba(15,31,53,0.08)", border:"1px solid var(--border)" }}>
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontFamily:'"Playfair Display",serif', fontSize:22, color:"var(--navy)", marginBottom:4 }}>🏫 School Profile</h2>
          <p style={{ fontSize:13, color:"var(--muted)" }}>This information appears on every printed report card.</p>
        </div>

        {/* Logo section */}
        <div style={{ display:"flex", gap:24, alignItems:"flex-start", marginBottom:24, flexWrap:"wrap" }}>
          <div
            style={{ width:120, height:120, border:"2px dashed var(--border)", borderRadius:16, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden", flexShrink:0 }}
            onClick={() => fileRef.current.click()}
          >
            {logo
              ? <img src={logo} alt="School logo" style={{ width:"100%", height:"100%", objectFit:"contain", padding:8 }} />
              : <div style={{ textAlign:"center", color:"var(--muted)", padding:12 }}>
                  <div style={{ fontSize:28 }}>🏫</div>
                  <div style={{ fontSize:11, marginTop:6, fontWeight:600 }}>Click to upload logo</div>
                  <div style={{ fontSize:10, marginTop:2 }}>PNG · JPG · SVG</div>
                </div>
            }
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>School Logo</p>
            <p style={{ fontSize:13, color:"var(--muted)", marginBottom:10, lineHeight:1.5 }}>
              This logo will appear in the top-left of every report card. Recommended: square PNG, at least 200×200px, max 2 MB.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => fileRef.current.click()}
                style={{ padding:"8px 16px", background:"var(--navy)", color:"#fff", border:"none", borderRadius:8, fontFamily:'"Outfit",sans-serif', fontSize:13, fontWeight:700, cursor:"pointer" }}
              >
                {logo ? "Change Logo" : "Upload Logo"}
              </button>
              {logo && (
                <button
                  onClick={() => setLogo("")}
                  style={{ padding:"8px 16px", background:"#fee2e2", color:"var(--red)", border:"none", borderRadius:8, fontFamily:'"Outfit",sans-serif', fontSize:13, fontWeight:700, cursor:"pointer" }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} style={{ display:"none" }} />
        </div>

        {/* Text fields */}
        <div style={{ display:"grid", gap:16 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:7 }}>
              Name of School <span style={{ color:"var(--red)" }}>*</span>
            </label>
            <input
              type="text" value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Future Pride Model Secondary School"
              style={{ width:"100%", padding:"12px 16px", border:"2px solid var(--border)", borderRadius:10, fontFamily:'"Outfit",sans-serif', fontSize:15, color:"var(--navy)", background:"#f8fafc", outline:"none" }}
              onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
          </div>

          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:7 }}>
              Principal / Head Teacher Name
            </label>
            <input
              type="text" value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="e.g. Mr. James Okafor"
              style={{ width:"100%", padding:"12px 16px", border:"2px solid var(--border)", borderRadius:10, fontFamily:'"Outfit",sans-serif', fontSize:15, color:"var(--navy)", background:"#f8fafc", outline:"none" }}
              onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
          </div>

          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:7 }}>
              School Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="e.g. B 21, Zaria Road, By Benin Street, Kaduna"
              style={{ width:"100%", padding:"12px 16px", border:"2px solid var(--border)", borderRadius:10, fontFamily:'"Outfit",sans-serif', fontSize:15, color:"var(--navy)", background:"#f8fafc", outline:"none", resize:"vertical" }}
              onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
              onBlur={(e) => e.target.style.borderColor = "var(--border)"}
            />
          </div>
        </div>

        {/* Preview strip */}
        {(name || address) && (
          <div style={{ marginTop:20, padding:"14px 18px", background:"#f8fafc", border:"1.5px solid var(--border)", borderRadius:12 }}>
            <p style={{ fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Report Card Preview</p>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {logo && <img src={logo} alt="logo" style={{ width:44, height:44, objectFit:"contain", borderRadius:6 }} />}
              <div>
                <div style={{ fontSize:13, fontWeight:900, textTransform:"uppercase", letterSpacing:"0.5px" }}>{name || "School Name"}</div>
                <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{address || "School Address"}</div>
                {principal && <div style={{ fontSize:11, color:"var(--muted)", fontWeight:600 }}>Principal: {principal}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ marginTop:24, padding:"13px 32px", background:"var(--navy)", color:"#fff", border:"none", borderRadius:11, fontFamily:'"Outfit",sans-serif', fontSize:15, fontWeight:700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display:"flex", alignItems:"center", gap:8 }}
        >
          {saving ? "Saving…" : "💾 Save Profile"}
        </button>
      </div>
    </div>
  );
}
