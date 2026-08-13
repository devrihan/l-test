'use client'

import { useState } from 'react'
import { Eye, SlidersHorizontal } from 'lucide-react'
import { AnalysisChart } from './analysis-chart'
import { PerformanceTab } from './performance-tab'
import { AnalysisChapterTable } from './analysis-chapter-table'
import { useLoggedInStudent } from '@/app/lib/student-identity'
import type { AnalyticsFilters } from '@/app/lib/filters'
import type { CropStudentContext } from '@/app/lib/answer-crops'
import { useFeatureFlag } from '@/components/config-provider'

type PersonalChartTab = 'question' | 'chapter'

export function StudentAnalysisTab({ examCtx }: { examCtx?: AnalyticsFilters }) {
  // beaver#644 — student-role own analysis tab; hide the Question/PerformanceTab panel.
  const showQuestionPerformance = useFeatureFlag('show_question_performance_student_analysis_page', true)
  const [tab, setTab] = useState<PersonalChartTab>('question')
  const student = useLoggedInStudent()

  // The logged-in student's own scanned answers for this exam: who (grade/
  // section/roll) from the resolved identity, which exam (subject/exam) from
  // the exam context. Undefined until both resolve → PerformanceTab placeholder.
  const cropContext: CropStudentContext | undefined =
    student && examCtx
      ? {
          grade: student.grade ?? examCtx.grade,
          section: student.section ?? examCtx.section,
          subject: examCtx.subject,
          exam: examCtx.exam,
          roll: String(student.rollNumber),
          admissionNo: student.admissionNo,
        }
      : undefined

  return (
    <div className="mt-6 flex flex-col gap-6">
      <AnalysisChart
        tab={tab}
        onTabChange={(t) => setTab(t as PersonalChartTab)}
        variant="personal"
        personalContext={cropContext}
      />

      {tab === 'question' ? (
        showQuestionPerformance && <>
          {/* Section header — search/view/filter are static per Figma, not wired to the panel below */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-[2px]">
              <p className="text-[20px] font-semibold leading-7 tracking-[-0.12px] text-foreground whitespace-nowrap">
                Question
              </p>
              <p className="text-[18px] font-normal leading-7 tracking-[-0.108px] text-muted-foreground">
                Subtext
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-[259px] border border-border rounded-md bg-background flex items-center px-3">
                <input
                  type="text"
                  placeholder="Search"
                  className="flex-1 text-[14px] leading-5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <button className="h-8 px-3 flex items-center gap-2 border border-border rounded-md bg-background text-[12px] font-medium tracking-[-0.072px] text-foreground hover:bg-muted/50 transition-colors">
                <Eye className="size-4" />
                View
              </button>
              <button className="relative h-8 px-2 flex items-center justify-center border border-border rounded-md bg-background hover:bg-muted/50 transition-colors">
                <SlidersHorizontal className="size-5 text-foreground" />
                <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] font-semibold rounded-full size-4 flex items-center justify-center leading-none">
                  2
                </span>
              </button>
            </div>
          </div>

          <PerformanceTab showExamsFilter={false} cropContext={cropContext} />
        </>
      ) : (
        <AnalysisChapterTable
          context={examCtx}
          disableQuestionLinks
          variant="student"
          studentContext={cropContext}
        />
      )}
    </div>
  )
}
