import { getConfigVersion, getMergedConfig } from "@/app/lib/server/config";
import { schoolFromSession } from "@/app/lib/server/session";

export const dynamic = "force-dynamic"; // always reflect the live in-memory cache

// Browser pass-through: client code can't read server memory (and
// NEXT_PUBLIC_* vars are frozen at build time), so it gets config here.
// Only ever returns the school-resolved view — one school's users never
// receive another school's config.
export async function GET() {
  const school = await schoolFromSession();
  return Response.json(
    {
      version: getConfigVersion() ?? null,
      feature_flags: getMergedConfig("feature_flags", school),
      academic_year_scope: getMergedConfig("academic_year_scope", school),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
