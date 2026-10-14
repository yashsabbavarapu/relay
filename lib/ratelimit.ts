// Per-IP fixed-window limiter for ingest routes: 30 requests per minute.
// In memory, so on serverless it is per instance (a soft limit, not a global one).
export const LIMIT = 30;
const WINDOW_MS = 60_000;

const g = globalThis as unknown as { __relayHits?: Map<string, { start: number; count: number }> };

export function rateLimit(ip: string, now = Date.now()): { ok: true } | { ok: false; retryAfter: number } {
  const hits = (g.__relayHits ??= new Map());
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start >= WINDOW_MS) hits.delete(k);
  const hit = hits.get(ip);
  if (!hit || now - hit.start >= WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return { ok: true };
  }
  if (hit.count >= LIMIT) return { ok: false, retryAfter: Math.max(1, Math.ceil((hit.start + WINDOW_MS - now) / 1000)) };
  hit.count += 1;
  return { ok: true };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
