"use client";

import { useFormState, useFormStatus } from "react-dom";
import { sendTestAction, type FormState } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
      {pending ? "Sending…" : "Send test payload"}
    </button>
  );
}

export function TestPayloadBox({ pipelineId, example }: { pipelineId: string; example: string }) {
  const [state, action] = useFormState<FormState, FormData>(sendTestAction.bind(null, pipelineId), {});
  return (
    <form action={action} className="max-w-2xl space-y-2">
      <textarea name="payload" rows={5} defaultValue={example} className="block w-full rounded border border-gray-300 px-2 py-1.5 font-mono text-sm" />
      <div className="flex flex-wrap items-center gap-3">
        <Submit />
        {state.error && <span className="break-words text-sm font-medium text-red-700">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-800">{state.message}</span>}
      </div>
    </form>
  );
}
