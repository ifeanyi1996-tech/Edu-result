// ─── Grade & Score Helpers ──────────────────────────────────────────────────

/**
 * Returns grade letter, text colour, and background colour for a given percentage.
 * @param {number} pct - Score as a percentage (0–100)
 */
export function getGrade(pct) {
  if (pct >= 80) return { letter: "A", color: "#059669", bg: "#d1fae5" };
  if (pct >= 65) return { letter: "B", color: "#0ea5e9", bg: "#e0f2fe" };
  if (pct >= 50) return { letter: "C", color: "#d97706", bg: "#fef3c7" };
  if (pct >= 40) return { letter: "D", color: "#dc2626", bg: "#fee2e2" };
  return { letter: "F", color: "#7f1d1d", bg: "#fecaca" };
}

/**
 * Calculates the total score for a student across ALL subjects.
 * @param {object} scores - The scores object from the DB
 * @param {string} studentId
 */
export function getStudentTotal(scores, studentId) {
  return Object.values(scores[studentId] || {}).reduce(
    (sum, sc) =>
      sum + (Number(sc.t1) || 0) + (Number(sc.t2) || 0) + (Number(sc.exam) || 0),
    0
  );
}

/**
 * Calculates a single student's score for ONE specific subject.
 * @param {object} scores
 * @param {string} studentId
 * @param {string} subjectId
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
 * Ranks an array of students by their total score (descending).
 * Attaches a `pos` (position) property to each.
 * @param {Array} students
 * @param {object} scores
 */
export function rankStudents(students, scores) {
  return students
    .map((s) => ({ ...s, total: getStudentTotal(scores, s.id) }))
    .sort((a, b) => b.total - a.total)
    .map((s, i) => ({ ...s, pos: i + 1 }));
}

/**
 * Gets unique sorted classes from a student list.
 */
export function getClasses(students) {
  return [...new Set(students.map((s) => s.class))].sort();
}
