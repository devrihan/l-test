import "server-only";
import { cookies } from "next/headers";

// The school id used to resolve school-scoped config docs. Read from the
// Keycloak access token that login stores in the `token` cookie
// (app/lib/auth.ts stores the raw access_token there). The payload is decoded
// WITHOUT signature verification — fine for config scoping (non-sensitive
// product flags); real authorization still happens at the APIs.
//
// The claim contract is exactly `schoolId` (camelCase) — the Keycloak custom
// user attribute set at account provisioning. No fallback keys: a misnamed
// attribute must surface as "unresolved school" (defaults), not silently work.
// A teacher token carries a real schoolId; admin/ops tokens carry "all",
// which is NOT special-cased here — config docs carry an "all" subtree so
// admin flags are managed in config-manager like any school's (Fahad 23-07).
export async function schoolFromSession(): Promise<string | undefined> {
  // School override: lets flag work proceed before the token carries a
  // school claim. Honored in dev, and in prod only while stub mode is on
  // (single-school interim) — remove both env vars at config-manager cutover.
  if (
    process.env.CONFIG_DEV_SCHOOL &&
    (process.env.NODE_ENV !== "production" || process.env.CONFIG_STUB_ENABLED === "true")
  ) {
    return process.env.CONFIG_DEV_SCHOOL;
  }
  const token = (await cookies()).get("token")?.value;
  if (!token) return undefined;
  const payload = decodeJwtPayload(token);
  if (!payload) return undefined;
  // Claim may be numeric (e.g. 1); coerce to string. "all" passes through as
  // a regular key — the doc's "all" subtree is the admin flag set. Only a
  // missing/empty claim is unresolved (falls to baked-in defaults).
  const raw = payload["schoolId"];
  return raw == null || raw === "" ? undefined : String(raw);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
