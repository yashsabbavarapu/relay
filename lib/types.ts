export interface Pipeline {
  id: string;
  name: string;
  source: string;
  destination: string;
  destination_url: string;
  expected_shape?: Record<string, unknown>;
  created_at: string;
  sample?: true;
}

export interface Transfer {
  id: string;
  pipeline_id: string;
  at: string;
  status: "ok" | "failed";
  input_summary: string;
  error?: string;
  duration_ms: number;
  retry_of?: string;
  sample?: true;
}

export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  target: string;
  detail: string;
  sample?: true;
}
