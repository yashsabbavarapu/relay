"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createPipeline, ingest, retryTransfer } from "@/lib/core";
import { clientIp, rateLimit } from "@/lib/ratelimit";

// The UI's writes run here, on the server, so RELAY_API_SECRET never reaches the client bundle.

export interface FormState {
  ok?: boolean;
  message?: string;
  error?: string;
  href?: string;
}

function limited(): string | null {
  const rl = rateLimit(clientIp(headers()));
  return rl.ok ? null : `Rate limit exceeded: 30 requests per minute. Try again in ${rl.retryAfter}s.`;
}

export async function createPipelineAction(_prev: FormState, form: FormData): Promise<FormState> {
  const shapeText = String(form.get("expected_shape") ?? "").trim();
  let expected_shape: unknown;
  if (shapeText) {
    try {
      expected_shape = JSON.parse(shapeText);
    } catch {
      return { error: "Expected shape is not valid JSON." };
    }
  }
  const r = await createPipeline({
    name: form.get("name"),
    source: form.get("source"),
    destination: form.get("destination"),
    destination_url: form.get("destination_url"),
    expected_shape,
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/pipelines");
  revalidatePath("/log");
  return { ok: true, message: `Created ${r.data.name}.`, href: `/pipelines/${r.data.id}` };
}

export async function sendTestAction(pipelineId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const stop = limited();
  if (stop) return { error: stop };
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return { error: "Payload is not valid JSON." };
  }
  const r = await ingest(pipelineId, { payload });
  revalidatePath(`/pipelines/${pipelineId}`);
  revalidatePath("/failures");
  revalidatePath("/log");
  if (!r.ok) return { error: r.error };
  return r.data.status === "ok"
    ? { ok: true, message: `Transfer ${r.data.id} ok in ${r.data.duration_ms} ms.` }
    : { error: `Transfer ${r.data.id} failed: ${r.data.error}` };
}

export async function retryAction(transferId: string, _prev: FormState): Promise<FormState> {
  const stop = limited();
  if (stop) return { error: stop };
  const r = await retryTransfer(transferId);
  revalidatePath("/failures");
  revalidatePath("/pipelines/[id]", "page");
  revalidatePath("/log");
  if (!r.ok) return { error: r.error };
  return r.data.status === "ok"
    ? { ok: true, message: `Retry ok (${r.data.id}).` }
    : { error: `Retry failed again: ${r.data.error}` };
}
