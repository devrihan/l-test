// Question data access for the Questions list + detail pages.
//
// Question TEXT/marks/type come from the paper-based endpoint (works for ALL
// classes, incl. grade 11 / scanned sections):
//   GET /api/question-paper/questions?grade&subject&exam  -> PaperQuestionDTO[]
//   GET /api/question-paper/questions/{id}                -> PaperQuestionDTO
// Per-question ANALYTICS (class accuracy) comes from the analytics endpoint
// (only populated for evaluated classes) and is overlaid where available:
//   GET /api/questions?grade&section&subject&exam         -> QuestionDTO[]

import { apiGet, AGGREGATED_API_BASE } from './api'
import { toQueryParams, type AnalyticsFilters } from './filters'

/** Mirrors aggregatedData PaperQuestionDTO (real question text). */
export interface PaperQuestion {
  id: number
  questionNumber: number
  questionText: string
  questionType: string
  maxMarks: number | null
  chapterName: string | null
  chapterNumber: number | null
  concept: string | null
  weightageTag: string | null
  bloomTaxonomy: string | null
  difficultyLevel: string | null
  questionLabel: string | null
  optionGroup: string | null
  exam: string
  subject: string
  grade: string
  answerKey: string | null
  aiAnswer: string | null
  // AI-generated performance summary — null until populated
  aiSummary: string | null
  hasDiagram: boolean | null
  diagramCropUrl: string | null
}

/** Mirrors aggregatedData QuestionDTO (analytics — accuracy overlay). */
interface QuestionDTO {
  id: number
  accuracy: number
  totalStudents: number
}

export interface QuestionRow {
  id: number
  q: string // 'Q1'
  title: string // questionText
  chapter: string
  concept: string
  type: string // CBSE type (MCQ/VSA/SA/LA/CASE_STUDY)
  bloomTaxonomy: string
  difficulty: string
  avg: number // class accuracy % (0 where analytics not available)
  marks: number
  totalStudents: number
}

/** One exam's questions, grouped for the accordion UI. */
export interface QuestionGroup {
  exam: string
  questions: QuestionRow[]
}

function qLabel(n: number): string {
  return `Q${Number.isInteger(n) ? String(Math.trunc(n)) : String(n)}`
}

export async function fetchPaperQuestions(filters: AnalyticsFilters): Promise<PaperQuestion[]> {
  return apiGet<PaperQuestion[]>(AGGREGATED_API_BASE, '/api/question-paper/questions', {
    grade: filters.grade,
    subject: filters.subject,
    exam: filters.exam,
  })
}

export async function fetchQuestionById(id: number | string): Promise<PaperQuestion | null> {
  try {
    return await apiGet<PaperQuestion>(AGGREGATED_API_BASE, `/api/question-paper/questions/${id}`)
  } catch {
    return null
  }
}

/** Real exam header facts (date + total marks) for the exam detail page. */
export interface ExamInfo {
  exam: string
  examDate: string | null
  maxMarks: number | null
  // nullable AI copy for the exam Summary tab (Teacher Metrics spec)
  examSummaryTitle?: string | null
  examSummaryDescription?: string | null
}

export async function fetchExamInfo(filters: AnalyticsFilters): Promise<ExamInfo | null> {
  try {
    return await apiGet<ExamInfo>(AGGREGATED_API_BASE, '/api/question-paper/exam-info', {
      grade: filters.grade,
      subject: filters.subject,
      exam: filters.exam,
    })
  } catch {
    return null
  }
}

/** Pre-computed per-section AI summary for the exam Summary tab (teacher view).
 * Staff-only endpoint — do not call from student-role components (403s). */
export interface ExamSectionSummary {
  title: string | null
  subtitle: string | null
  generatedAt?: string | null
}

export async function fetchExamSectionSummary(f: {
  grade: string
  section: string
  subject: string
  exam: string
}): Promise<ExamSectionSummary | null> {
  return apiGet<ExamSectionSummary>(AGGREGATED_API_BASE, '/api/question-paper/exam-section-summary', {
    grade: f.grade,
    section: f.section,
    subject: f.subject,
    exam: f.exam,
  }).catch(() => null)
}

/** Pre-computed per-student AI summary for the student-login exam detail page's
 * Summary card ("See where your marks went on this exam"). Self-scoped endpoint
 * — a student reads only their own row — so it is safe from student components. */
export interface StudentExamSummary {
  title: string | null
  subtitle: string | null
  generatedAt?: string | null
}

export async function fetchStudentExamSummary(f: {
  grade: string
  section: string
  subject: string
  exam: string
  admissionNo: string
}): Promise<StudentExamSummary | null> {
  return apiGet<StudentExamSummary>(AGGREGATED_API_BASE, '/api/question-paper/student-exam-summary', {
    grade: f.grade,
    section: f.section,
    subject: f.subject,
    exam: f.exam,
    admissionNo: f.admissionNo,
  }).catch(() => null)
}

/** Pre-computed per-student AI summary for the student-login chapter-detail
 * page's Summary panel. Two pairs: examView fills the By Exam tab, conceptView
 * the By Concept tab. Self-scoped endpoint (matched by admissionNo + exam +
 * chapter) — a student reads only their own row — so it is safe to call from
 * student components. Returns null on any error so the UI keeps its
 * "No analysis yet" placeholder. */
export interface SummaryPair {
  title: string | null
  subtitle: string | null
}
export interface StudentChapterSummary {
  examView: SummaryPair | null
  conceptView: SummaryPair | null
  generatedAt?: string | null
}

export async function fetchStudentChapterSummary(f: {
  grade: string
  section: string
  subject: string
  exam: string
  chapter: string
  admissionNo: string
}): Promise<StudentChapterSummary | null> {
  return apiGet<StudentChapterSummary>(AGGREGATED_API_BASE, '/api/question-paper/student-chapter-summary', {
    grade: f.grade,
    section: f.section,
    subject: f.subject,
    exam: f.exam,
    chapter: f.chapter,
    admissionNo: f.admissionNo,
  }).catch(() => null)
}

/** Pre-computed per-section AI summary for one question, shown on the Question
 * Detail page next to the "Section average" number (teacher view). Staff-only
 * endpoint — do not call from student-role components (403s). */
export interface QuestionSectionSummary {
  summary: string | null
  generatedAt?: string | null
}

export async function fetchQuestionSectionSummary(f: {
  grade: string
  section: string
  subject: string
  exam: string
  questionNumber: number | string
}): Promise<QuestionSectionSummary | null> {
  return apiGet<QuestionSectionSummary>(AGGREGATED_API_BASE, '/api/question-paper/question-section-summary', {
    grade: f.grade,
    section: f.section,
    subject: f.subject,
    exam: f.exam,
    questionNumber: String(f.questionNumber),
  }).catch(() => null)
}

/** Format an ISO exam date (YYYY-MM-DD) as "9 Feb, 2026"; passthrough on failure. */
export function formatExamDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = parseInt(m[3], 10)
  const mon = months[parseInt(m[2], 10) - 1]
  return mon ? `${day} ${mon}, ${m[1]}` : iso
}

/** Exam-level remediation (per-chapter errors + common mistakes). */
export interface RemediationChapter {
  chapter: string | null
  questions: number
  // error OCCURRENCES across the chapter's questions — not students, not marks
  errorCount: number
  dominantError: string | null
  // real figures from the scanned marks, over the sections that were
  // classified. Optional: an older API build does not send them.
  studentsAffected?: number
  marksLost?: number
  // The recoverable slice of marksLost: marks this section still loses on the
  // questions the WHOLE GRADE already scores >=70% of. Drives the "Scoring
  // marks left on the table" card; the distribution card keeps marksLost.
  // Optional: an older API build does not send them.
  easyMarks?: number
  easyStudents?: number
}
export interface MistakeEvidence {
  imageUrl: string
  student: string | null
  marks: number | null
  maxMarks: number | null
}
export interface RemediationMistake {
  chapter: string | null
  pattern: string
  count: number
  description: string
  questionNumber: number | null
  // real student work for this mistake's question (most-marks-lost crop)
  evidenceImageUrl: string | null
  evidenceStudent: string | null
  evidenceMarks: number | null
  evidenceMaxMarks: number | null
  evidencesJson?: string | null
  // parsed from evidencesJson by fetchRemediation — one entry per affected
  // student (worst first), for the evidence pager
  evidences?: MistakeEvidence[]
}
export interface Remediation {
  chapters: RemediationChapter[]
  mistakes: RemediationMistake[]
}

/**
 * Tagged result, because a failed fetch is NOT the same thing as "this section
 * has no remediation data" (beaver#831). The old `catch { return null }` shape
 * rendered a timeout, a 500 or an auth blip identically to an unclassified
 * section: the whole block silently disappeared, and remounting the page
 * "fixed" it by accident of the retry. Callers branch on `ok` and show a
 * retryable error state for `ok: false`; only a SUCCESSFUL response with zero
 * chapters may be treated as "no data".
 */
export type RemediationFetch = { ok: true; data: Remediation } | { ok: false }

export async function fetchRemediation(filters: AnalyticsFilters): Promise<RemediationFetch> {
  try {
    const rem = await apiGet<Remediation>(AGGREGATED_API_BASE, '/api/question-paper/remediation', {
      grade: filters.grade,
      subject: filters.subject,
      exam: filters.exam,
      // easyMarks is counted for THIS section (the classification behind it is
      // grade-wide). Omitting it makes the API fall back to the classified
      // sections, which is the same scope marksLost already uses.
      ...(filters.section ? { section: filters.section } : {}),
    })
    for (const m of rem.mistakes) {
      try {
        m.evidences = m.evidencesJson ? (JSON.parse(m.evidencesJson) as MistakeEvidence[]) : []
      } catch {
        m.evidences = []
      }
    }
    return { ok: true, data: rem }
  } catch (err) {
    // With the request context, so a report like beaver#831's is diagnosable
    // from a screen share instead of a debugging session.
    console.error('[remediation] fetch failed', {
      grade: filters.grade,
      section: filters.section,
      subject: filters.subject,
      exam: filters.exam,
    }, err)
    return { ok: false }
  }
}

/** The reviewed answer key for a question — R2 crop image + clean text. */
export interface AnswerKey {
  croppedImageUrl: string | null
  cleanText: string | null
  ocrText: string | null
  mcqChoice: string | null
  status: string | null
}

export async function fetchAnswerKey(id: number | string): Promise<AnswerKey | null> {
  try {
    return await apiGet<AnswerKey>(AGGREGATED_API_BASE, `/api/question-paper/questions/${id}/answer-key`)
  } catch {
    return null
  }
}

/** Single-question analytics (only populated for evaluated classes). */
export interface QuestionStats {
  totalStudents: number
  maxMarks: number | null
  averageMarks: { obtained: number; total: number; percentage: number } | null
  dominantErrorType: string | null
  commonMistakes: { rank: number; pattern: string; count: number; description: string }[]
  keyInsights: { errorType: string; percentage: number; description: string }[]
  studentList: { marksObtained: number | null; maxMarks: number | null }[]
}

export async function fetchQuestionStats(
  id: number | string,
  section: string,
): Promise<QuestionStats | null> {
  try {
    return await apiGet<QuestionStats>(AGGREGATED_API_BASE, `/api/questions/${id}/stats`, { section })
  } catch {
    return null
  }
}

// Crops-backed stats for a question: score histogram + section average from
// scanned marks, shaped exactly like QuestionStats so the detail page renders
// unchanged. Mistakes/insights stay empty (those are AI-derived — honest gap).
// Exported too: the student detail page's "By Question" tooltip reuses
// `averageMarks` for its "Class average was X/Y marks" line.
export async function fetchCropDistributionAsStats(
  questionNumber: number,
  filters: AnalyticsFilters,
): Promise<QuestionStats | null> {
  try {
    const d = await apiGet<{
      students: number
      avgMarks: number | null
      maxMarks: number | null
      accuracy: number | null
      distribution: { marks: number; students: number }[]
    }>(AGGREGATED_API_BASE, '/api/answer-crops/question-distribution', {
      grade: filters.grade,
      section: filters.section,
      subject: filters.subject,
      exam: filters.exam,
      question: Math.trunc(questionNumber),
    })
    if (!d.students) return null
    const studentList = d.distribution.flatMap((b) =>
      Array.from({ length: b.students }, () => ({ marksObtained: b.marks, maxMarks: d.maxMarks })),
    )
    return {
      totalStudents: d.students,
      maxMarks: d.maxMarks,
      averageMarks:
        d.avgMarks != null && d.maxMarks
          ? { obtained: d.avgMarks, total: d.maxMarks, percentage: d.accuracy ?? (100 * d.avgMarks) / d.maxMarks }
          : null,
      dominantErrorType: null,
      commonMistakes: [],
      keyInsights: [],
      studentList,
    }
  } catch {
    return null
  }
}

/**
 * Stats for the question detail page. The scanned-marks (crop) layer drives the
 * Question Performance % and the score distribution — it is whole-question
 * correct. The legacy per-question analytics is NOT used for the average: for
 * multi-part questions the marks live on the parent whole-question crop and
 * every sub-part reads 0 in analytics, so analytics would show 0% (same root
 * cause as the list — see fetchQuestions). Analytics is only kept for its
 * commonMistakes / keyInsights / dominantErrorType overlay, and as the fallback
 * when there's no crop distribution at all.
 */
export async function fetchQuestionStatsSmart(
  id: number | string,
  questionNumber: number,
  filters: AnalyticsFilters,
): Promise<QuestionStats | null> {
  const [crop, analytics] = await Promise.all([
    fetchCropDistributionAsStats(questionNumber, filters),
    fetchQuestionStats(id, filters.section),
  ])
  if (crop?.averageMarks || crop?.studentList?.length) {
    return {
      ...crop,
      commonMistakes: analytics?.commonMistakes ?? crop.commonMistakes,
      keyInsights: analytics?.keyInsights ?? crop.keyInsights,
      dominantErrorType: analytics?.dominantErrorType ?? crop.dominantErrorType,
    }
  }
  return analytics ?? crop
}

// Analytics accuracy keyed by question id — best-effort (empty for classes with
// no evaluated answers in loam_db).
async function fetchAccuracyById(filters: AnalyticsFilters): Promise<Map<number, QuestionDTO>> {
  try {
    const rows = await apiGet<QuestionDTO[]>(
      AGGREGATED_API_BASE,
      '/api/questions',
      toQueryParams(filters, { includeExam: true, includeSection: true }),
    )
    return new Map(rows.map((r) => [r.id, r]))
  } catch {
    return new Map()
  }
}

// Per-question class stats computed from SCANNED MARKS (student_answer_crops)
// — the metrics-contract quantitative layer for classes with no LLM analytics.
// Keyed by question NUMBER (crops don't know question ids).
interface CropQuestionStat {
  questionNumber: number
  students: number
  avgMarks: number | null
  maxMarks: number | null
  accuracy: number | null
}

async function fetchCropQuestionStats(
  filters: AnalyticsFilters,
): Promise<Map<number, CropQuestionStat>> {
  try {
    const rows = await apiGet<CropQuestionStat[]>(
      AGGREGATED_API_BASE,
      '/api/answer-crops/question-stats',
      {
        grade: filters.grade,
        section: filters.section,
        subject: filters.subject,
        exam: filters.exam,
      },
    )
    return new Map(rows.map((r) => [r.questionNumber, r]))
  } catch {
    return new Map()
  }
}

export async function fetchQuestions(filters: AnalyticsFilters): Promise<QuestionGroup> {
  const [paper, accuracy] = await Promise.all([
    fetchPaperQuestions(filters),
    fetchAccuracyById(filters),
  ])
  // Crop-based class avg, ALWAYS fetched. It's the analytics fallback per
  // question, not just when analytics is wholly absent: the analytics
  // /api/questions join drops questions with no concept_id, so a concept-less
  // question is missing from `accuracy` while its section-mates are present —
  // without the crop stat its class avg would blank to "—" (beaver#693).
  const cropStats = await fetchCropQuestionStats(filters)

  // ONE row per whole question (Teacher Metrics spec): sub-parts (17.1, 17.2)
  // collapse into Q17. Marks = group-aware sum of sub-part maxes (OR
  // alternatives count once); metadata = first sub-part's non-null values;
  // class avg = whole-question accuracy (crop stats are whole-question
  // already; analytics sub-part accuracies are marks-weighted).
  const byWhole = new Map<number, PaperQuestion[]>()
  for (const p of paper) {
    const key = Math.trunc(p.questionNumber)
    byWhole.set(key, [...(byWhole.get(key) ?? []), p])
  }
  const questions: QuestionRow[] = Array.from(byWhole.entries())
    .map(([num, parts]) => {
      parts.sort((x, y) => x.questionNumber - y.questionNumber)
      const first = parts[0]
      const pick = <T>(get: (p: PaperQuestion) => T | null | undefined): T | null => {
        for (const part of parts) {
          const v = get(part)
          if (v != null && v !== '') return v
        }
        return null
      }
      const c = cropStats.get(num)
      // An either/or question (sub-parts sharing an option_group) is scoreable
      // out of LESS than the sum of every sub-part's max — you answer only one
      // alternative. For those, Marks = the whole-question ATTEMPTABLE MAX from
      // the crop stats (e.g. Q17 = 5, not 10), so Marks agrees with Class avg
      // and the score distribution. Normal all-attempted multi-part questions
      // keep the sum of sub-part maxes (which the crop max equals anyway); the
      // sum is also the fallback when no crop stat exists for this question.
      const isOrQuestion = parts.some((part) => part.optionGroup != null && part.optionGroup !== '')
      const sumOfPartMarks = parts.reduce((a, part) => a + (part.maxMarks ?? 0), 0)
      const marks = isOrQuestion && c?.maxMarks != null ? c.maxMarks : sumOfPartMarks
      // Analytics path: marks-weighted mean of the sub-part accuracies. This is
      // UNRELIABLE for multi-part questions — the marks live on the parent
      // whole-question crop, so every sub-part scores 0 in analytics and the
      // weighted mean collapses to 0 (beaver: Chemistry Q10/12/13/14/16 showed
      // 0% despite real crop averages). The crop stat below IS whole-question-
      // correct, so it takes precedence; analytics is only a fallback for
      // questions with no crop stat at all.
      let aAvg: number | null = null
      let aStudents = 0
      if (accuracy.size > 0) {
        let wSum = 0
        let w = 0
        for (const part of parts) {
          const a = accuracy.get(part.id)
          if (!a) continue
          const weight = part.maxMarks ?? 1
          wSum += a.accuracy * weight
          w += weight
          aStudents = Math.max(aStudents, a.totalStudents)
        }
        if (w > 0) aAvg = wSum / w
      }
      return {
        id: first.id,
        q: `Q${num}`,
        title: first.questionText,
        chapter: pick((p) => p.chapterName) ?? '—',
        concept: pick((p) => p.concept) ?? '—',
        type: pick((p) => p.questionType) ?? '—',
        bloomTaxonomy: pick((p) => p.bloomTaxonomy) ?? '—',
        difficulty: pick((p) => p.difficultyLevel) ?? '—',
        avg: c?.accuracy != null ? Math.round(c.accuracy) : aAvg != null ? Math.round(aAvg) : 0,
        marks,
        totalStudents: c?.students ?? aStudents,
      }
    })
    .sort((a, b) => Number(a.q.slice(1)) - Number(b.q.slice(1)))
  return { exam: filters.exam, questions }
}

/**
 * Every exam of the cohort's selected academic year, one group each
 * (Teacher Metrics spec: the Questions page groups by exam, expandable).
 */
export async function fetchQuestionGroups(
  filters: AnalyticsFilters,
  examIds: string[],
): Promise<QuestionGroup[]> {
  const groups = await Promise.all(
    examIds.map((exam) => fetchQuestions({ ...filters, exam }).catch(() => ({ exam, questions: [] }))),
  )
  return groups.filter((g) => g.questions.length > 0)
}
