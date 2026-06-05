// ─── Grade & Score Helpers ──────────────────────────────────────────────────

/**
 * Detects whether a class name belongs to JSS or SSS.
 * JSS: JSS 1/2/3, Junior, J.S.S, Form 1/2/3, Year 7/8/9
 * SSS: SS 1/2/3, Senior, S.S.S, Form 4/5/6, Year 10/11/12
 * Returns "JSS" | "SSS" | "both" (fallback)
 */
export function getSection(className = "") {
  const c = className.toUpperCase().replace(/[.\s-]/g, "");
  if (/^(JSS|JS|JNR|JUNIOR|FORM[123]|YEAR[789]|CLASS[789]|J[123])/.test(c)) return "JSS";
  if (/^(SSS|SS|SNR|SENIOR|FORM[456]|YEAR(10|11|12)|CLASS(10|11|12)|S[123])/.test(c)) return "SSS";
  // Numeric only classes — 1/2/3 = JSS, 4/5/6 = SSS
  const num = parseInt(c.replace(/\D/g, ""), 10);
  if (!isNaN(num)) return num <= 3 ? "JSS" : "SSS";
  return "both"; // unknown — show all subjects
}

/**
 * Returns the subjects that apply to a given class AND stream.
 * - section filter: JSS subjects don't show for SSS classes and vice versa
 * - stream filter: if a subject has streams set (e.g. ["Science"]), it only
 *   shows for students whose stream matches. Core subjects (no streams) show for all.
 *
 * @param {Array}  subjects   - all subjects from db
 * @param {string} className  - e.g. "SSS 2"
 * @param {string} [stream]   - "Science" | "Arts" | "Commercial" | "" | undefined
 */
export function getSubjectsForClass(subjects, className, stream) {
  const section = getSection(className);
  return subjects.filter((s) => {
    // 1. Section filter
    if (section !== "both") {
      const subSec = s.section || "both";
      if (subSec !== "both" && subSec !== section) return false;
    }
    // 2. Stream filter — only applies for SSS classes that have a stream set
    if (section === "SSS" && stream && Array.isArray(s.streams) && s.streams.length > 0) {
      return s.streams.includes(stream);
    }
    return true;
  });
}

/**
 * Returns grade info for a given score using admin-configured or default ranges.
 * @param {number} score - raw score (0–100)
 * @param {Array}  [gradeConfig] - optional array from db.gradeConfig
 */
export function getGrade(score, gradeConfig) {
  if (gradeConfig && gradeConfig.length) {
    const cfg = gradeConfig.find((g) => score >= g.min && score <= g.max);
    if (cfg) return { letter: cfg.grade, label: cfg.label, color: cfg.color, bg: cfg.bg };
  }
  // Fallback defaults
  if (score >= 75) return { letter: "A1", label: "Excellent",  color: "#059669", bg: "#d1fae5" };
  if (score >= 70) return { letter: "B2", label: "Very Good",  color: "#0ea5e9", bg: "#e0f2fe" };
  if (score >= 65) return { letter: "B3", label: "Good",       color: "#0ea5e9", bg: "#e0f2fe" };
  if (score >= 60) return { letter: "C4", label: "Credit",     color: "#d97706", bg: "#fef3c7" };
  if (score >= 55) return { letter: "C5", label: "Credit",     color: "#d97706", bg: "#fef3c7" };
  if (score >= 50) return { letter: "C6", label: "Credit",     color: "#d97706", bg: "#fef3c7" };
  if (score >= 45) return { letter: "D7", label: "Pass",       color: "#dc2626", bg: "#fee2e2" };
  if (score >= 40) return { letter: "E8", label: "Pass",       color: "#dc2626", bg: "#fee2e2" };
  return             { letter: "F9", label: "Fail",       color: "#7f1d1d", bg: "#fecaca" };
}

/**
 * Calculates total score for a student across subjects relevant to their class.
 */
export function getStudentTotal(scores, studentId, subjects, className) {
  const relevantSubjects = className
    ? getSubjectsForClass(subjects || [], className)
    : subjects || [];
  const subIds = new Set(relevantSubjects.map((s) => s.id));
  return Object.entries(scores[studentId] || {}).reduce(
    (sum, [subId, sc]) =>
      subIds.has(subId)
        ? sum + (Number(sc.t1) || 0) + (Number(sc.t2) || 0) + (Number(sc.exam) || 0)
        : sum,
    0
  );
}

/**
 * Calculates a single student\'s score for ONE specific subject.
 */
export function getSubjectScore(scores, studentId, subjectId) {
  const sc = (scores[studentId] || {})[subjectId] || {};
  return (Number(sc.t1) || 0) + (Number(sc.t2) || 0) + (Number(sc.exam) || 0);
}

/**
 * Returns true if a score entry exists for the given student + subject.
 */
export function hasScore(scores, studentId, subjectId) {
  const sc = (scores[studentId] || {})[subjectId];
  return sc !== undefined && sc.t1 !== undefined;
}

/**
 * Ranks students by total score, section-aware.
 */
export function rankStudents(students, scores, subjects) {
  return students
    .map((s) => ({ ...s, total: getStudentTotal(scores, s.id, subjects || [], s.class) }))
    .sort((a, b) => b.total - a.total)
    .map((s, i) => ({ ...s, pos: i + 1 }));
}

/**
 * Gets unique sorted classes from a student list.
 */
export function getClasses(students) {
  return [...new Set(students.map((s) => s.class))].sort();
}

/**
 * Normalise teacher.subjects to always be an array.
 * Handles old data where teachers only had teacher.subject (single string).
 */
export function getTeacherSubjectIds(teacher) {
  if (Array.isArray(teacher.subjects) && teacher.subjects.length > 0) return teacher.subjects;
  if (teacher.subject) return [teacher.subject];
  return [];
}
