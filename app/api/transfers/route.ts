import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const pipeline_id = q.get("pipeline_id");
  const status = q.get("status");
  if (status && status !== "ok" && status !== "failed") {
    return NextResponse.json({ error: 'status must be "ok" or "failed".' }, { status: 400 });
  }
  const rows = (await getStore().listTransfers()).filter(
    (t) => (!pipeline_id || t.pipeline_id === pipeline_id) && (!status || t.status === status),
  );
  return NextResponse.json(rows);
}
