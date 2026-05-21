// ─── Firebase Auth + School Registration Service ─────────────────────────────
//
// SCHOOL REGISTRATION (new)
//   Creates a Firebase account with email + password.
//   Saves school profile (name, principal, address, logo) to Firestore
//   under /schools/<uid>.
//
// ADMIN LOGIN
//   Signs in with registered email + password.
//
// TEACHER LOGIN
//   PIN-based. Auto-provisions a derived Firebase account on first login.
//   email pattern: t.<teacherId>@education-3ee7d.firebaseapp.com

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase";

const TEACHER_PREFIX = "t.";
const TEACHER_SUFFIX = "@education-3ee7d.firebaseapp.com";

function makeTeacherEmail(id) {
  return `${TEACHER_PREFIX}${id}${TEACHER_SUFFIX}`;
}

export function isTeacherEmail(email) {
  return (
    typeof email === "string" &&
    email.startsWith(TEACHER_PREFIX) &&
    email.endsWith(TEACHER_SUFFIX)
  );
}

export function teacherIdFromEmail(email) {
  return email.replace(TEACHER_PREFIX, "").replace(TEACHER_SUFFIX, "");
}

// ── Register a new school ────────────────────────────────────────────────────
export async function firebaseRegisterSchool({ email, password, schoolName, principalName, address, logoDataURL }) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const uid  = cred.user.uid;

    // Save school profile to Firestore
    await setDoc(doc(firestore, "schools", uid), {
      schoolName:    schoolName.trim(),
      principalName: principalName.trim(),
      address:       address.trim(),
      logo:          logoDataURL || "",
      email:         email.trim(),
      createdAt:     new Date().toISOString(),
    });

    return { ok: true, uid };
  } catch (err) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return { ok: false, message: "This email is already registered. Please sign in." };
      case "auth/invalid-email":
        return { ok: false, message: "Please enter a valid email address." };
      case "auth/weak-password":
        return { ok: false, message: "Password must be at least 6 characters." };
      case "auth/network-request-failed":
        return { ok: false, message: "Network error. Please check your connection." };
      default:
        return { ok: false, message: "Registration failed: " + err.message };
    }
  }
}

// ── Load school profile from Firestore ──────────────────────────────────────
export async function loadSchoolProfile(uid) {
  try {
    const snap = await getDoc(doc(firestore, "schools", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

// ── Save / update school profile ─────────────────────────────────────────────
export async function saveSchoolProfile(uid, profile) {
  try {
    await setDoc(doc(firestore, "schools", uid), profile, { merge: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// ── Admin login ──────────────────────────────────────────────────────────────
export async function firebaseAdminLogin(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    return { ok: true };
  } catch (err) {
    switch (err.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
      case "auth/invalid-email":
        return { ok: false, message: "Invalid email or password." };
      case "auth/too-many-requests":
        return { ok: false, message: "Too many attempts. Please wait and try again." };
      case "auth/network-request-failed":
        return { ok: false, message: "Network error. Please check your connection." };
      default:
        return { ok: false, message: "Sign-in failed: " + err.message };
    }
  }
}

// ── Teacher login (PIN → auto-provisioned Firebase account) ─────────────────
export async function firebaseTeacherLogin(teacher) {
  const email    = makeTeacherEmail(teacher.id);
  const password = teacher.pin;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { ok: true };
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        return { ok: true };
      } catch (ce) {
        return { ok: false, message: "Could not create teacher account: " + ce.message };
      }
    }
    if (err.code === "auth/user-disabled")
      return { ok: false, message: "This teacher account has been disabled. Ask your admin to re-enable it in the Firebase console." };
    if (err.code === "auth/network-request-failed")
      return { ok: false, message: "Network error. Check your connection." };
    return { ok: false, message: "Sign-in failed: " + err.message };
  }
}

// ── Sign out ─────────────────────────────────────────────────────────────────
export async function firebaseLogout() {
  try { await signOut(auth); } catch (_) {}
}
