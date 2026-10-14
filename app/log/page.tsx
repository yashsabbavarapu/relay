import { getStore } from "@/lib/store";
import { stamp } from "@/lib/format";
import { SampleNotice, SampleTag } from "@/components/SampleNotice";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const entries = await getStore().listAudit();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Log</h1>
      <p className="mb-3 text-sm text-gray-600">Append-only record of every write. Also at <code>/api/log</code>.</p>
      <SampleNotice show={entries.some((e) => e.sample)} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-300 text-xs uppercase text-gray-500">
            <tr><th className="py-2 pr-3">Time</th><th className="pr-3">Action</th><th className="pr-3">Target</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 align-top">
                <td className="whitespace-nowrap py-1.5 pr-3">{stamp(e.at)}</td>
                <td className="pr-3 font-mono text-xs">{e.action}</td>
                <td className="pr-3 font-mono text-xs">{e.target}<SampleTag sample={e.sample} /></td>
                <td className="break-words">{e.detail}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={4} className="py-3 text-gray-500">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
