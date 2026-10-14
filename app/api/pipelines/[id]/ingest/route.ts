import { NextResponse } from "next/server";
import { ingest } from "@/lib/core";
import { guardWrite, readJson, send } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const blocked = guardWrite(req, { rateLimited: true });
  if (blocked) return blocked;
  const json = await readJson(req);
  if (!json.ok) return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  return send(await ingest(params.id, json.body));
}
