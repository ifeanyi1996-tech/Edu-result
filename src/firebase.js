// ─── Firebase Initialization ──────────────────────────────────────────────────
import { initializeApp }  from "firebase/app";
import { getAuth }        from "firebase/auth";
import { getFirestore }   from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyC4AVhWS7OgvHfoAnaXPbxzQO8AZ91rQLU",
  authDomain:        "education-3ee7d.firebaseapp.com",
  projectId:         "education-3ee7d",
  storageBucket:     "education-3ee7d.firebasestorage.app",
  messagingSenderId: "816236569343",
  appId:             "1:816236569343:web:851ec55ba001766ddbe2ca",
};

const app = initializeApp(firebaseConfig);

export const auth      = getAuth(app);
export const firestore = getFirestore(app);
