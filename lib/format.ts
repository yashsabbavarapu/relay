export function age(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function stamp(iso: string): string {
  return iso.replace("T", " ").slice(0, 19) + " UTC";
}

export function summarize(payload: unknown, max = 200): string {
  let text: string;
  try {
    text = JSON.stringify(payload) ?? String(payload);
  } catch {
    text = String(payload);
  }
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}
