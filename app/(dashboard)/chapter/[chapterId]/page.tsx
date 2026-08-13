'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchChapterDetail, type ChapterDetail } from '@/app/lib/chapter-detail'
import { fetchChapterStats, fetchConceptStats, fetchCropFilters } from '@/app/lib/answer-crops'
import type { GroupedBarSeries } from '@/components/status-chart-card'
import { fetchChapters } from '@/app/lib/chapters'
import { formatExamName } from '@/app/lib/filters'
import { CohortCard } from '@/components/cohort-card'
import { CommonMistakesSection } from '@/components/common-mistakes-section'
import { StatusChartCard } from '@/components/status-chart-card'
import { AnalysisDetailSheet, type AnalysisDetailData } from '@/components/analysis-detail-sheet'
import { BreadcrumbSwitcher } from '@/components/breadcrumb-switcher'
import { PrevNextNav } from '@/components/prev-next-nav'
import { useViewer, ViewerProvider } from '@/app/lib/viewer'
import { usePageBreadcrumb } from '@/app/lib/breadcrumb'
import { StudentChapterDetail } from '@/components/student-chapter-detail'
import { useFeatureFlag } from '@/components/config-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CellTooltip } from '@/components/cell-tooltip'
import LatexPreview from '@/components/latex-preview'

// ─── data ────────────────────────────────────────────────────────────────────

// Placeholder fallbacks (used only when the analytics endpoint has no data for
// the class). Real data comes from fetchChapterDetail — see TeacherChapterDetail.
const chapterHardcoded = {
  name: 'Three dimensional geometry',
  exams: 'Mid-term 1 · Unit test 1',
  questions: ['Q1', 'Q5', 'Q4'],
  status: 'Harder than expected',
  statusDescription:
    'Foundational gaps in Application of Derivatives have widened across exams - consider chapter-level reteach before Pre-Board 2.',
}

const questionDataHardcoded: Record<string, AnalysisDetailData> = {
  Q1: {
    title: 'Let R be a relation on the set N of natural numbers defined by nRm if n divides m, then R is A) reflexive and symmetric B) transitive and symmetric C) equivalence relation D) reflexive, transitive but not symmetric',
    subtitle: 'Chapter: Medium - Midpoint · Average: 37%',
    footerLabel: 'View question',
    accuracy: { description: '28 of 30 students scored full marks', pct: 30 },
    errorDescription: 'Skipped error: 75% of incorrect responses',
    errorSegments: [{ color: '#ffa940', pct: 50 }, { color: '#db6861', pct: 50 }],
    errorLegend: [
      { color: '#ffa940', label: 'Conceptual' },
      { color: '#db6861', label: 'Calculation' },
      { color: '#f1f5f9', label: 'Skipped' },
    ],
    bullets: [
      "Does not understand concept of equivalence as a check for symmetry would have proved it false",
      "Did not attempt - student likely does not understand equivalence relations",
    ],
  },
  Q5: {
    title: 'If f(x) = x² + 2x + 1, find f\'(x) and determine the critical points.',
    subtitle: 'Chapter: Easy - Derivatives · Average: 52%',
    footerLabel: 'View question',
    accuracy: { description: '22 of 30 students scored full marks', pct: 73 },
    errorDescription: 'Calculation error: 60% of incorrect responses',
    errorSegments: [{ color: '#ffa940', pct: 40 }, { color: '#db6861', pct: 60 }],
    errorLegend: [
      { color: '#ffa940', label: 'Conceptual' },
      { color: '#db6861', label: 'Calculation' },
      { color: '#f1f5f9', label: 'Skipped' },
    ],
    bullets: [
      "Students forgot to set f'(x) = 0 before finding critical points",
      "Sign error when expanding (x+1)² leading to wrong critical point",
    ],
  },
  Q4: {
    title: 'Find the volume of the solid obtained by rotating the region bounded by y = x² and y = x about the x-axis.',
    subtitle: 'Chapter: Hard - Integration · Average: 21%',
    footerLabel: 'View question',
    accuracy: { description: '8 of 30 students scored full marks', pct: 27 },
    errorDescription: 'Setup error: 80% of incorrect responses',
    errorSegments: [{ color: '#ffa940', pct: 65 }, { color: '#db6861', pct: 35 }],
    errorLegend: [
      { color: '#ffa940', label: 'Conceptual' },
      { color: '#db6861', label: 'Calculation' },
      { color: '#f1f5f9', label: 'Skipped' },
    ],
    bullets: [
      "Used wrong axis of rotation — rotated about y-axis instead of x-axis",
      "Did not subtract inner function squared from outer function squared in washer method",
    ],
  },
}

const chartData: { exam: string; score: number; avgMarks: number | null; maxMarks: number | null }[] = [
  { exam: 'Unit test', score: 32, avgMarks: null, maxMarks: null },
  { exam: 'Mid term1', score: 35, avgMarks: null, maxMarks: null },
  { exam: 'Mid term 2', score: 26, avgMarks: null, maxMarks: null },
  { exam: 'Sem 1', score: 28, avgMarks: null, maxMarks: null },
]

// Format "10" / "10.5" without a trailing ".0".
function fmtMarks(n: number): string {
  return String(Math.round(n * 10) / 10)
}

// "By concept" grouped-bar series colors, one per exam (from the Figma node).
const CONCEPT_EXAM_COLORS = ['#22d3ee', '#818cf8', '#c084fc', '#2dd4bf']

// "By concept" design placeholder — context-less preview ONLY. Under a real
// class context the chart shows /api/answer-crops/concept-stats data (or an
// honest empty state), never these.
const conceptSeries = [
  { key: 'exam1', label: 'Exam 1', color: CONCEPT_EXAM_COLORS[0] },
  { key: 'exam2', label: 'Exam 2', color: CONCEPT_EXAM_COLORS[1] },
  { key: 'exam3', label: 'Exam 3', color: CONCEPT_EXAM_COLORS[2] },
  { key: 'exam4', label: 'Exam 4', color: CONCEPT_EXAM_COLORS[3] },
]
const conceptDataHardcoded = [
  { label: 'Concept 1', exam1: 38, exam2: 27, exam3: 33, exam4: 41 },
  { label: 'Concept 2', exam1: 23, exam2: 46, exam3: 26, exam4: 50 },
  { label: 'Concept 3', exam1: 41, exam2: 27, exam3: 52, exam4: 19 },
  { label: 'Concept 4', exam1: 50, exam2: 18, exam3: 31, exam4: 25 },
  { label: 'Concept 5', exam1: 12, exam2: 53, exam3: 16, exam4: 27 },
]

const cohorts = [
  { id: 'foundational-gap',  title: 'Foundational Gap',         students: 'Anushka Sachan, Reshul Sharma', more: 2 },
  { id: 'inconsistent',      title: 'Inconsistent Performers',  students: 'Anushka Sachan, Reshul Sharma', more: 2 },
  { id: 'careless',          title: 'Careless Execution',       students: 'Anushka Sachan, Reshul Sharma', more: 2 },
  { id: 'avoiders',          title: 'Avoiders',                 students: 'Anushka Sachan, Reshul Sharma', more: 2 },
]

const mistakeLegend = [
  { label: 'Foundational gaps', color: '#16a34a' },
  { label: 'Mistakes in steps', color: '#3b82f6' },
  { label: 'Calculation',       color: '#ffa940' },
  { label: 'Reads wrong',       color: '#e76e4f' },
]

type MistakeType = 'foundational' | 'steps' | 'calculation' | 'reads'

const mistakeColors: Record<MistakeType, string> = {
  foundational: '#16a34a',
  steps:        '#3b82f6',
  calculation:  '#ffa940',
  reads:        '#e76e4f',
}

const mistakes: { id: string; type: MistakeType; title: string; description: string; questions: string[] }[] = [
  { id: 'm1', type: 'foundational', title: 'Confused critical point with optimum',  description: "Reported a critical point without verifying it's a max/min",               questions: ['Q1', 'Q5', 'Q4'] },
  { id: 'm2', type: 'foundational', title: 'Related rates: wrong chain',             description: 'Missed a chain rule step linking dx/dt and dy/dt',                         questions: ['Q1', 'Q5', 'Q4'] },
  { id: 'm3', type: 'foundational', title: 'Quotient rule arithmetic',               description: 'Made a sign or product error in quotient rule',                             questions: ['Q1', 'Q5', 'Q4'] },
  { id: 'm4', type: 'foundational', title: 'Misidentified the variable',             description: 'Differentiated w.r.t. wrong variable when problem had two parameters',     questions: ['Q1', 'Q5', 'Q4'] },
]

const compareLegend = [
  { label: 'Carried from class 11 (35%)', color: '#ffa940' },
  { label: 'New in class 12 (65%)',        color: '#e76e4f' },
]

const compareMistakes = [
  { id: 'c1', color: '#ffa940', title: 'Quotient rule arithmetic',          description: 'Made a sign or product error in quotient rule',                         questions: ['Q1', 'Q5', 'Q4'] },
  { id: 'c2', color: '#ffa940', title: "Didn't differentiate constraint",   description: 'Set up Lagrange-like reasoning informally without using',               questions: ['Q1', 'Q5', 'Q4'] },
  { id: 'c3', color: '#e76e4f', title: 'Wrong area/volume function setup',  description: 'Set up V or A in terms of wrong variable',                             questions: ['Q1', 'Q5', 'Q4'] },
  { id: 'c4', color: '#e76e4f', title: 'Confused critical point with optimum', description: "Reported a critical point without verifying it's a max/min",         questions: ['Q1', 'Q5', 'Q4'] },
]

const allChapters = [
  { id: '1',  name: 'Three dimensional geometry' },
  { id: '2',  name: 'Probability' },
  { id: '3',  name: 'Number Systems' },
  { id: '4',  name: 'Polynomials' },
  { id: '5',  name: 'Coordinate Geometry' },
  { id: '6',  name: 'Linear Equations in Two Variables' },
  { id: '7',  name: "Introduction to Euclid's Geometry" },
  { id: '8',  name: 'Lines and Angles' },
  { id: '9',  name: 'Triangles' },
  { id: '10', name: 'Quadrilaterals' },
  { id: '11', name: 'Areas of Parallelograms and Triangles' },
  { id: '12', name: 'Circles' },
]

// Chapter names come back in whatever case the source data used (e.g. all
// lowercase) — title-case each word for display, e.g. 'three dimensional
// geometry' -> 'Three Dimensional Geometry'.
function titleCaseChapterName(name: string): string {
  return name.split(' ').map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ChapterDetailPage({ params }: { params: Promise<{ chapterId: string }> }) {
  return (
    <ViewerProvider>
      <ChapterDetailDispatch params={params} />
    </ViewerProvider>
  )
}

function ChapterDetailDispatch({ params }: { params: Promise<{ chapterId: string }> }) {
  const { activeRole } = useViewer()
  if (activeRole === 'STUDENT') return <StudentChapterDetail params={params} />
  return <TeacherChapterDetail params={params} />
}

// Untouched below this line — original teacher chapter detail body, just
// renamed from the default export so this file can dispatch on role.
function TeacherChapterDetail({ params }: { params: Promise<{ chapterId: string }> }) {
  // beaver#575 — error-classification-derived; hide the whole section, titles included.
  const showSmartCohorts = useFeatureFlag('show_smart_cohorts_chapter_page', false)
  const showCommonMistakes = useFeatureFlag('show_common_mistakes_chapter_page', false)
  const router = useRouter()
  const { chapterId } = use(params)
  const searchParams = useSearchParams()
  const [questionSheet, setQuestionSheet] = useState<{ open: boolean; data: AnalysisDetailData | null }>({ open: false, data: null })

  // Real chapter analytics (incl. real question text) where available; the
  // route id is the chapter name, context comes from the chapter-list link.
  const [detail, setDetail] = useState<ChapterDetail | null>(null)
  // `detail === null` means both "still fetching" and "this chapter has no
  // analytics", and the card printed "No analytics yet" for both — so a slow
  // network was indistinguishable from an unanalysed chapter (beaver#786).
  // Keyed by chapterId so switching chapters reads as loading immediately
  // rather than showing the previous chapter's summary.
  const [detailLoadedFor, setDetailLoadedFor] = useState<string | null>(null)
  const detailLoading = detailLoadedFor !== chapterId
  const ctxChapterName = decodeURIComponent(chapterId)
  // 'All Exams' (beaver#574) omits the exam param so analytics aggregate across
  // exams; otherwise the view is scoped to the exam picked on the list page.
  const examAll = searchParams.get('examAll') === 'true'
  const ctxExam = searchParams.get('exam')
  useEffect(() => {
    let ignore = false
    fetchChapterDetail({
      grade: searchParams.get('grade') ?? '',
      chapterName: ctxChapterName,
      section: searchParams.get('section') ?? '',
      subject: searchParams.get('subject') ?? '',
      exam: examAll ? undefined : (ctxExam ?? undefined),
    })
      .then((d) => { if (!ignore) { setDetail(d); setDetailLoadedFor(chapterId) } })
      // A failure must end the loading state (and not surface as an unhandled
      // rejection) — the empty state is the honest fallback.
      .catch(() => { if (!ignore) { setDetail(null); setDetailLoadedFor(chapterId) } })
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])

  // A real class context means every block is real-or-empty — the Maths
  // placeholder only renders in context-less design preview.
  const hasCtx = Boolean(searchParams.get('grade') && searchParams.get('subject'))

  // Right panel (Teacher Metrics spec): chapter average per exam, from scanned
  // marks — one chapter-stats call per exam of the cohort; exams where this
  // chapter wasn't tested contribute no point.
  const [examTrend, setExamTrend] = useState<{ exam: string; score: number; avgMarks: number | null; maxMarks: number | null }[]>([])
  // "By section": this chapter's average in every OTHER section of the same
  // grade+subject, so a teacher can see whether a weak chapter is their class
  // or the whole cohort. One chapter-stats call per section.
  const [sectionTrend, setSectionTrend] = useState<
    { section: string; score: number; avgMarks: number | null; maxMarks: number | null }[]
  >([])
  // "By concept" grouped bars (Teacher Metrics By-Concept spec): section
  // average % per concept per exam of this chapter, from scanned marks via
  // /api/answer-crops/concept-stats. One row per concept, one series per exam;
  // each cell also carries the tooltip's "Class scored got/max" detail line.
  const [conceptChart, setConceptChart] = useState<{
    rows: Record<string, string | number>[]
    series: GroupedBarSeries[]
  }>({ rows: [], series: [] })
  // Same loading-vs-empty split for the two charts, which start as empty
  // arrays and would otherwise render as finished-but-empty results.
  const [chartsLoadedFor, setChartsLoadedFor] = useState<string | null>(null)
  const chartsLoading = hasCtx && chartsLoadedFor !== chapterId
  useEffect(() => {
    if (!hasCtx) return
    const grade = searchParams.get('grade') ?? ''
    const section = searchParams.get('section') ?? ''
    const subject = searchParams.get('subject') ?? ''
    let ignore = false
    fetchCropFilters()
      .then(async (combos) => {
        const exams = Array.from(
          new Set(
            combos
              .filter((c) => c.grade === grade && c.subject === subject && c.section === section)
              .map((c) => c.exam),
          ),
        )
        // Every section of this grade+subject, for the By Section tab. Each
        // section gets its own exam list — sections don't always sit the same
        // papers, and scoping them to this section's exams would silently
        // blank the ones that don't.
        const allSections = Array.from(
          new Set(combos.filter((c) => c.grade === grade && c.subject === subject).map((c) => c.section)),
        ).sort()

        const [points, conceptStats, sectionPoints] = await Promise.all([
          Promise.all(
            exams.map(async (exam) => {
              const stats = await fetchChapterStats({ grade, section, subject, exams: [exam] }).catch(() => [])
              const row = stats.find((c) => c.chapter.toLowerCase() === ctxChapterName.toLowerCase())
              return row && row.avgPct != null
                ? { exam: formatExamName(exam), score: row.avgPct, avgMarks: row.avgMarks, maxMarks: row.chapterMax }
                : null
            }),
          ),
          fetchConceptStats({ grade, section, subject, chapter: ctxChapterName }).catch(() => []),
          Promise.all(
            allSections.map(async (sec) => {
              const secExams = Array.from(
                new Set(
                  combos
                    .filter((c) => c.grade === grade && c.subject === subject && c.section === sec)
                    .map((c) => c.exam),
                ),
              )
              const stats = await fetchChapterStats({ grade, section: sec, subject, exams: secExams }).catch(() => [])
              const row = stats.find((c) => c.chapter.toLowerCase() === ctxChapterName.toLowerCase())
              return row && row.avgPct != null
                ? { section: sec, score: row.avgPct, avgMarks: row.avgMarks, maxMarks: row.chapterMax }
                : null
            }),
          ),
        ])
        if (ignore) return
        setSectionTrend(
          sectionPoints.filter(
            (x): x is { section: string; score: number; avgMarks: number | null; maxMarks: number | null } =>
              x !== null,
          ),
        )
        setExamTrend(
          points.filter(
            (x): x is { exam: string; score: number; avgMarks: number | null; maxMarks: number | null } => x !== null,
          ),
        )
        // Series = the exams that actually tested this chapter's concepts, in
        // the cohort's exam order; rows keep the backend's concept order
        // (first question number in the paper).
        const usable = conceptStats.filter((s) => s.avgPct != null)
        const orderOf = (e: string) => (exams.indexOf(e) === -1 ? exams.length : exams.indexOf(e))
        const examIds = Array.from(new Set(usable.map((s) => s.exam))).sort((a, b) => orderOf(a) - orderOf(b))
        const series = examIds.map((e, i) => ({
          key: `exam${i}`,
          label: formatExamName(e),
          color: CONCEPT_EXAM_COLORS[i % CONCEPT_EXAM_COLORS.length],
        }))
        const rowByConcept = new Map<string, Record<string, string | number>>()
        for (const s of usable) {
          const row = rowByConcept.get(s.concept) ?? { label: s.concept }
          const key = `exam${examIds.indexOf(s.exam)}`
          row[key] = s.avgPct as number
          if (s.avgMarks != null && s.conceptMax != null) {
            row[`${key}Detail`] =
              `This concept was worth ${fmtMarks(s.conceptMax)} marks on this exam. Sec ${section} scored ${fmtMarks(s.avgMarks)}/${fmtMarks(s.conceptMax)} on avg.`
          }
          rowByConcept.set(s.concept, row)
        }
        setConceptChart({ rows: Array.from(rowByConcept.values()), series })
        setChartsLoadedFor(chapterId)
      })
      .catch(() => { if (!ignore) setChartsLoadedFor(chapterId) })
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])

  // Real data when the analytics endpoint has this class; else an honest
  // empty state under a real context, else the design placeholder.
  const chapterName = titleCaseChapterName(detail?.name ?? ctxChapterName ?? allChapters[0].name)
  // Single exam selected -> its display name; 'All Exams' -> a rollup label.
  const examsLabel = examAll ? 'Across all Exams' : ctxExam ? formatExamName(ctxExam) : '—'
  // Spec: under 'All Exams' question numbers are hidden — chips are only
  // meaningful for a single exam's paper.
  const chapter = detail
    ? { name: detail.name, exams: examsLabel, questions: examAll ? [] : detail.questionTags, status: detail.status, statusDescription: detail.statusDescription }
    : hasCtx
      ? {
          name: ctxChapterName,
          exams: examsLabel,
          questions: [] as string[],
          ...(detailLoading
            ? { status: 'Loading…', statusDescription: '' }
            : {
                status: 'No analytics yet',
                statusDescription: 'Analytics for this chapter appear once the exam has been analysed.',
              }),
        }
      : chapterHardcoded
  const questionData = detail?.questionData ?? (hasCtx ? {} : questionDataHardcoded)
  const chartDataShown = hasCtx ? examTrend : chartData
  const section = searchParams.get('section') ?? ''
  const cohortsShown = hasCtx ? [] : cohorts
  const mistakesShown = hasCtx ? [] : mistakes
  const compareMistakesShown = hasCtx ? [] : compareMistakes

  // Chapter switcher: the real chapter list for this class (falls back to the
  // design's list without context). Selection keeps the class context.
  const [realChapters, setRealChapters] = useState<{ id: string; name: string }[]>([])
  useEffect(() => {
    if (!hasCtx) return
    let ignore = false
    fetchChapters({
      grade: searchParams.get('grade') ?? '',
      section: searchParams.get('section') ?? '',
      subject: searchParams.get('subject') ?? '',
      exam: searchParams.get('exam') ?? '',
    }).then((rows) => { if (!ignore) setRealChapters(rows.map((r) => ({ id: r.id, name: r.name }))) })
      .catch(() => {})
    return () => { ignore = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId])
  const switcherChapters = hasCtx && realChapters.length ? realChapters : allChapters

  // Prev/next across the same chapter list the breadcrumb dropdown offers;
  // disabled at the ends. Selection keeps the class context, like onSelect.
  const chapterIndex = switcherChapters.findIndex((ch) => ch.id === chapterId)
  const prevChapter = chapterIndex > 0 ? switcherChapters[chapterIndex - 1] : null
  const nextChapter =
    chapterIndex >= 0 && chapterIndex < switcherChapters.length - 1 ? switcherChapters[chapterIndex + 1] : null
  const goToChapter = (id: string) => router.push(`/chapter/${id}?${searchParams.toString()}`)

  usePageBreadcrumb(
    <BreadcrumbSwitcher
      parentLabel="Chapter"
      parentHref="/chapter"
      activeId={chapterId}
      activeLabel={chapterName}
      sectionLabel="Chapter names"
      searchable
      searchPlaceholder="Search chapters..."
      items={switcherChapters.map((ch) => ({ id: ch.id, label: titleCaseChapterName(ch.name) }))}
      onSelect={(id) => router.push(`/chapter/${id}?${searchParams.toString()}`)}
    />,
    [chapterId, chapterName, switcherChapters.length]
  )

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col">

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-6 pb-12 flex justify-center">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-[1280px] flex flex-col gap-4">

            {/* ── Title row ── */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 whitespace-nowrap">
                <h1 className="text-[24px] font-semibold leading-8 tracking-[-0.144px] text-black">
                  {chapterName}
                </h1>
                <p className="text-[16px] font-medium leading-6 text-muted-foreground">
                  {chapter.exams}
                </p>
              </div>
              <TooltipProvider delayDuration={300}>
                <div className="bg-background flex items-center gap-2 h-12 py-2 shrink-0">
                  {chapter.questions.map((q) => (
                    <CellTooltip
                      key={q}
                      content={
                        <span className="flex flex-col gap-1">
                          <span className="font-medium">{q}</span>
                          <LatexPreview text={questionData[q]?.title ?? 'Question text unavailable'} />
                        </span>
                      }
                    >
                      <div className="border border-border rounded-[6px] px-[10px] py-1 flex items-center justify-center shrink-0">
                        <span className="text-[18px] font-normal leading-7 tracking-[-0.108px] text-foreground whitespace-nowrap">
                          {q}
                        </span>
                      </div>
                    </CellTooltip>
                  ))}
                </div>
              </TooltipProvider>
            </div>

            {/* ── Status + Chart ── */}
            <StatusChartCard
              status={chapter.status}
              statusDescription={chapter.statusDescription}
              statusLabel="Summary"
              chartTabs={[
                {
                  key: 'exam',
                  label: 'By Exam',
                  chartTitle: examAll ? "This chapter's average across exams" : 'Chapter Average across Exams',
                  kind: 'line',
                  tooltipLabel: 'Chapter Avg',
                  legendLabel: examAll ? "This Chapter's Average score" : undefined,
                  data: chartDataShown.map((d) => ({
                    label: d.exam,
                    value: d.score,
                    detail:
                      d.maxMarks != null && d.avgMarks != null
                        ? `This chapter was worth ${fmtMarks(d.maxMarks)} marks on this exam. Sec ${section} scored ${fmtMarks(d.avgMarks)}/${fmtMarks(d.maxMarks)} on avg.`
                        : undefined,
                  })),
                  // Values are chapter-average percentages, so the y-axis runs
                  // 0-100% in 20% steps — not the 0-60 design default meant
                  // for mark-based charts.
                  yTicks: [0, 20, 40, 60, 80, 100],
                  valueSuffix: '%',
                  // Only while loading — once loaded, an empty set keeps
                  // rendering the bare chart as before.
                  emptyText: chartsLoading ? 'Loading…' : undefined,
                },
                {
                  key: 'concept',
                  label: 'By Concept',
                  chartTitle: ' Concept Breakdown for this Chapter',
                  kind: 'groupedBar',
                  data: [],
                  // Real class context: real concept-per-exam averages or an
                  // honest empty state — the design placeholder only renders
                  // in context-less preview.
                  groupedData: hasCtx ? conceptChart.rows : conceptDataHardcoded,
                  series: hasCtx ? conceptChart.series : conceptSeries,
                  // Per-bar tooltip (beaver#742): "[Concept] [Exam]" (no
                  // hyphen — teacher page only, student's own concept
                  // tooltip keeps the default separator) with a
                  // "Class Avg [value]%" row + detail line.
                  groupedTooltip: 'single',
                  groupedTooltipLabel: 'Class Avg',
                  groupedTooltipSeparator: ' ',
                  valueSuffix: '%',
                  // Spec: y-axis is section average percentage, 0-100%
                  yTicks: [0, 25, 50, 75, 100],
                  emptyText: chartsLoading
                    ? 'Loading…'
                    : hasCtx
                      ? 'No concept-level analytics for this chapter yet — they appear once its exams are scanned and marked.'
                      : undefined,
                  // Concept-level AI class copy (class_status_title_by_concept /
                  // class_status_description_by_concept); falls back to the
                  // card's chapter summary until populated.
                  status: detail?.statusByConcept?.title,
                  statusDescription: detail?.statusByConcept?.description,
                },
                {
                  key: 'section',
                  label: 'By Section',
                  chartTitle: "This chapter's average across sections",
                  kind: 'bar',
                  tooltipLabel: 'Chapter Avg',
                  data: sectionTrend.map((s) => ({
                    label: s.section,
                    // avgPct arrives as a raw float; without rounding the
                    // tooltip prints "62.80000000000001%".
                    value: Math.round(s.score),
                    detail:
                      s.avgMarks != null && s.maxMarks != null
                        ? `Sec ${s.section} scored ${fmtMarks(s.avgMarks)}/${fmtMarks(s.maxMarks)} on avg.`
                        : undefined,
                  })),
                  // Percentages, like the other two tabs — not the 0-60
                  // mark-based default.
                  yTicks: [0, 25, 50, 75, 100],
                  valueSuffix: '%',
                  // Sections can run into the twenties; scroll rather than
                  // squash them into slivers.
                  scrollable: true,
                  emptyText: chartsLoading
                    ? 'Loading…'
                    : hasCtx
                      ? 'No section-level analytics for this chapter yet — they appear once its exams are scanned and marked.'
                      : undefined,
                },
              ]}
            />

            <PrevNextNav
              className="mt-4"
              showLabels
              itemLabel="chapter"
              current={(chapterIndex < 0 ? 0 : chapterIndex) + 1}
              total={switcherChapters.length}
              prevTooltip={prevChapter ? titleCaseChapterName(prevChapter.name) : undefined}
              nextTooltip={nextChapter ? titleCaseChapterName(nextChapter.name) : undefined}
              onPrev={prevChapter && (() => goToChapter(prevChapter.id))}
              onNext={nextChapter && (() => goToChapter(nextChapter.id))}
            />

            {showSmartCohorts && cohortsShown.length > 0 && (
            <div className="flex flex-col gap-6 mt-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-[20px] font-medium leading-7 tracking-[-0.12px] text-foreground whitespace-nowrap">
                  Suggested to Recover Marks
                </h2>
                <p className="text-[14px] font-normal leading-5 text-muted-foreground">See suggested student groups for remediation</p>
              </div>
              <div className="grid grid-cols-4 gap-6">
                {cohortsShown.map((cohort) => (
                  <CohortCard
                    key={cohort.id}
                    title={cohort.title}
                    students={cohort.students}
                    moreCount={cohort.more}
                  />
                ))}
              </div>
            </div>
            )}

            {/* Empty for a real chapter until chapter-level mistakes have a
                source, and the flag is school-wide — so require content rather
                than rendering a titled empty section. */}
            {showCommonMistakes && (mistakesShown.length > 0 || compareMistakesShown.length > 0) && (
            <CommonMistakesSection
              className="mt-4"
              title="This Chapter’s Common Mistakes"
              subtitle="Revise based on common mistakes to recover marks"
              tabs={[
                {
                  key: 'mistakes',
                  label: 'Mistakes',
                  legend: mistakeLegend,
                  items: mistakesShown.map((m) => ({ ...m, color: mistakeColors[m.type] })),
                },
                {
                  key: 'compare',
                  label: 'Compare across exams',
                  // Cross-exam comparison needs a second exam; there is one so
                  // far, so the tab stays visible but is not selectable.
                  disabled: true,
                  legend: compareLegend,
                  items: compareMistakesShown,
                },
              ]}
            />
            )}

          </div>
        </div>
      </main>

      <AnalysisDetailSheet
        open={questionSheet.open}
        onClose={() => setQuestionSheet({ open: false, data: null })}
        data={questionSheet.data}
      />
    </div>
  )
}
