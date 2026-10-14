export function StatusBadge({ status }: { status: "ok" | "failed" }) {
  return status === "ok" ? (
    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">ok</span>
  ) : (
    <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold uppercase text-white">failed</span>
  );
}
