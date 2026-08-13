"use client";

import { createContext, useContext } from "react";
import { dig, type JsonObject } from "@/app/lib/config-shared";
import { setExcludedAcademicYears } from "@/app/lib/filters";

// Carries the server-resolved feature_flags doc (see app/layout.tsx) down to
// client components. Values are snapshotted per render — a config change
// shows up on the next navigation/refresh, which is fine for product config.
// A component that must react without navigation can poll /api/config instead.

const ConfigContext = createContext<JsonObject>({});

export function ConfigProvider({
  value,
  excludedAcademicYears,
  children,
}: {
  value: JsonObject;
  // School-resolved academic_year_scope.excluded_years (app/layout.tsx). Pushed
  // into the sync filters helpers so every page's year/exam options and row
  // filters drop excluded years. Set synchronously here — the root provider
  // renders before any child data-fetch effect runs, and filters.ts already
  // holds a fail-safe default until then.
  excludedAcademicYears?: string[];
  children: React.ReactNode;
}) {
  if (excludedAcademicYears) setExcludedAcademicYears(excludedAcademicYears);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

/** The whole (school-resolved) feature_flags doc. */
export function useFeatureFlags(): JsonObject {
  return useContext(ConfigContext);
}

/** One flag by dotted path, e.g. useFeatureFlag("teacherView.dashboard.linechart", false). */
export function useFeatureFlag<T>(path: string, fallback: T): T {
  const v = dig(useContext(ConfigContext), path);
  return (v === undefined ? fallback : v) as T;
}
