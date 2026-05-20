// ─── Database Utility ─────────────────────────────────────────────────────────
// Primary storage: Firestore (keyed by school UID from localStorage).
// Fallback/cache:  localStorage for offline resilience.
//
// STORAGE KEY uses the school UID so multiple schools on the same browser
// don't interfere with each other.

import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { firestore } from "../firebase";

const MASTER_PASS  = "admin123";
const LS_PREFIX    = "eduResultDB_v3_";

function storageKey() {
  return LS_PREFIX + (localStorage.getItem("schoolUid") || "local");
}

export function defaultDB() {
  return {
    students: [],
    teachers: [],
    subjects: [],
    scores: {},
    locked: false,
    adminPass: MASTER_PASS,
    studentInfo:      {},
    affective:        {},
    teacherComments:  {},
    staffComments:    {},
    roles: { formMaster: "", houseMistress: "", principal: "", formMasters: {} },
    enrollment: {},   // enrollment[subjectId] = [studentId, ...] — optional; empty = all eligible students
    currentTerm: { term: 1, year: "2025/2026" }, // term: 1|2|3
    promotion:   {},  // promotion[studentId] = true|false  (filled at end of Term 3)
  };
}

// ── Merge any missing fields into a parsed DB ─────────────────────────────────
function normalise(parsed) {
  if (!parsed.adminPass)      parsed.adminPass      = MASTER_PASS;
  if (!parsed.studentInfo)    parsed.studentInfo    = {};
  if (!parsed.affective)      parsed.affective      = {};
  if (!parsed.teacherComments)parsed.teacherComments= {};
  if (!parsed.staffComments)  parsed.staffComments  = {};
  if (!parsed.roles)          parsed.roles          = { formMaster:"", houseMistress:"", principal:"", formMasters:{} };
  if (!parsed.roles.formMasters) parsed.roles.formMasters = {};
  if (!parsed.enrollment)      parsed.enrollment      = {};
  if (!parsed.currentTerm)     parsed.currentTerm     = { term: 1, year: "2025/2026" };
  if (!parsed.promotion)       parsed.promotion       = {};
  if (!parsed.scores)         parsed.scores         = {};
  if (!parsed.students)       parsed.students       = [];
  if (!parsed.teachers)       parsed.teachers       = [];
  if (!parsed.subjects)       parsed.subjects       = [];
  return parsed;
}

// ── Sync FROM Firestore (called on login / tab-focus) ────────────────────────
export async function syncFromFirestore(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(firestore, "schoolData", uid));
    if (snap.exists()) {
      const data = normalise(snap.data());
      // Cache locally
      localStorage.setItem(LS_PREFIX + uid, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn("Firestore sync failed, using local cache:", e.message);
  }
  return null;
}

// ── Save TO both localStorage and Firestore ───────────────────────────────────
export function saveDB(db) {
  const key = storageKey();
  localStorage.setItem(key, JSON.stringify(db));
  // Fire-and-forget Firestore write (best effort)
  const uid = localStorage.getItem("schoolUid");
  if (uid) {
    setDoc(doc(firestore, "schoolData", uid), db).catch((e) =>
      console.warn("Firestore write failed:", e.message)
    );
  }
}

// ── Load FROM localStorage (synchronous, used on mount) ──────────────────────
export function loadDB() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return defaultDB();
    return normalise(JSON.parse(raw));
  } catch {
    return defaultDB();
  }
}

export { MASTER_PASS };

// ── Archive current term to Firestore ─────────────────────────────────────────
// Saves a full snapshot under schoolTerms/{uid}_{timestamp}
// Then resets scores/comments/affective for the new term.

export async function archiveCurrentTerm(db, termLabel) {
  const uid = localStorage.getItem("schoolUid");
  if (!uid) return { ok: false, message: "No school ID found." };

  const snapshot = {
    schoolUid:       uid,
    termLabel:       termLabel.trim(),
    archivedAt:      new Date().toISOString(),
    // What we save — full result data
    students:        db.students        || [],
    subjects:        db.subjects        || [],
    scores:          db.scores          || {},
    studentInfo:     db.studentInfo     || {},
    teacherComments: db.teacherComments || {},
    affective:       db.affective       || {},
    staffComments:   db.staffComments   || {},
    roles:           db.roles           || {},
  };

  try {
    await addDoc(collection(firestore, "schoolTerms"), snapshot);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// ── Fetch all archived terms for this school ───────────────────────────────────
export async function fetchArchivedTerms() {
  const uid = localStorage.getItem("schoolUid");
  if (!uid) return [];
  try {
    const q    = query(
      collection(firestore, "schoolTerms"),
      where("schoolUid", "==", uid),
      orderBy("archivedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("fetchArchivedTerms error:", e.message);
    return [];
  }
}

// ── Get the next class for a promoted student ─────────────────────────────────
// Handles patterns like "JSS 1", "SSS 2A", "JSS 3B"
// Returns null for SSS 3 graduates.
export function getNextClass(cls) {
  if (!cls) return cls;
  const m = cls.trim().match(/^(JSS|SSS)\s+(\d+)([A-Za-z]?)$/i);
  if (!m) return cls; // unrecognised format — leave as-is
  const section = m[1].toUpperCase();
  const num     = parseInt(m[2], 10);
  const suffix  = m[3] || "";
  if (section === "JSS") {
    return num < 3 ? `JSS ${num + 1}${suffix}` : `SSS 1${suffix}`;
  } else {
    return num < 3 ? `SSS ${num + 1}${suffix}` : null; // null = graduated
  }
}

// ── Reset DB for a new term ────────────────────────────────────────────────────
// Keeps: students, teachers, subjects, studentInfo (admNo, sex, passport)
// Clears: scores, teacherComments, affective, staffComments, locked
export function buildResetDB(db) {
  const cleanedInfo = {};
  Object.entries(db.studentInfo || {}).forEach(([id, info]) => {
    cleanedInfo[id] = { admNo: info.admNo || "", sex: info.sex || "", passport: info.passport || "", term: "" };
  });

  const currentTerm = db.currentTerm || { term: 1, year: "2025/2026" };
  const isEndOfYear = currentTerm.term === 3;

  // Advance term counter
  let nextTerm;
  if (isEndOfYear) {
    // Roll to Term 1 of the next academic year
    const parts = currentTerm.year.match(/(\d{4})\/(\d{4})/);
    const nextYear = parts
      ? `${parseInt(parts[2])}/${parseInt(parts[2]) + 1}`
      : currentTerm.year;
    nextTerm = { term: 1, year: nextYear };
  } else {
    nextTerm = { ...currentTerm, term: currentTerm.term + 1 };
  }

  // Apply promotions when rolling over from Term 3
  let students = db.students || [];
  if (isEndOfYear && db.promotion && Object.keys(db.promotion).length > 0) {
    students = students.map((s) => {
      const decision = db.promotion[s.id];
      if (decision === true) {
        const next = getNextClass(s.class);
        return next ? { ...s, class: next } : { ...s, class: s.class, graduated: true };
      }
      return s; // not promoted — stays in same class
    }).filter((s) => !s.graduated); // remove graduates
  }

  return {
    ...db,
    students,
    scores:          {},
    teacherComments: {},
    affective:       {},
    staffComments:   {},
    locked:          false,
    studentInfo:     cleanedInfo,
    currentTerm:     nextTerm,
    promotion:       {},  // clear promotions for next cycle
  };
}
