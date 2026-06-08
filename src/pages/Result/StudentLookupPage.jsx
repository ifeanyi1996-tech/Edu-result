import React, { useState } from "react";
import { syncFromFirestore } from "../../utils/db";

// ─── StudentLookupPage ────────────────────────────────────────────────────────
// Shown when URL has ?school=UID&lookup=1 but no student ID.
// Student enters their registration number → app finds their record → loads result.

export default function StudentLookupPage({ schoolId }) {
  const [regNo,    setRegNo]    = useState("");
  const [status,   setStatus]   = useState("idle"); // idle | loading | error
  const [errMsg,   setErrMsg]   = useState("");

  async function handleLookup(e) {
    e.preventDefault();
    const trimmed = regNo.trim();
    if (!trimmed) return;

    setStatus("loading");
    setErrMsg("");

    try {
      const db = await syncFromFirestore(schoolId);
      if (!db) { setStatus("error"); setErrMsg("School not found. Check the link."); return; }

      // Results must be locked to be accessible
      if (!db.locked) {
        setStatus("error");
        setErrMsg("Results have not been published yet. Please check back later or contact your school admin.");
        return;
      }

      // Find student by ADM NO. (case-insensitive) OR by passcode
      const student = db.students.find((s) => {
        const info = (db.studentInfo || {})[s.id] || {};
        const admMatch  = info.admNo && (info.admNo || "").toLowerCase() === trimmed.toLowerCase();
        const passMatch = (db.passCodes || {})[s.id] && (db.passCodes[s.id] || "").toUpperCase() === trimmed.toUpperCase();
        return admMatch || passMatch;
      });

      if (!student) {
        setStatus("error");
        setErrMsg("No student found. Check your ADM NO. or passcode and try again.");
        return;
      }

      // Redirect to the direct result URL
      const url = `${window.location.origin}${window.location.pathname}?result=${student.id}&school=${schoolId}`;
      window.location.replace(url);
    } catch {
      setStatus("error");
      setErrMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Outfit',sans-serif;background:linear-gradient(135deg,#0f1f35 0%,#1a3352 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div style={{ width:"100%", maxWidth:420, animation:"fadeUp .35s ease" }}>
        {/* Card */}
        <div style={{ background:"#fff", borderRadius:20, padding:"36px 32px", boxShadow:"0 24px 64px rgba(0,0,0,0.35)" }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
            <div style={{ width:44, height:44, borderRadius:11, background:"#0f1f35", border:"2px solid #f0a500", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, color:"#f0a500" }}>ER</div>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:"#0f1f35", letterSpacing:"-0.3px" }}>Edu<span style={{ color:"#f0a500" }}>Result</span></div>
              <div style={{ fontSize:11, color:"#64748b", fontWeight:500 }}>Student Result Portal</div>
            </div>
          </div>

          <div style={{ fontSize:18, fontWeight:800, color:"#0f1f35", marginBottom:4 }}>Check Your Result</div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>Enter your registration number to view your result sheet.</div>

          <form onSubmit={handleLookup}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:"#0f1f35", marginBottom:6 }}>
              ADM Number or Passcode
            </label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => { setRegNo(e.target.value); setStatus("idle"); setErrMsg(""); }}
              placeholder="ADM NO. or passcode (e.g. A3K9PQ)"
              style={{ width:"100%", padding:"13px 16px", borderRadius:10, border:`1.5px solid ${status==="error"?"#fca5a5":"#e2e8f0"}`, fontSize:14, fontFamily:"inherit", outline:"none", color:"#0f1f35", background: status==="error"?"#fff8f8":"#fff", marginBottom:6 }}
              autoFocus
              disabled={status==="loading"}
            />

            {errMsg && (
              <div style={{ background:"#fef2f2", border:"1.5px solid #fca5a5", borderRadius:8, padding:"9px 14px", color:"#dc2626", fontSize:13, marginBottom:12 }}>
                ⚠️ {errMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status==="loading" || !regNo.trim()}
              style={{ width:"100%", padding:"13px", background: status==="loading"?"#64748b":"#0d9488", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor: status==="loading"?"not-allowed":"pointer", fontFamily:"inherit", marginTop:4, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"background .15s" }}
            >
              {status === "loading"
                ? <><div style={{ width:18, height:18, border:"2px solid rgba(255,255,255,0.3)", borderTop:"2px solid #fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} /> Searching…</>
                : "→ View My Result"
              }
            </button>
          </form>

          <div style={{ textAlign:"center", marginTop:20, fontSize:12, color:"#94a3b8" }}>
            Powered by <strong style={{ color:"#0f1f35" }}>EduResult</strong>
          </div>
        </div>
      </div>
    </>
  );
}
