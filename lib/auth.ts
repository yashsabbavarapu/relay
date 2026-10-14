// Shared-secret auth for write routes. RELAY_API_SECRET is server-only (never NEXT_PUBLIC_).
// When set, writes must send a matching `x-relay-secret` header or get a 401.
// When unset (local dev), writes are open and the UI shows a quiet notice.
import { timingSafeEqual } from "node:crypto";

export const AUTH_HEADER = "x-relay-secret";

export const writesAuthenticated = () => Boolean(process.env.RELAY_API_SECRET);

export function checkWriteAuth(req: Request): boolean {
  const secret = process.env.RELAY_API_SECRET;
  if (!secret) return true;
  const given = Buffer.from(req.headers.get(AUTH_HEADER) ?? "");
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
