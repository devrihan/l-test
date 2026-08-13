'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, AlertTriangle, CheckCircle, Maximize2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { fetchAnswerCrops, wholeQuestionMax, type CropStudentContext } from '@/app/lib/answer-crops'
import { fetchAnswerKey, fetchPaperQuestions, type AnswerKey } from '@/app/lib/questions'
import { fetchStudentAnswerErrors } from '@/app/lib/students'
import { practiseFor } from '@/app/lib/remediation-advice'
import { formatExamName } from '@/app/lib/filters'
import LatexPreview from '@/components/latex-preview'


/**
 * Why these two can be null rather than a string.
 *
 * They used to be the literal '—' for every crop, on every question, for every
 * student — the panels were built from the placeholder design and never wired.
 * A dash reads as "we looked and found nothing", which is a claim about the
 * student's work; the truth is usually that the answer was never classified at
 * all (the run skips MCQs, full marks and answers with no OCR text, and most
 * sections have never had a run).
 *
 * null means "no diagnosis for this answer" and the panel is not rendered.
 * Saying nothing is honest; a dash is not.
 */
interface QuestionListItem {
  id: string
  label: string
  exam: string
  marks: string
  question: string
  goingWrong: string | null
  nextPractise: string | null
  imageUrl?: string // real scanned-answer crop (R2), when available
  images?: string[] // all crop regions for this answer (pager cycles them)
  chapter?: string
  marksNum?: number
  maxNum?: number
  keyIds?: number[] // paper sub-question ids — source for the answer key
  fallbackAnswer?: string | null // paper answer_key/ai_answer text
}

const questions: QuestionListItem[] = [
  { id: 'q1a',  label: 'Q 1 (a)',  exam: 'Exam 1', marks: '1/4 Marks', question: "(a). Read the following text carefully and answer the questions that follow: A manufacture has three machine operators A, Band C. The first operator A produces 1% of defective items, whereas the other two operators B and C produces 5% and 7% defective items respectively.", goingWrong: 'Silly mistakes on easy MCQs that most of the class got right.', nextPractise: 'Solve MCQs in timed sets; recheck every option before moving on.' },
  { id: 'q21b', label: 'Q 21 (b)', exam: 'Exam 1', marks: '2/4 Marks', question: 'Knows the method, but is not spotting the standard form of the differential equation.', goingWrong: 'Knows the method, but is not spotting the standard form.', nextPractise: 'Drill variable separable and linear DE sums, NCERT first, then PYQs.' },
  { id: 'q13a', label: 'Q 13',     exam: 'Exam 1', marks: '3/5 Marks', question: 'Calculation and step slips in attempted integration sums.', goingWrong: 'Calculation and step slips in attempted sums.', nextPractise: 'Practise substitution and by-parts sums from the exact wrong types.' },
  { id: 'q14a', label: 'Q 14 (a)', exam: 'Exam 1', marks: '1/4 Marks', question: 'Setup mistake while forming the area under the curve.', goingWrong: 'Setup mistake while forming the area under the curve.', nextPractise: 'Redo area-under-curve sums; draw the figure before integrating.' },
  { id: 'q8',   label: 'Q 8',      exam: 'Exam 1', marks: '4/5 Marks', question: 'Step and calculation mistakes in cofactor and properties.', goingWrong: 'Step and calculation mistakes in cofactor and properties.', nextPractise: 'Practise cofactor expansion and property-based sums.' },
  { id: 'q9b',  label: 'Q 9 (b)',  exam: 'Exam 1', marks: '2/4 Marks', question: 'Skipping method steps and losing step marks.', goingWrong: 'Skipping method steps and losing step marks.', nextPractise: 'Solve while writing every step; practise from NCERT before timed sets.' },
  { id: 'q10',  label: 'Q 10',     exam: 'Exam 1', marks: '3/4 Marks', question: 'Silly mistakes on easy MCQs that most of the class got right.', goingWrong: 'Silly mistakes on easy MCQs that most of the class got right.', nextPractise: 'Solve MCQs in timed sets; recheck every option before moving on.' },
  { id: 'q11',  label: 'Q 11',     exam: 'Exam 1', marks: '1/4 Marks', question: 'Knows the method, but is not spotting the standard form.', goingWrong: 'Knows the method, but is not spotting the standard form.', nextPractise: 'Drill variable separable and linear DE sums, NCERT first, then PYQs.' },
  { id: 'q12',  label: 'Q 12',     exam: 'Exam 1', marks: '4/4 Marks', question: 'Calculation and step slips in attempted sums.', goingWrong: 'Calculation and step slips in attempted sums.', nextPractise: 'Practise substitution and by-parts sums from the exact wrong types.' },
  { id: 'q13b', label: 'Q 13',     exam: 'Exam 1', marks: '2/5 Marks', question: 'Setup mistake while forming the area under the curve.', goingWrong: 'Setup mistake while forming the area under the curve.', nextPractise: 'Redo area-under-curve sums; draw the figure before integrating.' },
  { id: 'q14b', label: 'Q 14',     exam: 'Exam 1', marks: '3/4 Marks', question: 'Step and calculation mistakes in cofactor and properties.', goingWrong: 'Step and calculation mistakes in cofactor and properties.', nextPractise: 'Practise cofactor expansion and property-based sums.' },
  { id: 'q15',  label: 'Q 15',     exam: 'Exam 1', marks: '1/4 Marks', question: 'Skipping method steps and losing step marks.', goingWrong: 'Skipping method steps and losing step marks.', nextPractise: 'Solve while writing every step; practise from NCERT before timed sets.' },
  { id: 'q16',  label: 'Q 16',     exam: 'Exam 1', marks: '4/4 Marks', question: 'Silly mistakes on easy MCQs that most of the class got right.', goingWrong: 'Silly mistakes on easy MCQs that most of the class got right.', nextPractise: 'Solve MCQs in timed sets; recheck every option before moving on.' },
]

const filterTriggerClass =
  'h-auto py-2 pl-3 pr-3 rounded-md gap-1 text-[16px] leading-6 border-input [&_svg:last-child]:size-4 [&_svg:last-child]:opacity-100 bg-white'

function FilterSelect({ label, defaultValue, options, value, onChange }: {
  label: string; defaultValue: string; options: string[]
  value?: string; onChange?: (v: string) => void
}) {
  return (
    <Select defaultValue={defaultValue} value={value} onValueChange={onChange}>
      <SelectTrigger className={filterTriggerClass}>
        <span className="text-foreground font-normal">{label}:</span>
        <span className="font-medium text-foreground">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function PerformanceTab({
  showExamsFilter = true,
  className,
  cropContext,
  // beaver#577 (teacher-role only — caller-controlled, not a hook here, since
  // this component is also used by student self-view pages that must be
  // unaffected): hide "Going wrong"/"Next practise" until error classification
  // is trustworthy.
  showAnswerScriptFeedback = true,
  // beaver#674 — pre-select a question (e.g. arriving from the chapter page's
  // question badges) instead of always defaulting to the first item. Matched
  // against each item's label, ignoring whitespace ("Q20" ~ "Q 20").
  initialQuestionLabel,
}: {
  showExamsFilter?: boolean
  className?: string
  // When provided, the panel shows this student's real scanned-answer crops
  // (from /api/answer-crops) instead of the placeholder design.
  cropContext?: CropStudentContext
  showAnswerScriptFeedback?: boolean
  initialQuestionLabel?: string
}) {
  const [cropItems, setCropItems] = useState<QuestionListItem[] | null>(null)

  useEffect(() => {
    if (!cropContext) {
      setCropItems(null)
      return
    }
    let ignore = false
    // Crops (image + marks) + the real question text from the paper + this
    // student's own error classification, all joined by question number.
    Promise.all([
      fetchAnswerCrops(cropContext),
      fetchPaperQuestions({
        grade: cropContext.grade,
        section: cropContext.section,
        subject: cropContext.subject,
        exam: cropContext.exam,
      }).catch(() => []),
      // The per-answer diagnosis behind "Going wrong". Returns [] for a
      // student whose section has never been through a classification run,
      // which is the normal state for most sections — the panels then simply
      // do not render.
      fetchStudentAnswerErrors(
        {
          grade: cropContext.grade,
          section: cropContext.section,
          subject: cropContext.subject,
          exam: cropContext.exam,
        },
        { roll: cropContext.roll, admissionNo: cropContext.admissionNo },
      ).catch(() => []),
    ])
      .then(([crops, paper, errors]) => {
        if (ignore) return
        // Diagnosis by WHOLE question number. `clean` is dropped — it means the
        // run looked and found nothing wrong, so there is nothing to say.
        // `uncoded_error` is kept: no code fitted, but whatWentWrong is real.
        //
        // Classifications are per SUB-PART (18.1, 18.2) while the list has one
        // item per whole question, so a question can have several. They are all
        // kept and joined: showing only the first would silently drop half of
        // what a student got wrong on a 5-mark question.
        const errsByNum = new Map<number, typeof errors>()
        for (const e of errors) {
          if (e.verdict === 'clean') continue
          const n = Math.trunc(e.questionNumber)
          errsByNum.set(n, [...(errsByNum.get(n) ?? []), e])
        }
        for (const list of errsByNum.values()) list.sort((a, b) => a.questionNumber - b.questionNumber)
        const diagnosisFor = (n: number | null | undefined): string | null => {
          if (n == null) return null
          const list = errsByNum.get(n)
          if (!list?.length) return null
          const seen = new Set<string>()
          const parts: string[] = []
          for (const e of list) {
            const t = e.whatWentWrong?.trim()
            if (!t || seen.has(t)) continue
            seen.add(t)
            parts.push(/[.!?]$/.test(t) ? t : `${t}.`)
          }
          return parts.length ? parts.join(' ') : null
        }
        // Advice comes from the error TYPE, so an answer faulted without a code
        // (uncoded_error) gets a diagnosis but no advice — the honest split.
        const practiseForNum = (n: number | null | undefined): string | null => {
          if (n == null) return null
          for (const e of errsByNum.get(n) ?? []) {
            const p = practiseFor(e.errorTypeName)
            if (p) return p
          }
          return null
        }
        const textByNum = new Map<number, string>()
        const chapterByNum = new Map<number, string>()
        const idsByNum = new Map<number, number[]>()
        const keyTextByNum = new Map<number, string>()
        for (const p of paper) {
          const key = Math.trunc(p.questionNumber)
          if (!textByNum.has(key)) textByNum.set(key, p.questionText)
          if (p.chapterName && !chapterByNum.has(key)) chapterByNum.set(key, p.chapterName)
          idsByNum.set(key, [...(idsByNum.get(key) ?? []), p.id])
          // blank strings are 'no key' — the paper text fields are often
          // present-but-empty; only real content may enable the CTA
          const keyText = p.answerKey?.trim() || p.aiAnswer?.trim() || null
          if (keyText && !keyTextByNum.has(key)) keyTextByNum.set(key, keyText)
        }
        // One list item per QUESTION: an answer often spans several crop
        // regions (multiple bbox rows) — the "Student answer" pager cycles
        // through them instead of repeating the question in the list.
        const byQuestion = new Map<string, typeof crops>()
        for (const c of crops) {
          const key = String(c.questionNumber ?? c.questionKey)
          const bucket = byQuestion.get(key) ?? []
          bucket.push(c)
          byQuestion.set(key, bucket)
        }
        const items: QuestionListItem[] = Array.from(byQuestion.entries()).map(([q, group]) => {
          const best = group.reduce((a, b) => ((b.marks ?? -1) > (a.marks ?? -1) ? b : a), group[0])
          const m = best.marks ?? 0
          // whole-question attemptable max (handles the per-sub-part bbox
          // convention — a single row's max can be one part's max only)
          const mm = wholeQuestionMax(group) ?? best.maxMarks ?? 0
          const num = best.questionNumber
          const realText = num != null ? textByNum.get(num) : undefined
          const images = Array.from(new Set(group.map((c) => c.croppedImageUrl).filter(Boolean) as string[]))
          return {
            id: `crop-${q}`,
            label: `Q ${q}`,
            exam: formatExamName(cropContext.exam),
            marks: `${m}/${mm} Marks`,
            question: realText ?? `Scanned answer for question ${q}.`,
            goingWrong: diagnosisFor(num),
            nextPractise: practiseForNum(num),
            imageUrl: images[0],
            images,
            chapter: num != null ? chapterByNum.get(num) : undefined,
            marksNum: best.marks ?? undefined,
            maxNum: mm > 0 ? mm : undefined,
            keyIds: num != null ? idsByNum.get(num) : undefined,
            fallbackAnswer: num != null ? keyTextByNum.get(num) ?? null : null,
          }
        })
        setCropItems(items)
      })
      .catch(() => {
        if (!ignore) setCropItems([]) // failed/none → fall back to placeholder
      })
    return () => {
      ignore = true
    }
  }, [cropContext])

  // 'View answer key' dialog: the question's answer key (all sub-parts) fetched on
  // demand — image/MCQ/clean text per part, with the paper's answer_key /
  // ai_answer text as fallback.
  const [answerOpen, setAnswerOpen] = useState(false)
  const [answerParts, setAnswerParts] = useState<AnswerKey[] | null>(null)
  const [answerLoading, setAnswerLoading] = useState(false)
  async function openAnswer(item: QuestionListItem) {
    setAnswerOpen(true)
    setAnswerLoading(true)
    const keys = item.keyIds?.length
      ? (await Promise.all(item.keyIds.map((id) => fetchAnswerKey(id).catch(() => null)))).filter(
          (k): k is AnswerKey => k !== null && Boolean(k.croppedImageUrl || k.cleanText || k.ocrText || k.mcqChoice),
        )
      : []
    setAnswerParts(keys)
    setAnswerLoading(false)
  }

  // Use real crops when we have them; otherwise the original placeholder design.
  const real = cropItems != null && cropItems.length > 0
  const baseItems = real ? cropItems : questions

  // Filters: real, functional options when showing real crops; the design's
  // static options only in placeholder mode.
  const [chapterFilter, setChapterFilter] = useState('All')
  const [scoredFilter, setScoredFilter] = useState('Select')
  const [sortOrder, setSortOrder] = useState('Select')
  const chapterOptions = real
    ? ['All', ...Array.from(new Set(baseItems.map((i) => i.chapter).filter(Boolean) as string[])).sort()]
    : ['All', 'Probability', 'Integration']
  let items = baseItems
  if (real) {
    if (chapterFilter !== 'All') items = items.filter((i) => i.chapter === chapterFilter)
    if (scoredFilter === 'Full marks') items = items.filter((i) => i.marksNum != null && i.maxNum != null && i.marksNum >= i.maxNum)
    if (scoredFilter === 'Zero marks') items = items.filter((i) => (i.marksNum ?? 0) === 0)
    if (scoredFilter === 'Partial marks') items = items.filter((i) => i.marksNum != null && i.maxNum != null && i.marksNum > 0 && i.marksNum < i.maxNum)
    items = [...items].sort((a, b) => {
      if (sortOrder === 'Marks: high-low') return (b.marksNum ?? 0) - (a.marksNum ?? 0)
      if (sortOrder === 'Marks: low-high') return (a.marksNum ?? 0) - (b.marksNum ?? 0)
      // 'Select' (default): question-paper order, parsed from the label ("Q 9" -> 9).
      const numOf = (i: QuestionListItem) => parseFloat(i.label.replace(/^Q\s*/, '')) || 0
      return numOf(a) - numOf(b)
    })
    if (items.length === 0) items = baseItems
  }

  const [activeId, setActiveId] = useState(items[0].id)
  const [sheetIndex, setSheetIndex] = useState(1)
  const [imageExpanded, setImageExpanded] = useState(false)

  // Keep the selection valid when the item list swaps (mock <-> real crops).
  useEffect(() => {
    if (!items.some((q) => q.id === activeId)) {
      setActiveId(items[0].id)
      setSheetIndex(1)
    }
  }, [items, activeId])

  // Apply the caller-requested initial question once the real item list has
  // settled (crops loaded, or there's no cropContext so it never will be).
  const itemsSettled = !cropContext || cropItems !== null
  const [appliedInitial, setAppliedInitial] = useState(false)
  useEffect(() => {
    if (appliedInitial || !initialQuestionLabel || !itemsSettled || items.length === 0) return
    const norm = (s: string) => s.replace(/\s+/g, '').toUpperCase()
    const match = items.find((q) => norm(q.label) === norm(initialQuestionLabel))
    if (match) {
      setActiveId(match.id)
      setSheetIndex(1)
    }
    setAppliedInitial(true)
  }, [itemsSettled, items, initialQuestionLabel, appliedInitial])

  const active = items.find((q) => q.id === activeId) ?? items[0]
  const activeIndex = items.findIndex((q) => q.id === activeId)
  // Real mode with a crop that has no scan image: show an honest empty panel
  // (the Figma stand-in would read as a fake answer sheet). Placeholder image
  // only in design-preview mode.
  const sheetCount = real ? Math.max(1, active.images?.length ?? 0) : 0
  // No Figma stand-in: an answer sheet the student never wrote reads as real.
  const activeImage = real ? active.images?.[Math.min(sheetIndex, sheetCount) - 1] : undefined
  // Which src has finished loading. Derived rather than reset in an effect, so
  // changing question shows the loader on the very same render.
  const [loadedImage, setLoadedImage] = useState<string | undefined>(undefined)
  const imageLoading = !!activeImage && loadedImage !== activeImage

  function goToNext() {
    const next = items[(activeIndex + 1) % items.length]
    setActiveId(next.id)
    setSheetIndex(1)
  }

  // `cropItems` is null both before the fetch resolves and when there is no
  // crop context at all, and `real` false falls back to the DESIGN PLACEHOLDER
  // question list. With a context that means a student watches a list of
  // invented questions and marks until their own crops land — worse than an
  // empty panel, because it looks like real work of theirs (beaver#786). The
  // placeholder stays for context-less design preview, which is what it's for.
  // Placed after every hook so the hook order never changes between renders.
  const cropsLoading = Boolean(cropContext) && cropItems === null
  if (cropsLoading) {
    return (
      <div className={cn('mt-4 border border-border rounded-2xl bg-background flex flex-col h-[640px] overflow-hidden', className)}>
        <div className="h-16 px-4 flex items-center border-b border-border shrink-0">
          <p className="text-[20px] font-semibold leading-7 tracking-[-0.12px] text-foreground">Questions</p>
        </div>
        <div role="status" className="flex-1 flex items-center justify-center text-[14px] text-muted-foreground">
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className={cn('mt-4 border border-border rounded-2xl bg-background flex flex-col h-[640px] overflow-hidden', className)}>

      {/* Header: title + filters */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-border shrink-0">
        <p className="flex-1 min-w-0 text-[20px] font-semibold leading-7 tracking-[-0.12px] text-foreground">
          Questions
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {showExamsFilter && (
            <FilterSelect
              label="Exams"
              defaultValue={formatExamName(cropContext?.exam)}
              options={[formatExamName(cropContext?.exam)]}
              value={formatExamName(cropContext?.exam)}
            />
          )}
          <FilterSelect label="Chapters" defaultValue="All" options={chapterOptions} value={real ? chapterFilter : undefined} onChange={real ? setChapterFilter : undefined} />
          {/* Mistake filter needs per-student error analytics (heron student-level) — hidden until that exists. */}
          {!real && (
            <FilterSelect label="Mistake" defaultValue="All" options={['All', 'Foundational gaps', 'Mistakes in steps']} />
          )}
          <FilterSelect label="Scored" defaultValue="Select" options={['Select', 'Full marks', 'Partial marks', 'Zero marks']} value={real ? scoredFilter : undefined} onChange={real ? setScoredFilter : undefined} />
          <FilterSelect label="Sort" defaultValue="Select" options={['Select', 'Marks: low-high', 'Marks: high-low']} value={real ? sortOrder : undefined} onChange={real ? setSortOrder : undefined} />
        </div>
      </div>

      <div className="flex flex-1 min-h-0 w-full">

        {/* Left: question list */}
        <div className="w-[120px] shrink-0 border-r border-border h-full overflow-y-auto">
          {items.map((q) => {
            const isActive = q.id === activeId
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => { setActiveId(q.id); setSheetIndex(1) }}
                className={`flex flex-col w-full px-4 py-4 border-b border-border text-left ${
                  isActive ? 'bg-[#f4f4f5] border-l-4 border-l-popover-foreground' : 'hover:bg-muted/40'
                }`}
              >
                <span className="text-[16px] font-medium leading-6 text-foreground whitespace-nowrap">{q.label}</span>
              </button>
            )
          })}
        </div>

        {/* Middle: response sheet image */}
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-[10px]">
          <div className="flex items-center gap-[10px] w-full">
            <p className="flex-1 min-w-0 text-[18px] font-medium leading-7 tracking-[-0.108px] text-foreground">
              Student answer
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSheetIndex((i) => Math.max(1, i - 1))}
                className="border border-border rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-foreground">{Math.min(sheetIndex, sheetCount)}/{sheetCount}</span>
              <button
                type="button"
                onClick={() => setSheetIndex((i) => Math.min(sheetCount, i + 1))}
                className="border border-border rounded-md p-2 hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          <div className={cn('relative flex-1 min-h-0 rounded-lg overflow-hidden border border-border', activeImage ? 'bg-black' : 'bg-white')}>
            {activeImage ? (
              <>
                <img
                  src={activeImage}
                  alt="Student answer"
                  // Hidden until THIS src has loaded. Without it the browser
                  // keeps painting the previous answer while the next one
                  // downloads, so switching question looks like nothing changed.
                  onLoad={() => setLoadedImage(activeImage)}
                  // Settle on error too, or a broken crop spins forever.
                  onError={() => setLoadedImage(activeImage)}
                  className={cn(
                    'w-full h-full object-contain transition-opacity duration-150',
                    imageLoading && 'opacity-0',
                  )}
                />
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background">
                    <Spinner className="size-6 text-muted-foreground" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6">
                <img src="/illustrations/no-answer-found.svg" alt="" className="w-[226px] h-auto" />
                <div className="flex flex-col items-center gap-1 text-center text-foreground/70">
                  <p className="text-[18px] font-semibold leading-7 tracking-[-0.108px]">No answer found</p>
                  <p className="text-[16px] font-medium leading-6">
                    This happens when the student did not attempt the question and left it blank
                  </p>
                </div>
              </div>
            )}
            {activeImage && (
              <button
                type="button"
                onClick={() => setImageExpanded(true)}
                className="absolute bottom-4 right-3.5 flex items-center gap-2 bg-[#3f3f46] text-white text-[12px] font-medium leading-4 tracking-[-0.072px] px-1.5 py-1.5 rounded hover:bg-[#52525b] transition-colors"
              >
                <Maximize2 className="size-4" />
                Click to expand
              </button>
            )}
          </div>
        </div>

        <Dialog open={answerOpen} onOpenChange={setAnswerOpen}>
          <DialogContent className="max-w-2xl">
            <DialogTitle>Answer key · {active.label}</DialogTitle>
            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              {answerLoading && <p className="text-base text-muted-foreground">Loading answer key…</p>}
              {!answerLoading && answerParts?.map((k, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {answerParts.length > 1 && (
                    <p className="text-sm font-medium text-muted-foreground">Part {i + 1}</p>
                  )}
                  {k.croppedImageUrl && (
                    <div className="bg-[#f4f4f5] border border-border rounded-lg overflow-hidden">
                      <img src={k.croppedImageUrl} alt="Answer key" className="w-full object-contain" />
                    </div>
                  )}
                  {k.mcqChoice && (
                    <p className="text-base font-medium leading-6 text-foreground">Correct option: {k.mcqChoice}</p>
                  )}
                  {(k.cleanText || k.ocrText) && (
                    <div className="text-base font-normal leading-7 text-foreground">
                      <LatexPreview text={k.cleanText ?? k.ocrText ?? undefined} />
                    </div>
                  )}
                </div>
              ))}
              {!answerLoading && !answerParts?.length && active.fallbackAnswer && (
                <div className="text-base font-normal leading-7 text-foreground">
                  <LatexPreview text={active.fallbackAnswer} />
                </div>
              )}
              {!answerLoading && !answerParts?.length && !active.fallbackAnswer && (
                <p className="text-base text-muted-foreground">No answer key available for this question.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
          <DialogContent className="max-w-[90vw] sm:max-w-[90vw] p-2 bg-black border-none">
            <DialogTitle className="sr-only">Student answer</DialogTitle>
            {activeImage && (
              <img src={activeImage} alt="Student answer" className="w-full max-h-[85vh] object-contain" />
            )}
          </DialogContent>
        </Dialog>

        {/* Right: question detail card */}
        <div className="w-[380px] shrink-0 border-l border-border shadow-sm flex flex-col h-full">
          <div className="flex-1 min-h-0 overflow-y-auto px-4">
            <div className="flex flex-col gap-3 pb-6">
              <div className="pt-4 flex flex-col gap-2">
                <div className="flex items-center gap-px w-full">
                  <p className="flex-1 min-w-0 text-[16px] font-medium leading-6 text-foreground">Question</p>
                  <p className="text-[16px] font-normal leading-6 text-foreground whitespace-nowrap">{active.marks}</p>
                </div>
                <div className="min-w-0 text-[14px] font-normal leading-5 text-foreground overflow-x-auto">
                  <LatexPreview text={active.question} />
                </div>
                {(active.keyIds?.length || active.fallbackAnswer) ? (
                  <button type="button" onClick={() => openAnswer(active)} className="flex items-center gap-1 w-fit">
                    <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-[#008a2e]">View answer key</span>
                    <ArrowRight className="size-4 text-[#008a2e]" />
                  </button>
                ) : (
                  <button type="button" disabled className="flex items-center gap-1 w-fit opacity-50 cursor-default">
                    <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-muted-foreground">No answer key yet</span>
                  </button>
                )}
              </div>
              {/* Each panel stands on its own: an answer can carry a diagnosis
                  with no practice advice (uncoded_error), and a panel with
                  nothing in it is worse than no panel. */}
              {showAnswerScriptFeedback && active.goingWrong && (
                <div className="bg-[#fff0f0] border border-[#ffe0e1] rounded-lg p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="size-4 text-[#e76e4f] shrink-0" />
                    <span className="text-[16px] font-medium leading-6 text-[#e76e4f]">Going wrong</span>
                  </div>
                  <p className="text-[16px] font-medium leading-6 text-foreground">{active.goingWrong}</p>
                </div>
              )}
              {showAnswerScriptFeedback && active.nextPractise && (
                <div className="bg-[#ecfdf2] border border-[#d3fde5] rounded-lg p-4 flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="size-4 text-[#008a2e] shrink-0" />
                    <span className="text-[16px] font-medium leading-6 text-[#008a2e]">Next practise</span>
                  </div>
                  <p className="text-[16px] font-medium leading-6 text-foreground">{active.nextPractise}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border p-4 flex items-center justify-end shrink-0">
            <Button variant="outline" size="sm" className="gap-2 h-9 text-[14px] font-medium" onClick={goToNext}>
              Next question
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
