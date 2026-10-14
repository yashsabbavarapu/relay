import Link from "next/link";
import { getStore } from "@/lib/store";
import { unresolvedFailures } from "@/lib/core";
import { age, stamp } from "@/lib/format";
import { RetryButton } from "@/components/RetryButton";
import { SampleNotice, SampleTag } from "@/components/SampleNotice";

export const dynamic = "force-dynamic";

export default async function FailuresPage() {
  const store = getStore();
  const [transfers, pipelines] = await Promise.all([store.listTransfers(), store.listPipelines()]);
  const names = new Map(pipelines.map((p) => [p.id, p.name]));
  const { open, resolved } = unresolvedFailures(transfers);
  const oldest = open.length ? open[open.length - 1] : null;

  return (
    <div className="space-y-8">
      <section>
        {open.length > 0 ? (
          <div role="alert" className="border-4 border-red-600 bg-red-600 p-4 text-white">
            <h1 className="text-3xl font-extrabold">{open.length} failed {open.length === 1 ? "transfer" : "transfers"} not delivered</h1>
            <p className="mt-1 text-sm">
              Data did not reach its destination. Oldest failure: {oldest ? age(oldest.at) : ""}. Retry each one below.
            </p>
          </div>
        ) : (
          <div className="border border-gray-300 p-4">
            <h1 className="text-2xl font-semibold">No open failures</h1>
            <p className="text-sm text-gray-600">Every failed transfer has been retried successfully.</p>
          </div>
        )}
      </section>

      <SampleNotice show={open.some((t) => t.sample) || resolved.some((t) => t.sample)} />

      {open.length > 0 && (
        <ul className="space-y-3">
          {open.map((t) => (
            <li key={t.id} className="border-l-8 border-red-600 bg-red-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <Link href={`/pipelines/${t.pipeline_id}`} className="underline">{names.get(t.pipeline_id) ?? t.pipeline_id}</Link>
                    <span className="ml-2 font-normal text-red-800" title={stamp(t.at)}>{age(t.at)}</span>
                    <SampleTag sample={t.sample} />
                  </p>
                  <p className="mt-1 break-words text-base font-bold text-red-800">{t.error ?? "Failed with no error recorded."}</p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-700">{t.input_summary}</p>
                  {t.retry_of && <p className="mt-1 text-xs text-gray-600">Retry of {t.retry_of}</p>}
                </div>
                <RetryButton transferId={t.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-600">Failed earlier, delivered on retry ({resolved.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs text-gray-600">
              <tbody>
                {resolved.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 align-top">
                    <td className="whitespace-nowrap py-1 pr-3">{age(t.at)}</td>
                    <td className="pr-3">{names.get(t.pipeline_id) ?? t.pipeline_id}</td>
                    <td className="break-words">{t.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
