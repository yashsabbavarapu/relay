import Link from "next/link";
import { getStore } from "@/lib/store";
import { CreatePipelineForm } from "@/components/CreatePipelineForm";
import { SampleNotice, SampleTag } from "@/components/SampleNotice";

export const dynamic = "force-dynamic";

export default async function PipelinesPage() {
  const store = getStore();
  const [pipelines, transfers] = await Promise.all([store.listPipelines(), store.listTransfers()]);
  const stats = new Map<string, { ok: number; total: number }>();
  for (const t of transfers) {
    const s = stats.get(t.pipeline_id) ?? { ok: 0, total: 0 };
    s.total += 1;
    if (t.status === "ok") s.ok += 1;
    stats.set(t.pipeline_id, s);
  }
  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-3 text-2xl font-semibold">Pipelines</h1>
        <SampleNotice show={pipelines.some((p) => p.sample)} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-gray-300 text-xs uppercase text-gray-500">
              <tr><th className="py-2 pr-3">Name</th><th className="pr-3">Source</th><th className="pr-3">Destination</th><th className="pr-3">Transfers</th><th>Success rate</th></tr>
            </thead>
            <tbody>
              {pipelines.map((p) => {
                const s = stats.get(p.id) ?? { ok: 0, total: 0 };
                return (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3"><Link href={`/pipelines/${p.id}`} className="underline">{p.name}</Link><SampleTag sample={p.sample} /></td>
                    <td className="pr-3">{p.source}</td>
                    <td className="pr-3">{p.destination}</td>
                    <td className="pr-3">{s.total}</td>
                    <td>{s.total ? `${Math.round((s.ok / s.total) * 100)}%` : "no transfers"}</td>
                  </tr>
                );
              })}
              {pipelines.length === 0 && <tr><td colSpan={5} className="py-3 text-gray-500">No pipelines yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Create a pipeline</h2>
        <CreatePipelineForm />
      </section>
    </div>
  );
}
