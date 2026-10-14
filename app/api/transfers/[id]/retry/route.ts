import { retryTransfer } from "@/lib/core";
import { guardWrite, send } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const blocked = guardWrite(req, { rateLimited: true });
  if (blocked) return blocked;
  return send(await retryTransfer(params.id));
}
