import type { JsonObject } from "../config-shared";

// Baked-in floor for every config document loam reads — what the app stands
// on when config-manager is unreachable AND no disk snapshot exists (e.g.
// first boot of a fresh container, or a redeploy that raced config-manager).
// This is what every server process falls back to for its ENTIRE lifetime if
// its one boot-time fetch fails — so every flag here must fail SAFE (hidden),
// never fail open. Restarts are frequent (every deploy), so this floor is not
// a rare edge case; treat it as a real, regularly-hit state (beaver#675).
export const CONFIG_DEFAULTS: Record<string, JsonObject> = {
  // Academic years hidden from the whole dashboard (s418). Defaults to hiding
  // 2025-26 (prior-year annuals of the now-promoted cohort — they surface under
  // the wrong grade with broken >100% numbers). Fail-safe: if config-manager is
  // unreachable, the broken data stays hidden. Set excluded_years: [] in a
  // school's config to show everything again.
  academic_year_scope: {
    excluded_years: ["2025-26"],
  },
  feature_flags: {
    error_classification_chip: false,
    // beaver#566/569/572/575/577 — error classification isn't trustworthy yet;
    // these independently show/hide the teacher-role UI surfaces derived from
    // it. All default false (hidden) until a school's config explicitly opts
    // back in — a failed config fetch must never re-reveal these.
    show_remediation_table_exam_page: false,
    show_remediation_table_student_page: false,
    // Row clicks open the real detail page, not the (not-yet-trustworthy
    // error-classification) drawer. Defaults to navigation so it holds even when
    // school-scoped config doesn't resolve — matches config-stub.json's intent.
    route_to_detail_question_table: true,
    route_to_detail_chapter_table: true,
    route_to_detail_student_table: true,
    show_common_mistake_column_student_table: false,
    show_common_mistake_column_students_page: false,
    show_smart_cohorts_chapter_page: false,
    show_common_mistakes_chapter_page: false,
    show_common_mistakes_question_page: false,
    show_common_mistakes_student_page: false,
    show_common_mistakes_exam_page: false,
    show_answer_script_feedback_student_page: false,
    // beaver#643/644 — same show_*/hide pattern, but for the student role's
    // own login views (StudentDashboard, StudentExamDetail), which had no
    // flags at all until now.
    show_remediation_student_exam_page: false,
    show_common_mistakes_student_dashboard: false,
    show_question_performance_student_analysis_page: false,
    show_common_mistakes_student_exam_page: false,
    show_common_mistakes_student_chapter_page: false,
    // "Add to plan" CTAs (remediation drawers, mistake/cohort cards, the
    // question drawer): there is no plan-builder behind them yet, so every one
    // of them is a dead button. Hidden until the feature exists.
    show_add_to_plan: false,
    // Student-role sidebar — Questions nav item, hidden until a school opts in.
    show_questions_nav_student: false,
    // Teacher's per-student detail page — Performance tab, hidden until a
    // school opts in.
    show_performance_tab_student_detail_page: false,
  },
};
