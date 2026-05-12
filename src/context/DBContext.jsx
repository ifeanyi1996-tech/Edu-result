import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { loadDB, saveDB, syncFromFirestore, defaultDB } from "../utils/db";
import { isTeacherEmail } from "../utils/firebaseAuth";

// ─── DB Context ──────────────────────────────────────────────────────────────
// On every login (admin or teacher), pulls the latest data from Firestore.
// Writes go to both localStorage (instant) and Firestore (async).

const DBContext = createContext(null);

export function DBProvider({ children }) {
  const [db,      setDb]      = useState(() => loadDB());
  const [dbReady, setDbReady] = useState(false);

  // When Firebase reports a signed-in user, pull fresh data from Firestore
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setDbReady(true); return; }

      const uid = isTeacherEmail(user.email)
        ? localStorage.getItem("schoolUid")   // teachers use admin's UID
        : user.uid;

      if (uid) {
        localStorage.setItem("schoolUid", uid);
        const fresh = await syncFromFirestore(uid);
        if (fresh) setDb(fresh);
      }
      setDbReady(true);
    });
    return () => unsub();
  }, []);

  // Re-sync when the tab regains focus
  useEffect(() => {
    const handleFocus = () => {
      const uid = localStorage.getItem("schoolUid");
      if (uid) {
        syncFromFirestore(uid).then((fresh) => { if (fresh) setDb(fresh); });
      } else {
        setDb(loadDB());
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const updateDB = useCallback((fn) => {
    setDb((current) => {
      const next = fn({ ...current });
      saveDB(next);
      return next;
    });
  }, []);

  return (
    <DBContext.Provider value={{ db, setDb, updateDB, dbReady }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const ctx = useContext(DBContext);
  if (!ctx) throw new Error("useDB must be used inside DBProvider");
  return ctx;
}
