// The global analytics filter model.
//
// The UI (components/page-filters.tsx) works in its own option values
// ('grade8', 'a', 'mathematics', 'midterm1'); the backend endpoints expect
// grade="8", section="A", subject name, and the exam label. This module is the
// single translation point between the two, so every wired page filters the
// same way. See BACKEND_INTEGRATION_PLAN.md §2/§7.

import type { QueryParams } from './api'

export interface AnalyticsFilters {
  subject: string // e.g. 'mathematics'
  exam: string // e.g. 'midterm1'
  grade: string // e.g. 'grade8'
  section: string // e.g. 'a'
  // Academic year ('2025-26') or ALL_YEARS. Only the teacher dashboard shows
  // this dropdown (beaver#547); exam-scoped pages ignore it.
  year?: string
  // 'All Exams' selected on list pages that allow it (chapter/student,
  // beaver#574). `exam` always stays a real exam id so exam-scoped pages
  // (question list, detail links) keep working regardless of this flag.
  examAll?: boolean
  // 'All Subjects' selected on the student dashboard (beaver#1081-15860).
  // `subject` always stays a real subject so subject-scoped fetches (chapter
  // breakdown, etc.) keep working regardless of this flag.
  subjectAll?: boolean
}

// Defaults are pointed at the grade/subject/section that actually holds data
// in the connected loam_db (grade 12 · Mathematics · section C). The UI's
// grade/section/exam option lists are still hardcoded placeholders — replacing
// them with dynamic options from GET /api/filters/grades is Phase 2 (see
// BACKEND_INTEGRATION_PLAN.md §5 #6).
export const DEFAULT_FILTERS: AnalyticsFilters = {
  subject: 'mathematics',
  exam: 'Preboard 1',
  grade: 'grade12',
  section: 'c',
}

// The exam dropdown now carries the REAL exam names as stored in
// question_papers.exam (e.g. 'Midterm', 'Preboard 1'), so no mapping is needed
// — toBackendExam is the identity. The placeholder labels ('Mid-term 1') were
// removed because they match nothing in loam_db. Making these options dynamic
// per grade from GET /api/filters/grades is Phase 2.

/** 'grade8' -> '8' */
export function toBackendGrade(grade: string): string {
  return grade.replace(/^grade/i, '')
}

/** 'a' -> 'A' */
export function toBackendSection(section: string): string {
  return section.toUpperCase()
}

/** 'mathematics' -> 'Mathematics' (subjects.name is title-cased) */
export function toBackendSubject(subject: string): string {
  return subject.charAt(0).toUpperCase() + subject.slice(1)
}

/** Exam dropdown already holds the real exam name — pass through unchanged. */
export function toBackendExam(exam: string): string {
  return exam
}

/**
 * Translate the UI filter state into backend query params. `grade` is required
 * by every analytics endpoint; the rest are optional and dropped when absent.
 */
export function toQueryParams(
  filters: AnalyticsFilters,
  opts: { includeExam?: boolean; includeSection?: boolean } = {},
): QueryParams {
  const { includeExam = true, includeSection = true } = opts
  return {
    grade: toBackendGrade(filters.grade),
    subject: toBackendSubject(filters.subject),
    ...(includeSection ? { section: toBackendSection(filters.section) } : {}),
    ...(includeExam ? { exam: toBackendExam(filters.exam) } : {}),
  }
}

// ── Academic year (beaver#547) ───────────────────────────────────────────────
// Derived from the trailing token of backend exam ids ('..._25-26' → '2025-26').
export const ALL_YEARS = 'all'

// Dropdown-only sentinel for the 'All Exams' option (beaver#574) — never sent
// to the backend; it maps to `examAll: true` in the filter state.
export const ALL_EXAMS = 'all-exams'

// Dropdown-only sentinel for the 'All Subjects' option (student dashboard) —
// never sent to the backend; it maps to `subjectAll: true` in the filter state.
export const ALL_SUBJECTS = 'all-subjects'

/**
 * The year suffix comes in two shapes: one token ('..._25-26') or split across
 * the last two tokens ('..._Unit-Test -1_26_27'). Returns the label and how
 * many trailing tokens it consumed.
 */
function trailingYear(parts: string[]): { label: string; tokens: number } | null {
  const last = parts[parts.length - 1] ?? ''
  const prev = parts[parts.length - 2] ?? ''
  const m = /^(\d{2})-(\d{2})$/.exec(last)
  if (m) return { label: `20${m[1]}-${m[2]}`, tokens: 1 }
  if (/^\d{2}$/.test(last) && /^\d{2}$/.test(prev) && Number(last) === Number(prev) + 1) {
    return { label: `20${prev}-${last}`, tokens: 2 }
  }
  return null
}

// "Pick an Accountancy Exam" vs "Pick a Physics Chapter" — the article follows
// the subject's first letter (all subject names here are pronounced as spelt).
export function pickSubjectTitle(subject: string, noun: string): string {
  const name = subject.replace(/\s+/g, ' ').trim()
  const article = /^[aeiou]/i.test(name) ? 'an' : 'a'
  return `Pick ${article} ${name} ${noun}`
}

export function examAcademicYear(examId: string): string | null {
  return trailingYear(examId.split('_'))?.label ?? null
}

/**
 * Academic years hard-excluded from the current dashboard view (s418, delivery
 * 2026-07-28). The 2025-26 annuals belong to the now-promoted cohort (≈half are
 * in Grade 12 this year) but carry grade-at-exam-time on their crops, so they
 * surface under the wrong grade and produce broken (>100%) chapter numbers.
 *
 * The set is SOURCED FROM CONFIG — the school's `academic_year_scope.excluded_years`
 * doc in config-manager — via setExcludedAcademicYears(), called once at hydration
 * (app/layout.tsx → ConfigProvider). The value below is the FAIL-SAFE floor used
 * before that hydrates or if config-manager is unreachable, so the broken 2025-26
 * data never leaks even on a cold client. Labels are the examAcademicYear() form
 * ('2025-26'), NOT the raw exam-id token ('25-26').
 *
 * This is a client-side STOPGAP; the durable fix is the SAME config enforced
 * server-side in aggregatedData (fast-follow, see task/#issue).
 */
let excludedAcademicYears = new Set<string>(['2025-26'])

/** Overwrite the excluded-year set from config (school-resolved) at hydration. */
export function setExcludedAcademicYears(years: string[]): void {
  excludedAcademicYears = new Set(years ?? [])
}

/** True when the exam's academic year is hard-excluded from view. */
export function isExcludedAcademicYear(examId: string): boolean {
  const y = examAcademicYear(examId)
  return y !== null && excludedAcademicYears.has(y)
}

/** Years available for a set of exam ids, latest first (excluded years dropped). */
export function academicYearsOf(examIds: string[]): string[] {
  return Array.from(
    new Set(
      examIds
        .map(examAcademicYear)
        .filter((y): y is string => y !== null && !excludedAcademicYears.has(y)),
    ),
  )
    .sort()
    .reverse()
}

/**
 * Exams whose id carries no year token (legacy ids like 'Preboard 1') can't be
 * excluded honestly, so they match every year. Excluded years never match —
 * even under ALL_YEARS — so no page can surface them regardless of the selected
 * filter.
 */
export function matchesAcademicYear(examId: string, year: string | undefined): boolean {
  const y = examAcademicYear(examId)
  if (y !== null && excludedAcademicYears.has(y)) return false // hard-excluded, always
  if (!year || year === ALL_YEARS) return true
  return y === null || y === year
}

// ── Friendly exam names (beaver#548) ─────────────────────────────────────────
// "11_ACCOUNTANCY_ANNUALEXAMINATION_25-26" -> "Annual Exam 2025-26".
// Display-only: query params keep the backend id. Names that don't match the
// backend-id pattern ("Preboard 1", "Midterm") pass through unchanged.
const EXAM_TYPE_LABELS: [RegExp, string][] = [
  [/^ANNUALEXAM(?:INATION)?$/, 'Annual Exam'],
  [/^MIDTERM(\d*)$/, 'Mid Term'],
  [/^UNITTE(?:S|X)T(\d*)$/, 'Unit Test'], // covers the UNITTEXT typo in ids
  [/^PREBOARD(\d*)$/, 'Preboard'],
  [/^HALFYEARLY$/, 'Half Yearly'],
  [/^FINALEXAM(?:INATION)?$/, 'Final Exam'],
]

/**
 * Identifies the LOGICAL exam behind a raw exam id, collapsing the per-subject
 * copies of the same sitting.
 *
 * Exam ids embed the subject ('11_PHYSICS_UNITTEST1_25-26',
 * '11_ACCOUNTANCY_UNITTEST1_25-26'), so a single "Unit Test 1 2025-26" exists
 * as one id per subject. Anything that reasons across subjects — the leadership
 * Subjects directory — has to treat those as one exam, or it sees each subject
 * as a separate exam and can only ever show one subject at a time.
 *
 * The key IS the formatted display name, deliberately: that function already
 * strips grade and subject and keeps type + number + year, which is exactly the
 * identity wanted, and reusing it means there's one exam-id parser to keep
 * correct instead of two that can drift. Ids it can't parse pass through
 * verbatim, so legacy subject-agnostic ids ('Preboard 1') stay distinct.
 */
export function logicalExamKey(id: string): string {
  return formatExamName(id)
}

export function formatExamName(id: string | null | undefined, opts?: { year?: boolean }): string {
  if (!id) return '—'
  const withYear = opts?.year !== false
  const parts = id.split('_')
  const year = trailingYear(parts)
  if (!year || parts.length < year.tokens + 2) return id
  const end = parts.length - year.tokens
  const yearSuffix = withYear ? ` ${year.label}` : ''
  // The exam type can span one or two tokens ("MIDTERM" vs "Annual"+"Examination");
  // punctuation is stripped before matching ("Unit-Test -1" -> "UNITTEST1").
  for (const span of [2, 1]) {
    if (end - span < 1) continue
    const type = parts.slice(end - span, end).join('').toUpperCase().replace(/[^A-Z0-9]/g, '')
    for (const [re, label] of EXAM_TYPE_LABELS) {
      const m = re.exec(type)
      if (m) {
        const num = m[1] ? ` ${m[1]}` : ''
        return `${label}${num}${yearSuffix}`
      }
    }
  }
  const type = parts[end - 1]
  return `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}${yearSuffix}`
}
