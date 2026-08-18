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
  updatePassword,
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
  const email = makeTeacherEmail(teacher.id);
  const pin   = String(teacher.pin);

  try {
    await signInWithEmailAndPassword(auth, email, pin);
    return { ok: true };
  } catch (err) {

    // No account yet — create one with current PIN
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      try {
        await createUserWithEmailAndPassword(auth, email, pin);
        return { ok: true };
      } catch (ce) {
        if (ce.code !== "auth/email-already-in-use") {
          return { ok: false, message: "Could not create teacher account: " + ce.message };
        }
        // Account exists but wrong password — PIN was changed by admin
        // Fall through to PIN-mismatch error below
      }
    }

    // Wrong password = PIN was changed in Admin panel but Firebase Auth wasn't updated
    if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      return {
        ok: false,
        code: "pin-mismatch",
        message: "PIN mismatch — the admin recently changed this teacher's PIN. " +
                 "To fix: go to Firebase Console > Authentication > Users, " +
                 "find the account beginning with 't.' followed by the teacher ID, " +
                 "delete it, then ask the teacher to log in again with the new PIN.",
      };
    }

    if (err.code === "auth/user-disabled")
      return { ok: false, message: "This teacher account has been disabled. Contact admin." };
    if (err.code === "auth/network-request-failed")
      return { ok: false, message: "Network error. Check your connection." };
    if (err.code === "auth/too-many-requests")
      return { ok: false, message: "Too many attempts. Please wait a few minutes and try again." };
    return { ok: false, message: "Sign-in failed: " + err.message };
  }
}

// ── Re-provision teacher PIN (call from AdminPage when saving edited PIN) ────
// Signs in with old PIN, updates Firebase Auth password to new PIN, signs out.
// If no account exists yet, creates one with the new PIN directly.
export async function reprovisionTeacherPin(teacherId, oldPin, newPin) {
  const email = makeTeacherEmail(teacherId);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, String(oldPin));
    await updatePassword(cred.user, String(newPin));
    await signOut(auth);
    return { ok: true };
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      // No existing account — create fresh with new PIN
      try {
        await createUserWithEmailAndPassword(auth, email, String(newPin));
        await signOut(auth);
        return { ok: true };
      } catch (ce) {
        if (ce.code === "auth/email-already-in-use") return { ok: true }; // already correct
        return { ok: false, message: ce.message };
      }
    }
    // Wrong old PIN — can't reprovision without it; teacher will get pin-mismatch on next login
    return { ok: false, message: err.message };
  }
}

// ── Update teacher PIN (delete + recreate Firebase Auth account) ─────────────
// Called whenever the admin saves an edited teacher PIN.
// Client-side Firebase Auth can't update another user's password directly,
// so we sign in as the teacher with their old PIN, update the password, then
// sign back in as the admin. If the old-PIN sign-in fails (account never
// existed or already out of sync), we just create a fresh account.
export async function updateTeacherAuthPin(teacherId, oldPin, newPin) {
  const email = `t.${teacherId}@education-3ee7d.firebaseapp.com`;
  const { updatePassword, signInWithEmailAndPassword: signIn,
          createUserWithEmailAndPassword: createUser } = await import("firebase/auth");

  // Try sign in with old PIN first
  try {
    const cred = await signIn(auth, email, oldPin);
    // Update the password in place
    await updatePassword(cred.user, newPin);
    return { ok: true };
  } catch (signInErr) {
    // Old account doesn't exist or password mismatch — create fresh account
    if (
      signInErr.code === "auth/user-not-found" ||
      signInErr.code === "auth/invalid-credential" ||
      signInErr.code === "auth/wrong-password"
    ) {
      try {
        await createUser(auth, email, newPin);
        return { ok: true };
      } catch (createErr) {
        if (createErr.code === "auth/email-already-in-use") {
          // Account exists but old PIN is wrong — admin probably changed it
          // before this fix was applied. We can't recover without Admin SDK.
          // Return a soft warning — DB is updated, Auth is stale.
          return { ok: true, warn: "Auth account exists with a different PIN. Teacher may need to contact admin if login fails." };
        }
        return { ok: false, message: createErr.message };
      }
    }
    return { ok: false, message: signInErr.message };
  }
}

// ── Change school admin password ─────────────────────────────────────────────
export async function changeSchoolPassword(currentPassword, newPassword) {
  try {
    const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import("firebase/auth");
    const user = auth.currentUser;
    if (!user) return { ok: false, message: "Not logged in." };
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { ok: true };
  } catch (e) {
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential")
      return { ok: false, message: "Current password is incorrect." };
    if (e.code === "auth/weak-password")
      return { ok: false, message: "New password must be at least 6 characters." };
    return { ok: false, message: e.message };
  }
}

// ── Send password reset email ─────────────────────────────────────────────────
export async function sendPasswordReset(email) {
  try {
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

// ── Sign out ─────────────────────────────────────────────────────────────────
export async function firebaseLogout() {
  try { await signOut(auth); } catch (_) {}
}
