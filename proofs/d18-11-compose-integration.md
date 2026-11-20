# D18-11 — Compose End-to-End | Implementation / Evidence Gate

**Task:** D18-11. **Branch:** `d18-11-compose-integration`.
**Base:** `ad1aa37d975363f7d6a2e07aed0f53ac8b9001da`.
**Authority:** Execution Lock Rev 1.2; CTO has exclusive controlled-merge decision.

## In-scope changes

- Vite dev + preview reverse-proxy route mapping: `/api/catalog`, `/api/chain`, `/api/economics`, no new backend.
- Compose web-to-service DNS config, process healthcheck, optional public `VITE_*` network identity. All three existing services and two distinct DB roles remain unchanged.
- Real GitHub-hosted Docker Compose integration gate: builds and launches five containers, probes three role URLs and deep-link refresh, HTTP API routing, contract schemas, readiness/degraded behavior, read-only catalog fixtures, denied evidence writes, DB cross-connect denials, economics selective recreation, indexer stop/restart and non-fabricated proxy outage.
- Every check is HTTP/DB/Compose-only: no wallet, Fuji signing, broadcast or fixture-sourced checkpoint.

## Reproduce locally (after Owner terminal status has been inspected)

```bash
docker compose --env-file .env.example config --quiet
docker compose --env-file .env.example up -d --build
node scripts/compose-smoke.mjs
docker compose --env-file .env.example ps
docker compose --env-file .env.example logs --tail=100
```

Smoke script expects **no Fuji RPC** in `.env.example`: Indexer liveness 200,
readiness 503 and `/v1/sync` 503 are **correct degraded evidence** in this
mode, not a failed service or a full-sync PASS. To test a real RPC, use
user-owned protected env, inspect `/api/chain/v1/sync`, and record actual
last indexed block/lag without inferring completeness. Do not log credentials.

Manual browser verification: open `/customer`, `/gym`, `/operations`,
refresh each, then refresh `/customer/passes`, `/gym/agreements/1`,
and `/operations/disputes`. Capture desktop (1440x900) and mobile
(390x844) screenshots only when a real browser is available.

## Expected CI evidence

Workflow `Scaffold / compose` uploads artifact `d18-11-compose-runtime`
with `compose-ps.txt` and bounded `compose-logs.txt` (no `.env` dump).
Standard output records HTTP status codes, service role isolation and the
selective Economics container recreation. A successful job, not merely a
committed test, is required to mark the Compose runtime gate PASS.

## Distinct gates — do not conflate

| Gate | Current evidence rule |
|---|---|
| Source/proxy wiring | Review Git diff, TypeScript typecheck/build and CI |
| Real Compose runtime | Only PASS after green Compose CI + inspect runtime logs |
| Browser screenshots | NOT_RUN until browser images are captured |
| Fuji bounded real event/receipt | Previously PASS under D18-10; do not rerun |
| Full historical Fuji catch-up | NOT_VERIFIED; remain visibly degraded/stale |
| Wallet 1 writes / multi-role payout | OUT_OF_SCOPE / NOT_VERIFIED without receipts |
| Operations live financial read | D18-09, not accepted by this PR |
| Local Owner environment | UNKNOWN until read-only preflight output is received |

If `chain-indexer` is stopped, the proxy must return an error rather than
a fabricated empty activity history; Catalog/Economics/portal HTML remain
operable. Browser direct Vault read for a known agreement is independently
owned by the wallet/RPC layer; the outage test does not claim it was proved
against live Fuji in this CI run.

**No claim of production-ready infrastructure, complete Fuji reconciliation,
legal custody, or live business transaction is authorized by this gate.**
