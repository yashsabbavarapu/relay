import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relay</h1>
      <p className="max-w-xl">
        Relay receives a payload, checks it against the pipeline&apos;s expected keys, sends it to the destination
        webhook, and logs every transfer. Failed transfers are listed on one page, with a retry button.
      </p>
      <ul className="list-disc pl-5 text-sm">
        <li><Link href="/pipelines" className="underline">Pipelines</Link>: define and inspect them</li>
        <li><Link href="/failures" className="underline">Failures</Link>: every failed transfer, with retry</li>
        <li><Link href="/log" className="underline">Log</Link>: append-only audit log</li>
      </ul>
    </div>
  );
}
