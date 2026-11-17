# D17-08 Catalog & Evidence

Baseline `0f3dadac5bef8814433843b4356af026181eb0b7`. Draft for review.

- `GET /v1/packages` returns the two versioned demo fixtures using the frozen DTO. Package descriptions are in the DTO's title field. Prices are 1,003 and 900 in MRES base units, with the approved v1.0.1 terms hash and explicit `DEMO_FIXTURE` provenance.
- `GET /v1/agreements/:id/evidence` reads metadata from `catalog_db` as `catalog_user`. The cursor is scoped to its agreement and the immutable record order. An empty query result returns an empty page. A storage failure returns HTTP 503.
- `POST /v1/evidence` remains HTTP 501 `WRITE_DISABLED` for parsed requests. The migration seeds no evidence. The test records disclose their synthetic provenance and their digests are computed from the fixture text.
- To create the evidence table, build the workspace and run `node services/catalog-evidence/scripts/migrate.mjs` with the Catalog service's `DATABASE_URL`. This is a deliberate migration step before calling the evidence endpoint. The health/readiness probe retains its D16 semantics and checks identity and connectivity.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm ci` | 0 | Fixed baseline lockfile. |
| `npm run typecheck` | 0 | All workspaces. |
| `npm run build` | 0 | All workspaces. |
| `npm test` | 0 | Workspace suites. Optional Catalog integration skipped in the unconfigured run and passed in the configured run below. |
| `npm run test:isolation` | 0 | Three independent service start and stop/restart cycles. |
| `node scripts/test-db-ownership.mjs` | 0 | Disposable PostgreSQL using the baseline bootstrap SQL. Cross-DB CONNECT denied in both directions (42501). |
| `node services/catalog-evidence/scripts/migrate.mjs` | 0 | Correct Catalog identity. The same command with the Chain DB identity returned 1 with WRONG_DATABASE. |
| `npm test --workspace @openreserve/catalog-evidence` | 0 | With `D17_TEST_CATALOG_DATABASE_URL` set, 9/9 pass against PostgreSQL. Covers both packages, genuine empty result, labeled records, scoped pagination, DB outage, disabled POST and unchanged probes. |
| `git diff --check` | 0 | Patch hygiene. |

Docker Compose and production DB rollout were NOT_RUN.
