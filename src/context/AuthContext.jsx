// ─── AuthContext ──────────────────────────────────────────────────────────────
// session shape:
//   null                                → not logged in
//   { role: "admin",   email, uid }     → admin logged in
//   { role: "teacher", teacher: {...} } → teacher logged in

import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import {
  firebaseRegisterSchool,
  firebaseAdminLogin,
  firebaseTeacherLogin,
  firebaseLogout,
  isTeacherEmail,
  teacherIdFromEmail,
} from "../utils/firebaseAuth";
import { loadDB, syncFromFirestore } from "../utils/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session,     setSession]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen,      setScreen]      = useState("login");
  const [portal,      setPortal]      = useState("admin");

  // ── Restore session from Firebase on page load ────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setSession(null);
        setAuthLoading(false);
        return;
      }
      if (isTeacherEmail(firebaseUser.email)) {
        const teacherId = teacherIdFromEmail(firebaseUser.email);
        const cachedUid = localStorage.getItem("schoolUid");

        // Try local DB first, fall back to Firestore
        let db = loadDB();
        if (db.teachers.length === 0 && cachedUid) {
          const remote = await syncFromFirestore(cachedUid);
          if (remote) db = remote;
        }

        const teacher = db.teachers.find((t) => t.id === teacherId);
        if (teacher) {
          setSession({ role: "teacher", teacher });
        } else {
          firebaseLogout();
          setSession(null);
        }
      } else {
        setSession({ role: "admin", email: firebaseUser.email, uid: firebaseUser.uid });
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Register a new school account ─────────────────────────────────────
  async function register({ email, password, schoolName, principalName, address, logoDataURL }) {
    const result = await firebaseRegisterSchool({ email, password, schoolName, principalName, address, logoDataURL });
    return result;
  }

  // ── Admin login ───────────────────────────────────────────────────────
  async function adminLogin(email, password) {
    if (!email?.includes("@")) return { ok: false, message: "Please enter a valid email address." };
    if (!password)             return { ok: false, message: "Please enter your password." };
    const result = await firebaseAdminLogin(email.trim(), password);
    if (result.ok) setSession({ role: "admin", email: email.trim() });
    return result;
  }

  // ── Teacher login ─────────────────────────────────────────────────────
  // schoolId: the admin's Firebase UID (shown in Admin dashboard).
  // On first login from a new device the teacher must supply it.
  // After that it's cached in localStorage so they don't need to re-enter.
  async function teacherLogin(pin, schoolId) {
    // 1. Persist the school UID so loadDB() uses the right key
    if (schoolId) {
      localStorage.setItem("schoolUid", schoolId.trim());
    }

    const uid = localStorage.getItem("schoolUid");
    if (!uid) {
      return {
        ok: false,
        message: "Please enter your School ID. Ask your admin — it's shown on their dashboard.",
      };
    }

    // 2. Load local DB; if empty, fetch from Firestore (new device)
    let db = loadDB();
    if (db.teachers.length === 0) {
      const remote = await syncFromFirestore(uid);
      if (remote) {
        db = remote;
      } else {
        return {
          ok: false,
          message: "Could not load school data. Check your School ID or internet connection.",
        };
      }
    }

    // 3. Match PIN
    const teacher = db.teachers.find((t) => t.pin === pin);
    if (!teacher) return { ok: false, message: "Invalid PIN. Contact your admin." };

    // Support both old single-subject (teacher.subject) and new multi-subject (teacher.subjects) shape
    const subjectIds = Array.isArray(teacher.subjects) ? teacher.subjects : (teacher.subject ? [teacher.subject] : []);
    if (subjectIds.length === 0) return { ok: false, message: "No subject assigned. Contact admin." };

    // 4. Firebase auth
    const result = await firebaseTeacherLogin(teacher);
    if (result.ok) setSession({ role: "teacher", teacher });
    return result;
  }

  // ── Logout ────────────────────────────────────────────────────────────
  async function logout() {
    await firebaseLogout();
    setSession(null);
  }

  function switchPortal() {
    setPortal((p) => (p === "admin" ? "teacher" : "admin"));
  }

  return (
    <AuthContext.Provider value={{
      session, authLoading,
      screen, setScreen,
      portal, switchPortal,
      register, adminLogin, teacherLogin, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
