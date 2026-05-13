import React from "react";
import { useAuth }    from "./context/AuthContext";
import { useDB }      from "./context/DBContext";
import { useSchool }  from "./context/SchoolContext";
import LoginPage      from "./components/common/LoginPage";
import RegisterPage   from "./components/common/RegisterPage";
import Topbar         from "./components/common/Topbar";
import Toast          from "./components/common/Toast";
import AdminPage      from "./pages/Admin/AdminPage";
import TeacherPage    from "./pages/Teacher/TeacherPage";
import StudentResultPage from "./pages/Result/StudentResultPage";
import { useToast }   from "./utils/useToast";
import styles         from "./App.module.css";

// ── Check if this is a public result link ───────────────────────────────────
// URL format: https://yourapp.com?result=STUDENT_ID&school=SCHOOL_ID
const params     = new URLSearchParams(window.location.search);
const resultStudentId = params.get("result");
const resultSchoolId  = params.get("school");
const isPublicResult  = !!(resultStudentId && resultSchoolId);

export default function App() {
  // ── If it's a public result link, skip auth entirely ──────────────────
  if (isPublicResult) {
    return (
      <>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          body { margin: 0; background: #f8fafc; }
        `}</style>
        <StudentResultPage
          schoolId={resultSchoolId}
          studentId={resultStudentId}
        />
      </>
    );
  }

  // ── Normal authenticated app ────────────────────────────────────────────
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { session, authLoading, screen, setScreen, portal, adminLogin, teacherLogin, register, logout, switchPortal } = useAuth();
  const { db }              = useDB();
  const { profile }         = useSchool();
  const { toasts, toast }   = useToast();

  const teacherSubjectName =
    session?.role === "teacher"
      ? db.subjects.find((s) => s.id === session.teacher?.subject)?.name
      : undefined;

  async function handleLogin(...args) {
    return portal === "admin" ? adminLogin(args[0], args[1]) : teacherLogin(args[0], args[1]);
  }

  if (authLoading) {
    return (
      <div className={styles.splash}>
        <div className={styles.splashLogo}>Edu<span className={styles.splashGold}>Result</span></div>
        <div className={styles.splashSpinner} />
        <p className={styles.splashNote}>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} />
      {!session ? (
        screen === "register" ? (
          <RegisterPage
            onRegister={register}
            onBackToLogin={() => setScreen("login")}
          />
        ) : (
          <LoginPage
            portal={portal}
            onLogin={handleLogin}
            onSwitchPortal={switchPortal}
            onGoRegister={() => setScreen("register")}
          />
        )
      ) : (
        <>
          <Topbar
            role={session.role}
            teacherName={session.teacher?.name}
            subjectName={teacherSubjectName}
            schoolName={profile.schoolName}
            locked={db.locked}
            onLogout={logout}
          />
          {session.role === "admin"
            ? <AdminPage toast={toast} school={profile} />
            : <TeacherPage teacher={session.teacher} toast={toast} />
          }
        </>
      )}
    </>
  );
}
