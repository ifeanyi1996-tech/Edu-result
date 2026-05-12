import React, { useState, useEffect } from "react";
import Button from "../common/Button";
import SignaturePad from "../common/SignaturePad";
import { getGrade } from "../../utils/grades";
import styles from "./ScoreEntryForm.module.css";

const FIELDS = [
  { key: "t1",   label: "Test 1",      max: 20 },
  { key: "t2",   label: "Test 2",      max: 20 },
  { key: "exam", label: "Examination", max: 60 },
];

export default function ScoreEntryForm({ student, subject, existingScore, existingComment, locked, onSave, onBack }) {
  const [values, setValues]   = useState({ t1: "", t2: "", exam: "" });
  const [errors, setErrors]   = useState({});
  const [comment, setComment] = useState("");
  const [signature, setSignature] = useState("");

  useEffect(() => {
    setValues({
      t1:   existingScore?.t1   !== undefined ? String(existingScore.t1)   : "",
      t2:   existingScore?.t2   !== undefined ? String(existingScore.t2)   : "",
      exam: existingScore?.exam !== undefined ? String(existingScore.exam) : "",
    });
    setComment(existingComment?.comment || "");
    setSignature(existingComment?.signature || "");
    setErrors({});
  }, [student.id, subject.id]);

  function handleChange(key, max, raw) {
    setValues((prev) => ({ ...prev, [key]: raw }));
    if (raw === "") { setErrors((prev) => ({ ...prev, [key]: false })); return; }
    setErrors((prev) => ({ ...prev, [key]: isNaN(Number(raw)) || Number(raw) < 0 || Number(raw) > max }));
  }

  function handleSave() {
    let hasError = false;
    const newErrors = {};
    FIELDS.forEach(({ key, max }) => {
      const raw = values[key];
      if (raw !== "" && (isNaN(Number(raw)) || Number(raw) < 0 || Number(raw) > max)) {
        newErrors[key] = true; hasError = true;
      }
    });
    if (hasError) { setErrors(newErrors); return; }

    onSave({
      scores: {
        t1:   values.t1   !== "" ? Number(values.t1)   : "",
        t2:   values.t2   !== "" ? Number(values.t2)   : "",
        exam: values.exam !== "" ? Number(values.exam) : "",
      },
      comment,
      signature,
    });
  }

  const t1    = Number(values.t1)   || 0;
  const t2    = Number(values.t2)   || 0;
  const exam  = Number(values.exam) || 0;
  const total = t1 + t2 + exam;
  const hasAny = values.t1 !== "" || values.t2 !== "" || values.exam !== "";
  const grade  = hasAny ? getGrade(total) : null;

  return (
    <div className={`${styles.wrapper} anim-slide-right`}>
      <div className={styles.topRow}>
        <button className={styles.backBtn} onClick={onBack}>← Back to Students</button>
        <span className={styles.subjectNote}>Entering scores for your subject only</span>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.studentName}>{student.name}</h2>
          <p className={styles.studentClass}>Class: {student.class}</p>
        </div>

        <div className={styles.cardBody}>
          <div className={styles.subjectLabel}>📖 Subject: {subject.name}</div>

          {/* Score inputs */}
          <div className={styles.fieldsGrid}>
            {FIELDS.map(({ key, label, max }) => (
              <div key={key} className={styles.field}>
                <label className={styles.fieldLabel}>
                  {label}<span className={styles.maxNote}> (max {max})</span>
                </label>
                <input
                  type="number" min={0} max={max} value={values[key]}
                  disabled={locked}
                  onChange={(e) => handleChange(key, max, e.target.value)}
                  placeholder="0"
                  className={[styles.scoreInput, errors[key] ? styles.inputError : ""].join(" ")}
                />
                <span className={styles.outOf}>Out of {max}</span>
                {errors[key] && <span className={styles.errorMsg}>Max is {max}</span>}
              </div>
            ))}
          </div>

          {/* Total row */}
          <div className={styles.totalRow}>
            <div>
              <div className={styles.totalLabel}>Total Score</div>
              <div className={styles.totalValue}>
                {total}<span className={styles.totalMax}>/100</span>
              </div>
            </div>
            <div className={styles.gradeSection}>
              <div className={styles.totalLabel}>Grade</div>
              {grade
                ? <span className={styles.gradeChip} style={{ background: grade.bg, color: grade.color }}>{grade.letter}</span>
                : <span className={styles.gradeEmpty}>—</span>}
            </div>
          </div>

          {/* Teacher's Comment */}
          <div className={styles.commentSection}>
            <label className={styles.commentLabel}>Teacher's Comment</label>
            <textarea
              className={styles.commentInput}
              rows={2}
              maxLength={120}
              placeholder="e.g. Excellent performance, keep it up!"
              value={comment}
              disabled={locked}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Signature pad */}
          <div className={styles.sigSection}>
            <label className={styles.commentLabel}>Teacher's Signature <span className={styles.sigHint}>(draw below)</span></label>
            {locked
              ? signature
                ? <img src={signature} alt="signature" className={styles.sigPreview} />
                : <div className={styles.sigEmpty}>No signature</div>
              : <SignaturePad value={signature} onChange={setSignature} />
            }
          </div>

          <div className={styles.actions}>
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button variant="teal" onClick={handleSave} disabled={locked}>💾 Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
