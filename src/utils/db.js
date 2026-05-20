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

// ── Reset DB for a new term ────────────────────────────────────────────────────
// Keeps: students, teachers, subjects, studentInfo (admNo, sex, passport)
// Clears: scores, teacherComments, affective, staffComments, locked
export function buildResetDB(db) {
  // Strip 'term' text from studentInfo so admin fills in new term per student
  const cleanedInfo = {};
  Object.entries(db.studentInfo || {}).forEach(([id, info]) => {
    cleanedInfo[id] = { admNo: info.admNo || "", sex: info.sex || "", passport: info.passport || "", term: "" };
  });

  return {
    ...db,
    scores:          {},
    teacherComments: {},
    affective:       {},
    staffComments:   {},
    locked:          false,
    studentInfo:     cleanedInfo,
  };
}
