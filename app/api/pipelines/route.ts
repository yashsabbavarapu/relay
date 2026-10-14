import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { createPipeline } from "@/lib/core";
import { guardWrite, readJson, send } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getStore().listPipelines());
}

export async function POST(req: Request) {
  const blocked = guardWrite(req, { rateLimited: false });
  if (blocked) return blocked;
  const json = await readJson(req);
  if (!json.ok) return NextResponse.json({ error: "Body must be valid JSON." }, { status: 400 });
  return send(await createPipeline(json.body));
}
