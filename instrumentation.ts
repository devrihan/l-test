// Next.js calls register() once at server start, before traffic is accepted.
// Boot must never fail because config-manager is down — loam degrades to the
// last-known-good snapshot, then to baked-in defaults, loudly.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // skip the edge-runtime pass
  const { refreshConfig, loadSnapshotOrDefaults } = await import("./app/lib/server/config");
  try {
    const version = await refreshConfig(true);
    console.log(`[config] loaded ${version}`); // stub-mode versions read "loam:stub-…"
  } catch (e) {
    console.error("[config] config-manager unreachable at boot — using fallback:", e);
    await loadSnapshotOrDefaults();
  }
}
