import { NextResponse } from "next/server";
import { checkWriteAuth } from "./auth";
import { clientIp, rateLimit } from "./ratelimit";
import type { Result } from "./core";

export const unauthorized = () => NextResponse.json({ error: "Unauthorized." }, { status: 401 });

export function send<T>(r: Result<T>) {
  if (r.ok) return NextResponse.json(r.data, { status: r.status });
  return NextResponse.json({ error: r.error, ...(r.existing ? { existing: r.existing } : {}) }, { status: r.status });
}

export async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false };
  }
}

/** Auth then rate limit, shared by every write route. Returns a response to send, or null to continue. */
export function guardWrite(req: Request, opts: { rateLimited: boolean }): NextResponse | null {
  if (!checkWriteAuth(req)) return unauthorized();
  if (opts.rateLimited) {
    const rl = rateLimit(clientIp(req.headers));
    if (!rl.ok) {
      return NextResponse.json({ error: "Rate limit exceeded: 30 requests per minute." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
    }
  }
  return null;
}
