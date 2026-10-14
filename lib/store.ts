import { kv } from "@vercel/kv";
import type { AuditEntry, Pipeline, Transfer } from "./types";
import { buildSeed } from "./seed";

/**
 * Storage adapter. Vercel KV when KV_REST_API_URL / KV_REST_API_TOKEN are set;
 * otherwise an in-memory Map (dev/preview, resets on cold start). Both seed once
 * with sample rows, each tagged `sample: true`.
 */
export interface Store {
  readonly kind: "kv" | "memory";
  listPipelines(): Promise<Pipeline[]>;
  getPipeline(id: string): Promise<Pipeline | null>;
  /** Atomic create. Returns the existing record instead when the id is taken. */
  createPipeline(p: Pipeline): Promise<{ created: true } | { created: false; existing: Pipeline }>;
  listTransfers(): Promise<Transfer[]>;
  getTransfer(id: string): Promise<Transfer | null>;
  addTransfer(t: Transfer, payload: unknown): Promise<void>;
  getPayload(transferId: string): Promise<unknown>;
  listAudit(): Promise<AuditEntry[]>;
  appendAudit(entry: AuditEntry): Promise<void>;
}

const newest = <T>(rows: T[], key: (row: T) => string) => rows.sort((a, b) => key(b).localeCompare(key(a)));

class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private pipelines = new Map<string, Pipeline>();
  private transfers = new Map<string, Transfer>();
  private payloads = new Map<string, unknown>();
  private audit: AuditEntry[] = [];

  constructor() {
    const seed = buildSeed();
    for (const p of seed.pipelines) this.pipelines.set(p.id, p);
    for (const { transfer, payload } of seed.transfers) {
      this.transfers.set(transfer.id, transfer);
      this.payloads.set(transfer.id, payload);
    }
    this.audit.push(...seed.audit);
  }

  async listPipelines() {
    return Array.from(this.pipelines.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  async getPipeline(id: string) {
    return this.pipelines.get(id) ?? null;
  }
  async createPipeline(p: Pipeline) {
    const existing = this.pipelines.get(p.id);
    if (existing) return { created: false as const, existing };
    this.pipelines.set(p.id, p);
    return { created: true as const };
  }
  async listTransfers() {
    return newest(Array.from(this.transfers.values()), (t) => t.at);
  }
  async getTransfer(id: string) {
    return this.transfers.get(id) ?? null;
  }
  async addTransfer(t: Transfer, payload: unknown) {
    this.transfers.set(t.id, t);
    this.payloads.set(t.id, payload);
  }
  async getPayload(id: string) {
    return this.payloads.get(id);
  }
  async listAudit() {
    return newest([...this.audit], (e) => e.at);
  }
  async appendAudit(entry: AuditEntry) {
    this.audit.push(entry);
  }
}

const PIPELINES_KEY = "relay:pipelines";
const TRANSFERS_KEY = "relay:transfers";
const PAYLOADS_KEY = "relay:payloads";
const AUDIT_KEY = "relay:audit";
const SEEDED_KEY = "relay:seeded";

type Kv = typeof import("@vercel/kv").kv;

class KvStore implements Store {
  readonly kind = "kv" as const;
  private ready: Promise<void>;

  constructor(private kv: Kv) {
    this.ready = this.seedOnce();
  }

  private async seedOnce() {
    // SET NX: only the first deploy to reach an empty database seeds it.
    if ((await this.kv.set(SEEDED_KEY, "1", { nx: true })) === null) return;
    const seed = buildSeed();
    await Promise.all([
      ...seed.pipelines.map((p) => this.kv.hset(PIPELINES_KEY, { [p.id]: p })),
      ...seed.transfers.map(async ({ transfer, payload }) => {
        await this.kv.hset(TRANSFERS_KEY, { [transfer.id]: transfer });
        await this.kv.hset(PAYLOADS_KEY, { [transfer.id]: { payload } });
      }),
      ...[...seed.audit].reverse().map((e) => this.kv.lpush(AUDIT_KEY, e)),
    ]);
  }

  async listPipelines() {
    await this.ready;
    const all = await this.kv.hgetall<Record<string, Pipeline>>(PIPELINES_KEY);
    return Object.values(all ?? {}).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  async getPipeline(id: string) {
    await this.ready;
    return (await this.kv.hget<Pipeline>(PIPELINES_KEY, id)) ?? null;
  }
  async createPipeline(p: Pipeline) {
    await this.ready;
    // HSETNX is atomic: two concurrent creates of one id cannot both win.
    const won = await this.kv.hsetnx(PIPELINES_KEY, p.id, p);
    if (won) return { created: true as const };
    const existing = (await this.kv.hget<Pipeline>(PIPELINES_KEY, p.id)) ?? p;
    return { created: false as const, existing };
  }
  async listTransfers() {
    await this.ready;
    const all = await this.kv.hgetall<Record<string, Transfer>>(TRANSFERS_KEY);
    return newest(Object.values(all ?? {}), (t) => t.at);
  }
  async getTransfer(id: string) {
    await this.ready;
    return (await this.kv.hget<Transfer>(TRANSFERS_KEY, id)) ?? null;
  }
  async addTransfer(t: Transfer, payload: unknown) {
    await this.ready;
    // Payload is wrapped so a bare JSON null/primitive round-trips.
    await this.kv.hset(PAYLOADS_KEY, { [t.id]: { payload } });
    await this.kv.hset(TRANSFERS_KEY, { [t.id]: t });
  }
  async getPayload(id: string) {
    await this.ready;
    const row = await this.kv.hget<{ payload: unknown }>(PAYLOADS_KEY, id);
    return row?.payload;
  }
  async listAudit() {
    await this.ready;
    return newest(await this.kv.lrange<AuditEntry>(AUDIT_KEY, 0, 999), (e) => e.at);
  }
  async appendAudit(entry: AuditEntry) {
    await this.ready;
    await this.kv.lpush(AUDIT_KEY, entry);
  }
}

export const kvConfigured = () => Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const g = globalThis as unknown as { __relayStore?: Store };

/** One store per server instance (survives dev hot reloads). */
export function getStore(): Store {
  if (!g.__relayStore) g.__relayStore = kvConfigured() ? new KvStore(kv) : new MemoryStore();
  return g.__relayStore;
}
