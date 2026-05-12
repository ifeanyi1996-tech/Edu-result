# EduResult — Firebase Setup Guide

## Step 1 — Enable Authentication

1. Open https://console.firebase.google.com → project **education-3ee7d**
2. Left sidebar → **Authentication** → **Get started**
3. **Sign-in method** tab → Enable **Email/Password** → Save

---

## Step 2 — Enable Firestore Database

All school data (students, teachers, scores, school profile) is stored in Firestore
so teachers can log in from **any device** using their PIN.

1. Left sidebar → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → select your region → **Enable**
3. Go to the **Rules** tab and paste the following, then click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // School profile (name, address, logo, principal)
    match /schools/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    // School data (students, teachers, scores)
    // Teachers can read (to log in from any device); only admin can write
    match /schoolData/{uid} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## Step 3 — Run the app

```bash
cd eduresult
npm install        # installs React + Firebase SDK
npm start          # opens http://localhost:3000
```

---

## How School Registration Works

1. Click **"Create a free account →"** on the login page
2. Fill in:
   - **Name of School** → appears on every report card header
   - **Name of Principal / Head Teacher** → appears on every report card
   - **School Address** → appears on every report card
   - **School Logo** (PNG/JPG, max 2 MB) → appears on every report card
   - **Email + Password** → your admin login credentials
3. Profile saved to Firestore → loads automatically on every login

---

## Teacher Login PINs — Automatic Generation

- When you add a teacher, a **unique 6-digit PIN is auto-generated** — no duplicates possible
- The PIN appears in the Teachers table — click 📋 to copy it
- Share the PIN and the app URL with each teacher
- Teachers log in from **any device** (phone, tablet, laptop) — data syncs from Firestore

---

## Logo on Report Cards

The school logo is stored as a base64 image in Firestore and embedded directly
in each report card. It appears in the top-left circle of the school header.

---

## Session Persistence

Firebase keeps users signed in across page refreshes automatically.
A loading splash is shown while Firebase restores the session.
