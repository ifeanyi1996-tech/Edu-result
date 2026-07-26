// ─── Super Admin Utilities ────────────────────────────────────────────────────
// The super admin is identified by a hardcoded email.
// Change SUPER_ADMIN_EMAIL to your own email address before deploying.
//
// Schools are created via the Firebase REST Identity Toolkit API so the
// super admin stays signed in — the Firebase JS SDK would sign them out.

import { doc, setDoc, getDoc, getDocs, collection, updateDoc, Timestamp } from "firebase/firestore";
import { firestore } from "../firebase";

// ── CHANGE THIS to your own email ────────────────────────────────────────────
export const SUPER_ADMIN_EMAIL = "ifeanyiodoemenam418@gmail.com";
// ─────────────────────────────────────────────────────────────────────────────

const FIREBASE_API_KEY = "AIzaSyC4AVhWS7OgvHfoAnaXPbxzQO8AZ91rQLU";
const REST_SIGNUP_URL  = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

/** Generate a random secure password */
function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Create a new school account.
 * Uses REST API so super admin stays signed in.
 * @returns {{ ok, uid, password, message }}
 */
export async function createSchool({ schoolName, principalName, address, email, logoDataURL }) {
  const password = generatePassword(10);

  // 1. Create Firebase Auth account via REST (doesn't affect current session)
  let uid;
  try {
    const res  = await fetch(REST_SIGNUP_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: email.trim(), password, returnSecureToken: false }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || "Unknown error";
      if (msg === "EMAIL_EXISTS")
        return { ok: false, message: "A school with this email already exists." };
      return { ok: false, message: "Could not create account: " + msg };
    }
    uid = data.localId;
  } catch (e) {
    return { ok: false, message: "Network error: " + e.message };
  }

  // 2. Save school profile to Firestore
  try {
    await setDoc(doc(firestore, "schools", uid), {
      schoolName:    schoolName.trim(),
      principalName: principalName.trim(),
      address:       address.trim(),
      logo:          logoDataURL || "",
      email:         email.trim(),
      createdAt:     new Date().toISOString(),
      active:        true,
      addedBy:       "superadmin",
      plan: {
        primary:     false,
        secondary:   false,
        paid:        false,
        pendingPayment: false,
        activatedAt: null,
        expiresAt:   null,
        quote:       { secondary: "", primary: "", both: "" },
      },
    });

    // Empty schoolData so the school can start using it
    await setDoc(doc(firestore, "schoolData", uid), {
      students: [], teachers: [], subjects: [], scores: {},
      studentInfo: {}, teacherComments: {}, affective: {}, staffComments: {},
      locked: false,
    });
  } catch (e) {
    return { ok: false, message: "Account created but profile save failed: " + e.message };
  }

  return { ok: true, uid, password, email: email.trim() };
}

/**
 * Fetch all schools from Firestore.
 * @returns {Array} list of { id, ...schoolData }
 */
export async function fetchAllSchools() {
  try {
    const snap = await getDocs(collection(firestore, "schools"));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.addedBy === "superadmin") // only schools you added
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  } catch (e) {
    console.error("fetchAllSchools error:", e);
    return [];
  }
}

/**
 * Update a school's plan (called from Super Admin when confirming payment).
 * @param {string} uid
 * @param {{ primary, secondary }} planUpdates
 */
export async function setSchoolPlan(uid, { primary, secondary }, quote = {}) {
  try {
    const now     = new Date();
    const expires = new Date(now);
    expires.setFullYear(expires.getFullYear() + 1);
    expires.setDate(expires.getDate() + 30); // +30-day grace built in at activation

    await updateDoc(doc(firestore, "schools", uid), {
      "plan.primary":        !!primary,
      "plan.secondary":      !!secondary,
      "plan.paid":           true,
      "plan.pendingPayment": false,
      "plan.activatedAt":    now.toISOString(),
      "plan.expiresAt":      expires.toISOString(),
      "plan.quote":          {
        secondary: quote.secondary || "",
        primary:   quote.primary   || "",
        both:      quote.both      || "",
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

/**
 * Mark a school as having a pending payment (submitted the form but not yet verified).
 */
export async function setPendingPayment(uid, pending) {
  try {
    await updateDoc(doc(firestore, "schools", uid), { "plan.pendingPayment": pending });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

/**
 * Toggle a school's active status.
 */
export async function setSchoolActive(uid, active) {
  try {
    await updateDoc(doc(firestore, "schools", uid), { active });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}
