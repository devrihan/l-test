// Shared between server config cache and the client ConfigProvider —
// no server-only imports allowed here.

export type JsonObject = Record<string, unknown>;

export function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Read a dotted path ("teacherView.dashboard.linechart") out of a doc. */
export function dig(doc: JsonObject | undefined, path: string): unknown {
  let cur: unknown = doc;
  for (const part of path.split(".")) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Deep-merge override into base (objects merge recursively, anything else replaces). */
export function deepMerge(base: JsonObject, override: JsonObject): JsonObject {
  const out: JsonObject = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    out[k] = isPlainObject(b) && isPlainObject(v) ? deepMerge(b, v) : v;
  }
  return out;
}
