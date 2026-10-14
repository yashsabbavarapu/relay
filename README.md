# Relay v1

Pipelines, validated forwarding, a transfer log, and a loud failures view. Spec: `../files/relay-functional-spec.md`.

- `npm run dev` / `npm run build && npm start`
- Env: see `.env.example`. `RELAY_API_SECRET` (server-only) gates every write route via the `x-relay-secret` header.
- Storage: Vercel KV when `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set, else in memory (resets on restart).
