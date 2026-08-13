import "server-only";
import { promises as fs } from "node:fs";
import { deepMerge, dig, isPlainObject, type JsonObject } from "../config-shared";
import { CONFIG_DEFAULTS } from "./config-defaults";
import { readStub } from "./config-stub-source";

// Runtime product config, fetched from config-manager and held in process
// memory. Contract + rationale: infnotes/dev/handoffs/cld_loam_config_consumer_mechanism.md
// (config-manager side lives in the config-manager repo).

type ConfigRow = {
  config_name: string;
  scope_type: "global" | "school" | (string & {});
  config: JsonObject;
};

type ConfigCache = {
  rows: ConfigRow[];
  version: string; // opaque, e.g. "loam:44"
  fetchedAt: number; // epoch ms of last successful contact (0 = from disk snapshot)
};

// One instance per Node process, shared across all requests and bundles
// (globalThis because Next can instantiate a module once per bundle boundary).
const g = globalThis as unknown as {
  __loamConfig?: ConfigCache;
  __loamConfigInflight?: Promise<string> | null;
};

const SNAPSHOT_PATH = process.env.CONFIG_SNAPSHOT_PATH ?? "/tmp/loam-config-snapshot.json";

function findRow(configName: string): ConfigRow | undefined {
  return g.__loamConfig?.rows.find((r) => r.config_name === configName);
}

/** The doc a reader should see: school subtree for school-scoped docs, the doc itself otherwise. */
function resolveDoc(row: ConfigRow | undefined, school?: string): JsonObject | undefined {
  if (!row) return undefined;
  if (row.scope_type === "school") {
    if (!school) return undefined;
    const subtree = row.config[school];
    return isPlainObject(subtree) ? subtree : undefined;
  }
  return row.config;
}

/**
 * Read one value by dotted path ("teacherView.dashboard.linechart").
 * Resolution: the resolved doc → baked-in defaults → the call-site fallback.
 * Pure in-memory lookup — no I/O, safe on any request path.
 */
export function getConfigValue<T>(
  configName: string,
  path: string,
  opts: { school?: string; fallback: T },
): T {
  const v = dig(resolveDoc(findRow(configName), opts.school), path);
  if (v !== undefined) return v as T;
  const d = dig(CONFIG_DEFAULTS[configName], path);
  return (d === undefined ? opts.fallback : d) as T;
}

/** Whole-document view (resolved doc over baked-in defaults) for the browser pass-through. */
export function getMergedConfig(configName: string, school?: string): JsonObject {
  const defaults = CONFIG_DEFAULTS[configName] ?? {};
  return deepMerge(defaults, resolveDoc(findRow(configName), school) ?? {});
}

/** Version currently held (undefined before the first successful load). */
export function getConfigVersion(): string | undefined {
  return g.__loamConfig?.version;
}

/** Re-fetch from config-manager. force=true bypasses the ETag (used by the refresh route). */
export async function refreshConfig(force = false): Promise<string> {
  if (g.__loamConfigInflight) return g.__loamConfigInflight; // coalesce concurrent refreshes
  g.__loamConfigInflight = doFetch(force).finally(() => {
    g.__loamConfigInflight = null;
  });
  return g.__loamConfigInflight;
}

async function doFetch(force: boolean): Promise<string> {
  // Interim source mode until config-manager is deployed: read the committed
  // stub file directly (no HTTP, works at boot). Enabled explicitly in prod
  // via CONFIG_STUB_ENABLED=true; remove that env var at cutover.
  if (process.env.CONFIG_STUB_ENABLED === "true") {
    const { version, configs } = await readStub();
    g.__loamConfig = { rows: configs as ConfigRow[], version, fetchedAt: Date.now() };
    return version;
  }
  const base = process.env.CONFIG_MANAGER_URL;
  if (!base) throw new Error("CONFIG_MANAGER_URL not set — serving defaults");
  const res = await fetch(`${base}/api/v1/config?service=loam`, {
    headers: {
      authorization: `Bearer ${process.env.CONFIG_MANAGER_TOKEN}`,
      ...(!force && g.__loamConfig ? { "if-none-match": `"${g.__loamConfig.version}"` } : {}),
    },
    cache: "no-store", // opt out of Next's fetch caching — always hit the network
    signal: AbortSignal.timeout(5000), // a slow config-manager must never hang loam
  });
  if (res.status === 304 && g.__loamConfig) {
    g.__loamConfig.fetchedAt = Date.now();
    return g.__loamConfig.version;
  }
  if (!res.ok) throw new Error(`config-manager responded ${res.status}`);
  const body = (await res.json()) as { version: string; configs: ConfigRow[] };
  g.__loamConfig = { rows: body.configs, version: body.version, fetchedAt: Date.now() };
  await writeSnapshot(body).catch(() => {}); // best-effort last-known-good
  return body.version;
}

async function writeSnapshot(body: unknown): Promise<void> {
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(body));
}

/**
 * Boot fallback when config-manager is unreachable: last-known-good disk
 * snapshot if one exists (survives process restarts, not redeploys), else
 * leave the cache empty so every read lands on CONFIG_DEFAULTS.
 */
export async function loadSnapshotOrDefaults(): Promise<void> {
  try {
    const body = JSON.parse(await fs.readFile(SNAPSHOT_PATH, "utf8")) as {
      version: string;
      configs: ConfigRow[];
    };
    g.__loamConfig = { rows: body.configs, version: body.version, fetchedAt: 0 };
    console.warn(`[config] using last-known-good snapshot ${body.version} (${SNAPSHOT_PATH})`);
  } catch {
    console.warn("[config] no snapshot available — serving baked-in defaults");
  }
}
