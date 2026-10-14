# Build: Relay v1 (functionality only)

Read FIRST: `/home/hatch/workspace/goals/build-the-end-to-end-gtm-ai-application/files/relay-functional-spec.md` (the contract) and `/home/hatch/workspace/goals/build-the-end-to-end-gtm-ai-application/files/build-conventions.md` (stack, storage, write protection, API norms, acceptance — all binding).

## Build order
1. `lib/store.ts` (KV adapter + in-memory fallback) and `lib/seed.ts` (two pipelines, transfers incl. two failed, all `sample: true`).
2. API: `POST /api/pipelines`, `POST /api/pipelines/[id]/ingest` (validate expected_shape keys → forward to destination_url with a timeout → log transfer ok/failed), `POST /api/transfers/[id]/retry`, `GET /api/pipelines`, `GET /api/transfers`.
3. Pages: `/` (minimal), `/pipelines` (list + create form), `/pipelines/[id]` (success rate, transfers, test-payload box), `/failures` (loud: error, payload summary, age, retry), `/log`.

## Notes
- The ingest forward is a real server-side POST with a 10s timeout; a timeout or non-2xx marks the transfer failed with the error captured.
- The failures page is the emotional center: make failed transfers impossible to miss, but stay inside the plain functional UI (no invented theme).

## Acceptance
Per build-conventions.md, plus: curl the full loop (create pipeline → ingest good payload → transfer ok; ingest bad-shape payload → 400; point a pipeline at an unreachable URL → transfer failed → appears in /failures → retry works). Commit, do NOT push. Report the Vercel setup (new project, KV, RELAY_API_SECRET server-only).
