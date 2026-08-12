import React from "react";
import { useAuth }       from "./context/AuthContext";
import { useDB }         from "./context/DBContext";
import { useSchool }     from "./context/SchoolContext";
import LoginPage         from "./components/common/LoginPage";
import Topbar            from "./components/common/Topbar";
import Toast             from "./components/common/Toast";
import AdminPage         from "./pages/Admin/AdminPage";
import TeacherPage       from "./pages/Teacher/TeacherPage";
import SuperAdminPage    from "./pages/SuperAdmin/SuperAdminPage";
import StudentResultPage  from "./pages/Result/StudentResultPage";
import StudentLookupPage  from "./pages/Result/StudentLookupPage";
import { useToast }      from "./utils/useToast";
import { SUPER_ADMIN_EMAIL } from "./utils/superAdmin";
import styles            from "./App.module.css";

const params          = new URLSearchParams(window.location.search);
const resultStudentId = params.get("result");
const resultSchoolId  = params.get("school");
const isPublicResult  = !!(resultStudentId && resultSchoolId);
const isLookup        = !!(resultSchoolId && params.get("lookup") === "1" && !resultStudentId);

export default function App() {
  if (isLookup) {
    return <StudentLookupPage schoolId={resultSchoolId} />;
  }
  if (isPublicResult) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } body { margin:0; background:#f8fafc; }`}</style>
        <StudentResultPage schoolId={resultSchoolId} studentId={resultStudentId} />
      </>
    );
  }
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { session, authLoading, portal, adminLogin, teacherLogin, logout, switchPortal } = useAuth();
  const { db }            = useDB();
  const { profile }       = useSchool();
  const { toasts, toast } = useToast();

  const isSuperAdmin = session?.role === "admin" && session?.email === SUPER_ADMIN_EMAIL;

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

  if (!session) {
    return (
      <>
        <Toast toasts={toasts} />
        <LoginPage
          portal={portal}
          onLogin={handleLogin}
          onSwitchPortal={switchPortal}
        />
      </>
    );
  }

  if (isSuperAdmin) {
    return (
      <>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <Toast toasts={toasts} />
        <SuperAdminPage onLogout={logout} />
      </>
    );
  }

  return (
    <>
      <Toast toasts={toasts} />
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
  );
}