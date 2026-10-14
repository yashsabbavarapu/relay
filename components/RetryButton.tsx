"use client";

import { useFormState, useFormStatus } from "react-dom";
import { retryAction, type FormState } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded border border-red-700 bg-white px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
      {pending ? "Retrying…" : "Retry"}
    </button>
  );
}

export function RetryButton({ transferId }: { transferId: string }) {
  const [state, action] = useFormState<FormState>(retryAction.bind(null, transferId), {});
  return (
    <form action={action} className="space-y-1">
      <Submit />
      {state.error && <p className="max-w-xs break-words text-xs font-medium text-red-700">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-800">{state.message}</p>}
    </form>
  );
}
