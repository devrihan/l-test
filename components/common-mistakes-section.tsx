'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MistakeCard } from '@/components/mistake-card'
import { cn } from '@/lib/utils'
import { useFeatureFlag } from '@/components/config-provider'

export interface MistakeLegendItem {
  label: string
  color: string
  /** relative bar-segment weight; segments split evenly when omitted */
  value?: number
}

export interface MistakeExample {
  student: string
  earned: number
  total: number
  description: string
  image: string
  count: number
}

export interface MistakeItem {
  id: string
  color: string
  title: string
  description: string
  /** chapter variant: question tags shown as "Seen in: Q1 Q5 …" */
  questions?: string[]
  /** question variant: expandable student evidence */
  example?: MistakeExample | null
  /** Real per-student evidence, so a caller can scope the drawer to one student. */
  evidences?: { imageUrl: string; student: string | null; marks: number | null; maxMarks: number | null }[]
}

export interface CommonMistakesTab {
  key: string
  label: string
  /** Shown, but not selectable — e.g. a comparison with only one exam so far. */
  disabled?: boolean
  legend: MistakeLegendItem[]
  items: MistakeItem[]
}

interface CommonMistakesSectionProps {
  title?: string
  subtitle?: string
  tabs: CommonMistakesTab[]
  /** 'chapter' renders flat MistakeCard rows; 'question' renders an expandable accordion with student evidence */
  variant?: 'chapter' | 'question'
  /** chapter variant only: makes each row clickable, e.g. to open a details sheet */
  onRowClick?: (item: MistakeItem) => void
  /** Rows this caller can actually open. Without it every row is clickable. */
  canOpenRow?: (item: MistakeItem) => boolean
  className?: string
}

function LegendAndBar({ legend }: { legend: MistakeLegendItem[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-6">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-[6px]">
            <div className="size-3 rounded-[4px] shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[14px] font-medium leading-[20px] tracking-[-0.084px] text-muted-foreground whitespace-nowrap">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <div className="flex h-4">
        {legend.map((item, i) => (
          <div
            key={item.label}
            className={`${
              i === 0
                ? 'rounded-l-lg'
                : i === legend.length - 1
                ? 'rounded-r-lg'
                : ''
            }`}
            style={{ backgroundColor: item.color, flex: item.value ?? 1 }}
          />
        ))}
      </div>
    </div>
  )
}

function QuestionMistakeCard({ item, defaultOpen = false }: { item: MistakeItem; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen && !!item.example)
  const [evidenceIndex, setEvidenceIndex] = useState(1)
  const showAddToPlan = useFeatureFlag('show_add_to_plan', false)
  // Diagnoses run to a few hundred characters, so the collapsed card clamps
  // them. Measure whether the clamp actually bit — the chevron should only
  // appear when it has something to reveal (the rest of the text, an example,
  // or the way back from an open card).
  const descRef = useRef<HTMLParagraphElement>(null)
  const [isClamped, setIsClamped] = useState(false)
  useEffect(() => {
    const el = descRef.current
    if (el && !isOpen) setIsClamped(el.scrollHeight > el.clientHeight + 1)
  }, [item.description, isOpen])
  const canExpand = isClamped || isOpen || !!item.example

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden shadow-sm">
      <div className="flex items-center gap-4 p-4">
        <div className="flex flex-1 gap-[6px] items-start min-w-0">
          <div className="flex items-center pt-[8px] shrink-0">
            <div className="size-3 rounded-[4px] shrink-0" style={{ backgroundColor: item.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-[18px] font-semibold leading-7 tracking-[-0.108px] text-foreground">
              {item.title}
            </p>
            <p
              ref={descRef}
              className={`text-[16px] font-normal leading-6 text-muted-foreground${
                isOpen ? '' : ' line-clamp-2'
              }`}
            >
              {item.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {showAddToPlan && (
          <button type="button" className="bg-background border border-border flex gap-2 h-9 items-center justify-center px-2 rounded-md">
            <PlusCircle className="size-4 shrink-0" />
            <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-foreground whitespace-nowrap">
              Add to plan
            </span>
          </button>
          )}
          {canExpand && (
            <button
              type="button"
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Show less' : 'Show full diagnosis'}
              onClick={() => setIsOpen((v) => !v)}
              className="p-1 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            >
              <ChevronDown className={`size-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {isOpen && item.example && (
        <>
          <div className="h-px bg-border" />
          <div className="bg-[#fafafa] flex gap-4 items-start">
            <div className="flex-1 min-w-0 flex flex-col gap-1 p-4">
              <div className="flex items-center gap-1 w-full">
                <p className="flex-1 text-[16px] font-semibold leading-6 text-foreground">{item.example.student}</p>
                <p className="text-[14px] font-normal leading-5 text-destructive shrink-0">
                  {item.example.earned}/{item.example.total} marks
                </p>
              </div>
              <p className="text-[16px] font-normal leading-6 text-muted-foreground">{item.example.description}</p>
            </div>
            <div className="flex-1 self-stretch min-h-[240px] p-4">
              <div className="h-full bg-[#f4f4f5] border border-border rounded-lg overflow-hidden">
                <img src={item.example.image} alt="Student answer" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-end gap-2 p-4">
            <button
              type="button"
              onClick={() => setEvidenceIndex((i) => Math.max(1, i - 1))}
              className="border border-border rounded-md p-2 hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[14px] font-medium leading-5 tracking-[-0.084px] text-foreground">
              {evidenceIndex}/{item.example.count}
            </span>
            <button
              type="button"
              onClick={() => setEvidenceIndex((i) => Math.min(item.example!.count, i + 1))}
              className="border border-border rounded-md p-2 hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function CommonMistakesSection({
  title = 'Common mistakes',
  subtitle,
  tabs,
  variant = 'chapter',
  onRowClick,
  canOpenRow,
  className,
}: CommonMistakesSectionProps) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key)
  const current = tabs.find((t) => t.key === activeTab) ?? tabs[0]

  return (
    <div className={cn('flex flex-col gap-6', className)}>

      {/* Header row: title + tabs (only shown when there's more than one) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-[2px]">
          <h2 className="text-[20px] font-medium leading-[28px] tracking-[-0.12px] text-foreground whitespace-nowrap">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[14px] font-normal leading-[20px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {tabs.length > 1 && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto group-data-[orientation=horizontal]/tabs:h-auto bg-secondary p-[4px] rounded-[6px] gap-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  disabled={tab.disabled}
                  title={tab.disabled ? 'Available once there is more than one exam to compare' : undefined}
                  className="h-auto text-[16px] leading-[24px] font-medium px-[12px] py-[8px] rounded-[4px] data-[state=active]:bg-background data-[state=active]:shadow-[0px_1px_1px_rgba(0,0,0,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      <LegendAndBar legend={current.legend} />

      {/* Mistake items — switches per tab */}
      <div className="flex flex-col gap-4">
        {current.items.map((item, i) =>
          variant === 'question' ? (
            <QuestionMistakeCard key={item.id} item={item} defaultOpen={i === 0} />
          ) : onRowClick && (canOpenRow?.(item) ?? true) ? (
            <div
              key={item.id}
              onClick={() => onRowClick(item)}
              className="cursor-pointer transition-opacity hover:opacity-80"
            >
              <MistakeCard
                color={item.color}
                title={item.title}
                description={item.description}
                questions={item.questions ?? []}
              />
            </div>
          ) : (
            <MistakeCard
              key={item.id}
              color={item.color}
              title={item.title}
              description={item.description}
              questions={item.questions ?? []}
            />
          )
        )}
      </div>

    </div>
  )
}
