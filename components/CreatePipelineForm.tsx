"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { createPipelineAction, type FormState } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
      {pending ? "Creating…" : "Create pipeline"}
    </button>
  );
}

const input = "mt-1 block w-full rounded border border-gray-300 px-2 py-1.5 text-sm";

export function CreatePipelineForm() {
  const [state, action] = useFormState<FormState, FormData>(createPipelineAction, {});
  return (
    <form action={action} className="grid max-w-2xl gap-3 sm:grid-cols-2">
      <label className="text-sm">Name<input name="name" required className={input} placeholder="Meeting → CRM" /></label>
      <label className="text-sm">Source<input name="source" required className={input} placeholder="meeting bot" /></label>
      <label className="text-sm">Destination<input name="destination" required className={input} placeholder="CRM" /></label>
      <label className="text-sm">Destination URL<input name="destination_url" required type="url" className={input} placeholder="https://example.com/webhook" /></label>
      <label className="text-sm sm:col-span-2">
        Expected shape (optional JSON object; each key must be present in incoming payloads)
        <textarea name="expected_shape" rows={3} className={`${input} font-mono`} placeholder='{"email": "", "company": ""}' />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit />
        {state.error && <span className="text-sm font-medium text-red-700">{state.error}</span>}
        {state.ok && state.href && (
          <span className="text-sm text-green-800">{state.message} <Link href={state.href} className="underline">Open it</Link></span>
        )}
      </div>
    </form>
  );
}
