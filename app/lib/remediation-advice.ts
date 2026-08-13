/**
 * "What to practise" / "What to re-teach" derived from a chapter's dominant
 * error type.
 *
 * The remediation endpoint gives each chapter a `dominantError` — the most
 * frequent `question_errortype_summary.error_type_name` across its questions,
 * which is heron's classification of the answers themselves. These are the
 * eight types the taxonomy actually produces; the advice is per type, so a
 * chapter where students mostly misread the question no longer gets the same
 * sentence as one where the method itself is wrong (both previously read
 * "Re-practise the frequently-missed question types in this chapter.").
 *
 * Unknown or missing type -> null, and the caller shows the same em dash it
 * already shows for an unknown dominant error. Nothing is invented.
 */

type Advice = { practise: string; reteach: string }

const ADVICE: Record<string, Advice> = {
  conceptual: {
    practise: 'Revisit the underlying idea before attempting more sums — the method is failing because the concept is.',
    reteach: 'Re-teach this concept from first principles; the errors are in understanding, not execution.',
  },
  'procedural-syllabus': {
    practise: 'Drill the standard method for this chapter step by step, writing every step out.',
    reteach: 'Re-demonstrate the standard procedure, marking each step separately so lost steps show up.',
  },
  'procedural-background': {
    practise: 'Shore up the earlier-year technique this chapter depends on before practising the chapter itself.',
    reteach: 'Revise the prerequisite technique first — the gap is below this chapter, not in it.',
  },
  factual: {
    practise: 'Rehearse the formulas and standard values for this chapter until recall is exact.',
    reteach: 'Drill formula and definition recall; the working is sound once the right fact is used.',
  },
  comprehension: {
    practise: 'Read and underline exactly what each question asks before solving it.',
    reteach: 'Practise interpreting question wording — answers are correct for a different question.',
  },
  representational: {
    practise: 'Practise the diagrams, graphs and notation for this chapter, labelling everything.',
    reteach: 'Model correct notation and figures; the reasoning is being lost in how it is written.',
  },
  analytical: {
    practise: 'Practise working through every case and justifying each conclusion, not just the obvious one.',
    reteach: 'Model complete case analysis and proof structure; conclusions are being asserted, not shown.',
  },
  slip: {
    practise: 'Slow down and re-check the arithmetic — the method is right, the execution slips.',
    reteach: 'Build a checking habit into class work; these are careless losses, not gaps.',
  },
}

function lookup(dominantError: string | null | undefined): Advice | null {
  if (!dominantError) return null
  return ADVICE[dominantError.trim().toLowerCase()] ?? null
}

/** Student-facing action for a chapter. Null when the type is unknown. */
export function practiseFor(dominantError: string | null | undefined): string | null {
  return lookup(dominantError)?.practise ?? null
}

/** Teacher-facing action for a chapter. Null when the type is unknown. */
export function reteachFor(dominantError: string | null | undefined): string | null {
  return lookup(dominantError)?.reteach ?? null
}
