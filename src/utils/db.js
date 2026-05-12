// ─── Database Utility ─────────────────────────────────────────────────────────
// Primary storage: Firestore (keyed by school UID from localStorage).
// Fallback/cache:  localStorage for offline resilience.
//
// STORAGE KEY uses the school UID so multiple schools on the same browser
// don't interfere with each other.

import { doc, getDoc, setDoc } from "firebase/firestore";
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
    roles: { formMaster: "", houseMistress: "", principal: "" },
  };
}

// ── Merge any missing fields into a parsed DB ─────────────────────────────────
function normalise(parsed) {
  if (!parsed.adminPass)      parsed.adminPass      = MASTER_PASS;
  if (!parsed.studentInfo)    parsed.studentInfo    = {};
  if (!parsed.affective)      parsed.affective      = {};
  if (!parsed.teacherComments)parsed.teacherComments= {};
  if (!parsed.staffComments)  parsed.staffComments  = {};
  if (!parsed.roles)          parsed.roles          = { formMaster:"", houseMistress:"", principal:"" };
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
