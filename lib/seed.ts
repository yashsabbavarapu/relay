import type { AuditEntry, Pipeline, Transfer } from "./types";

export interface SeedTransfer {
  transfer: Transfer;
  payload: unknown;
}

export interface Seed {
  pipelines: Pipeline[];
  transfers: SeedTransfer[];
  audit: AuditEntry[];
}

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Sample rows. Every row is tagged `sample: true`. Timestamps are relative to seeding time. */
export function buildSeed(now = Date.now()): Seed {
  const ago = (ms: number) => new Date(now - ms).toISOString();

  const pipelines: Pipeline[] = [
    {
      id: "meeting-crm",
      name: "Meeting → CRM",
      source: "meeting bot",
      destination: "CRM",
      destination_url: "https://crm.example.invalid/hooks/meeting-notes",
      expected_shape: { meeting_id: "", account: "", summary: "" },
      created_at: ago(9 * 24 * HOUR),
      sample: true,
    },
    {
      id: "lead-enricher",
      name: "Lead → Enricher",
      source: "web form",
      destination: "enricher",
      destination_url: "https://enrich.example.invalid/v1/leads",
      expected_shape: { email: "", company: "" },
      created_at: ago(9 * 24 * HOUR),
      sample: true,
    },
  ];

  const t = (
    id: string,
    pipeline_id: string,
    msAgo: number,
    status: Transfer["status"],
    payload: unknown,
    duration_ms: number,
    error?: string,
    retry_of?: string,
  ): SeedTransfer => ({
    payload,
    transfer: {
      id,
      pipeline_id,
      at: ago(msAgo),
      status,
      input_summary: JSON.stringify(payload),
      duration_ms,
      ...(error ? { error } : {}),
      ...(retry_of ? { retry_of } : {}),
      sample: true,
    },
  });

  const transfers: SeedTransfer[] = [
    t("tr_seed01", "meeting-crm", 30 * HOUR, "ok", { meeting_id: "m-4471", account: "Northwind", summary: "Pricing call, wants a security review before signing." }, 212),
    t("tr_seed02", "meeting-crm", 26 * HOUR, "ok", { meeting_id: "m-4478", account: "Contoso", summary: "Intro call, two stakeholders added." }, 187),
    t("tr_seed03", "meeting-crm", 5 * HOUR, "failed", { meeting_id: "m-4502", account: "Fabrikam", summary: "Renewal discussion, asked for a 12-month term." }, 10_001, "Timed out after 10000 ms waiting for crm.example.invalid"),
    t("tr_seed04", "meeting-crm", 3 * HOUR, "ok", { meeting_id: "m-4503", account: "Initech", summary: "Demo follow-up, champion confirmed." }, 240),
    t("tr_seed05", "lead-enricher", 28 * HOUR, "ok", { email: "dana@northwind.example", company: "Northwind" }, 640),
    t("tr_seed06", "lead-enricher", 22 * HOUR, "ok", { email: "li@contoso.example", company: "Contoso" }, 598),
    t("tr_seed07", "lead-enricher", 90 * MIN, "failed", { email: "sam@fabrikam.example", company: "Fabrikam" }, 318, "Destination returned HTTP 502: upstream enrichment provider unavailable"),
    t("tr_seed08", "lead-enricher", 40 * MIN, "ok", { email: "ari@initech.example", company: "Initech" }, 612),
  ];

  const audit: AuditEntry[] = [
    { id: "au_seed01", at: ago(9 * 24 * HOUR), action: "pipeline.create", target: "meeting-crm", detail: "Meeting → CRM", sample: true },
    { id: "au_seed02", at: ago(9 * 24 * HOUR), action: "pipeline.create", target: "lead-enricher", detail: "Lead → Enricher", sample: true },
    ...transfers.map(({ transfer: x }, i): AuditEntry => ({
      id: `au_seed${String(i + 3).padStart(2, "0")}`,
      at: x.at,
      action: "transfer.ingest",
      target: x.id,
      detail: `${x.pipeline_id} ${x.status}`,
      sample: true,
    })),
  ];

  return { pipelines, transfers, audit };
}
