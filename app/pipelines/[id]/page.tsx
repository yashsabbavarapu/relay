import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/store";
import { age, stamp } from "@/lib/format";
import { RetryButton } from "@/components/RetryButton";
import { SampleNotice, SampleTag } from "@/components/SampleNotice";
import { StatusBadge } from "@/components/StatusBadge";
import { TestPayloadBox } from "@/components/TestPayloadBox";

export const dynamic = "force-dynamic";

export default async function PipelinePage({ params }: { params: { id: string } }) {
  const store = getStore();
  const pipeline = await store.getPipeline(params.id);
  if (!pipeline) notFound();
  const transfers = (await store.listTransfers()).filter((t) => t.pipeline_id === pipeline.id);
  const ok = transfers.filter((t) => t.status === "ok").length;
  const rate = transfers.length ? `${Math.round((ok / transfers.length) * 100)}%` : "no transfers yet";
  const example = JSON.stringify(
    Object.fromEntries(Object.keys(pipeline.expected_shape ?? { example: 1 }).map((k) => [k, ""])),
    null,
    2,
  );
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm"><Link href="/pipelines" className="underline">Pipelines</Link> /</p>
        <h1 className="text-2xl font-semibold">{pipeline.name}<SampleTag sample={pipeline.sample} /></h1>
        <p className="text-sm text-gray-600">{pipeline.source} to {pipeline.destination}</p>
        <p className="break-all font-mono text-xs text-gray-600">{pipeline.destination_url}</p>
        <p className="mt-1 text-xs text-gray-500">
          id {pipeline.id}. Expected keys: {pipeline.expected_shape && Object.keys(pipeline.expected_shape).length ? Object.keys(pipeline.expected_shape).join(", ") : "none"}.
        </p>
        <p className="mt-3 text-lg">Success rate: <strong>{rate}</strong> <span className="text-sm text-gray-500">({ok} of {transfers.length})</span></p>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Send test payload</h2>
        <TestPayloadBox pipelineId={pipeline.id} example={example} />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent transfers</h2>
        <SampleNotice show={transfers.some((t) => t.sample)} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-300 text-xs uppercase text-gray-500">
              <tr><th className="py-2 pr-3">When</th><th className="pr-3">Status</th><th className="pr-3">Payload</th><th className="pr-3">Duration</th><th className="pr-3">Error</th><th /></tr>
            </thead>
            <tbody>
              {transfers.slice(0, 50).map((t) => (
                <tr key={t.id} className={`border-b border-gray-100 align-top ${t.status === "failed" ? "bg-red-50" : ""}`}>
                  <td className="whitespace-nowrap py-2 pr-3" title={stamp(t.at)}>{age(t.at)}</td>
                  <td className="pr-3"><StatusBadge status={t.status} /></td>
                  <td className="max-w-xs break-all pr-3 font-mono text-xs">{t.input_summary}{t.retry_of && <div className="font-sans text-gray-500">retry of {t.retry_of}</div>}<SampleTag sample={t.sample} /></td>
                  <td className="whitespace-nowrap pr-3">{t.duration_ms} ms</td>
                  <td className="max-w-xs break-words pr-3 text-red-700">{t.error}</td>
                  <td>{t.status === "failed" && <RetryButton transferId={t.id} />}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={6} className="py-3 text-gray-500">No transfers yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
