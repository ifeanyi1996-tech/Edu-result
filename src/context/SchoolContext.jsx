// ─── SchoolContext ────────────────────────────────────────────────────────────
// Loads the school profile from Firestore after the admin logs in.
// Makes profile available app-wide via useSchool().
// Teachers share the same profile (loaded by UID stored in their session).

import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged }   from "firebase/auth";
import { auth }                 from "../firebase";
import { loadSchoolProfile, saveSchoolProfile, isTeacherEmail } from "../utils/firebaseAuth";

const SchoolContext = createContext(null);

// Default empty profile — used before Firestore loads or for new accounts
const EMPTY_PROFILE = {
  schoolName:    "",
  principalName: "",
  address:       "",
  logo:          "",
  email:         "",
};

export function SchoolProvider({ children }) {
  const [profile,        setProfile]        = useState(EMPTY_PROFILE);
  const [profileLoading, setProfileLoading] = useState(true);
  const [adminUid,       setAdminUid]       = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(EMPTY_PROFILE);
        setAdminUid(null);
        setProfileLoading(false);
        return;
      }

      // For teacher accounts, UID belongs to that teacher's Firebase account,
      // not the school. We need to load the school's profile differently.
      // Since teachers log in with t.<id>@... emails, we store the school UID
      // in localStorage when admin logs in, and teachers reuse it.
      if (isTeacherEmail(user.email)) {
        // Try to load the cached school UID from localStorage
        const cachedUid = localStorage.getItem("schoolUid");
        if (cachedUid) {
          const p = await loadSchoolProfile(cachedUid);
          setProfile(p || EMPTY_PROFILE);
          setAdminUid(cachedUid);
        } else {
          setProfile(EMPTY_PROFILE);
        }
        setProfileLoading(false);
        return;
      }

      // Admin account — UID is the school UID
      setAdminUid(user.uid);
      localStorage.setItem("schoolUid", user.uid);
      const p = await loadSchoolProfile(user.uid);
      setProfile(p || EMPTY_PROFILE);
      setProfileLoading(false);
    });
    return () => unsub();
  }, []);

  // Update profile in Firestore and local state
  async function updateProfile(fields) {
    const uid = adminUid || localStorage.getItem("schoolUid");
    if (!uid) return { ok: false, message: "Not logged in." };
    const next = { ...profile, ...fields };
    const result = await saveSchoolProfile(uid, next);
    if (result.ok) setProfile(next);
    return result;
  }

  return (
    <SchoolContext.Provider value={{ profile, profileLoading, updateProfile }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error("useSchool must be used inside <SchoolProvider>");
  return ctx;
}
