import { randomBytes } from "node:crypto";
import { getStore } from "./store";
import { summarize } from "./format";
import type { AuditEntry, Pipeline, Transfer } from "./types";

/** Shared by the API routes and the UI server actions. */
export type Result<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; existing?: unknown };

const fail = (status: number, error: string, existing?: unknown): Result<never> => ({ ok: false, status, error, existing });

export const FORWARD_TIMEOUT_MS = 10_000;
const MAX_PAYLOAD_CHARS = 100_000;
const MAX_TEXT = 200;

const newId = (prefix: string) => `${prefix}_${randomBytes(5).toString("hex")}`;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export async function audit(action: string, target: string, detail: string) {
  const entry: AuditEntry = { id: newId("au"), at: new Date().toISOString(), action, target, detail };
  await getStore().appendAudit(entry);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Refuses non-http(s) URLs and, where it matters, internal addresses. Hostname check only (no DNS lookup). */
export function destinationProblem(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "destination_url must be a valid URL.";
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return "destination_url must start with http:// or https://.";
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const linkLocal = /^169\.254\./.test(host) || host.startsWith("fe80:");
  const internal =
    host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "0.0.0.0" ||
    /^(127|10)\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^f[cd][0-9a-f]{2}:/.test(host);
  const strict = Boolean(process.env.VERCEL) || process.env.RELAY_BLOCK_PRIVATE_DESTINATIONS === "1";
  if (linkLocal || (strict && internal)) return "destination_url points at an internal address, which Relay will not call.";
  return null;
}

export async function createPipeline(body: unknown): Promise<Result<Pipeline>> {
  if (!isObject(body)) return fail(400, "Body must be a JSON object.");
  const text = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const name = text("name");
  const source = text("source");
  const destination = text("destination");
  const destination_url = text("destination_url");
  for (const [k, v] of [["name", name], ["source", source], ["destination", destination], ["destination_url", destination_url]] as const) {
    if (!v) return fail(400, `${k} is required and must be a non-empty string.`);
    if (v.length > 2000 || (k !== "destination_url" && v.length > MAX_TEXT)) return fail(400, `${k} is too long.`);
  }
  const problem = destinationProblem(destination_url);
  if (problem) return fail(400, problem);

  let expected_shape: Record<string, unknown> | undefined;
  if (body.expected_shape !== undefined && body.expected_shape !== null) {
    if (!isObject(body.expected_shape)) return fail(400, "expected_shape must be a JSON object.");
    expected_shape = body.expected_shape;
  }

  let id: string;
  if (body.id !== undefined) {
    if (typeof body.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(body.id)) {
      return fail(400, "id must be lowercase letters, digits and hyphens (max 60).");
    }
    id = body.id;
  } else {
    id = slugify(name);
    if (!id) return fail(400, "name must contain letters or digits so an id can be derived.");
  }

  const pipeline: Pipeline = {
    id, name, source, destination, destination_url,
    ...(expected_shape ? { expected_shape } : {}),
    created_at: new Date().toISOString(),
  };
  const res = await getStore().createPipeline(pipeline);
  if (!res.created) return fail(409, `A pipeline with id "${id}" already exists.`, res.existing);
  await audit("pipeline.create", id, name);
  return { ok: true, status: 201, data: pipeline };
}

/** Shallow check: every key of expected_shape must be present on the payload. */
export function missingKeys(shape: Record<string, unknown> | undefined, payload: unknown): string[] | "not-object" {
  const keys = shape ? Object.keys(shape) : [];
  if (keys.length === 0) return [];
  if (!isObject(payload)) return "not-object";
  return keys.filter((k) => !(k in payload));
}

async function forward(url: string, payload: unknown): Promise<{ status: "ok" | "failed"; error?: string; duration_ms: number }> {
  const start = Date.now();
  const problem = destinationProblem(url);
  if (problem) return { status: "failed", error: problem, duration_ms: 0 };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "relay/0.1" },
      body: JSON.stringify(payload),
      redirect: "manual",
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    const duration_ms = Date.now() - start;
    if (res.status >= 200 && res.status < 300) {
      await res.body?.cancel();
      return { status: "ok", duration_ms };
    }
    const snippet = (await res.text().catch(() => "")).replace(/\s+/g, " ").trim().slice(0, 160);
    return { status: "failed", duration_ms, error: `Destination returned HTTP ${res.status}${snippet ? `: ${snippet}` : ""}` };
  } catch (e) {
    const duration_ms = Date.now() - start;
    const err = e as { name?: string; cause?: { code?: string; message?: string }; message?: string };
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { status: "failed", duration_ms, error: `Timed out after ${FORWARD_TIMEOUT_MS} ms waiting for ${new URL(url).host}` };
    }
    const why = err.cause?.code ?? err.cause?.message ?? err.message ?? "unknown error";
    return { status: "failed", duration_ms, error: `Could not reach ${new URL(url).host}: ${why}` };
  }
}

async function send(pipeline: Pipeline, payload: unknown, retry_of?: string): Promise<Transfer> {
  const out = await forward(pipeline.destination_url, payload);
  const transfer: Transfer = {
    id: newId("tr"),
    pipeline_id: pipeline.id,
    at: new Date().toISOString(),
    status: out.status,
    input_summary: summarize(payload),
    duration_ms: out.duration_ms,
    ...(out.error ? { error: out.error } : {}),
    ...(retry_of ? { retry_of } : {}),
  };
  await getStore().addTransfer(transfer, payload);
  await audit(retry_of ? "transfer.retry" : "transfer.ingest", transfer.id, `${pipeline.id} ${transfer.status}${retry_of ? ` (retry of ${retry_of})` : ""}`);
  return transfer;
}

export async function ingest(pipelineId: string, body: unknown): Promise<Result<Transfer>> {
  if (!isObject(body) || !("payload" in body) || body.payload === undefined) {
    return fail(400, 'Body must be a JSON object with a "payload" field.');
  }
  const payload = body.payload;
  if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) return fail(400, `payload is larger than ${MAX_PAYLOAD_CHARS} characters.`);
  const pipeline = await getStore().getPipeline(pipelineId);
  if (!pipeline) return fail(404, `No pipeline with id "${pipelineId}".`);

  const missing = missingKeys(pipeline.expected_shape, payload);
  if (missing === "not-object" || missing.length > 0) {
    const error = missing === "not-object"
      ? "payload must be a JSON object to match expected_shape."
      : `payload is missing required keys: ${missing.join(", ")}.`;
    await audit("ingest.rejected", pipeline.id, error);
    return fail(400, error);
  }
  return { ok: true, status: 200, data: await send(pipeline, payload) };
}

export async function retryTransfer(id: string): Promise<Result<Transfer>> {
  const store = getStore();
  const original = await store.getTransfer(id);
  if (!original) return fail(404, `No transfer with id "${id}".`);
  const pipeline = await store.getPipeline(original.pipeline_id);
  if (!pipeline) return fail(404, `Pipeline "${original.pipeline_id}" no longer exists.`);
  const payload = await store.getPayload(id);
  if (payload === undefined) return fail(409, "The stored payload for this transfer is not available.");
  return { ok: true, status: 200, data: await send(pipeline, payload, id) };
}

/** A failed transfer is resolved once a later transfer in its retry chain (same root) succeeded. */
export function unresolvedFailures(transfers: Transfer[]): { open: Transfer[]; resolved: Transfer[] } {
  const byId = new Map(transfers.map((t) => [t.id, t]));
  const rootOf = (t: Transfer): string => {
    const seen = new Set<string>();
    let cur = t;
    while (cur.retry_of && !seen.has(cur.id)) {
      seen.add(cur.id);
      const parent = byId.get(cur.retry_of);
      if (!parent) return cur.retry_of;
      cur = parent;
    }
    return cur.id;
  };
  const lastOk = new Map<string, string>();
  for (const t of transfers) {
    if (t.status !== "ok") continue;
    const root = rootOf(t);
    if ((lastOk.get(root) ?? "") < t.at) lastOk.set(root, t.at);
  }
  const failed = transfers.filter((t) => t.status === "failed");
  const isResolved = (t: Transfer) => (lastOk.get(rootOf(t)) ?? "") > t.at;
  return { open: failed.filter((t) => !isResolved(t)), resolved: failed.filter(isResolved) };
}
