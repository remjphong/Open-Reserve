# OpenReserve D18-10 — Worker 3 implementation evidence

Task: `D18-10 REAL_FUJI_CHAIN_INDEXER`. Base: `d7323a0ed4dbff28127435b7e177c022f2f86ab6` (`unihack-final` after D18-08 PR #24 merge). Execution Lock Rev 1.2. No contract/ABI/service-boundary changes. No signing/broadcast.

- Source: Fastify Chain Indexer port 3002; read `eth_chainId`, deployment receipt, runtime code `keccak256`, canonical blocks, 100-block max `eth_getLogs`, `eth_call` (Vault `getAgreement/getBalances`).
- The 14 Vault events (first indexed agreement ID) are parsed from locked IReserveVault signatures; unrelated Token transfers are not represented as agreement history.
- `chain_events` is unique `(chain_id,tx_hash,log_index)`; window replay replaces overlapping events inside the same DB transaction; `agreement_projection` holds indexed opening metadata **only**, not financial authority; `sync_checkpoint` persists height and block hash.
- Reorgs beyond a demonstrably valid replay window are **not certified resolved**; checkpoint hash mismatch causes DEGRADED. RPC gaps, bad code hash, wrong chain, wrong block/log hashes fail closed.
- The indexer lags chain tip by two blocks intentionally; `/v1/sync` distinguishes catching up and verified idle. No `VERIFIED_EMPTY` inference from unindexed history.
- `/v1/agreements/:id` reads current Vault balances using `eth_call` and cross-checks against immutable indexed fields. Incomplete/not-proven ID history returns 503, never a guessed 404 or fake empty.
- `/v1/agreements/:id/events` pages authentic raw Vault event logs with source and stale metadata. `GET /v1/sync` is 503 with a full schema DTO when degraded.
- The P1 reconnect merchant-history issue from D18-08 is not expanded into D18-10.

## Reproducibility

Normal commands (run from repository root after applying scope-guarded patch):

```bash
npm run build --workspace @openreserve/api-contracts
npm run build --workspace @openreserve/chain-indexer
npm run typecheck --workspace @openreserve/chain-indexer
npm run test --workspace @openreserve/chain-indexer
git diff --check
```

The optional `store.integration.test.mjs` is intentionally `SKIP/NOT_RUN` unless the operator provides an **empty disposable PostgreSQL** configured with database=`chain_db`, user=`chain_user`, and both `D18_10_TEST_DATABASE_URL` and `D18_10_ALLOW_TEST_DB_WRITES=1`. This test performs writes to that disposable DB; do **not** point it at a live production DB.

### Runtime gates requiring separate evidence

`FUJI_LIVE_LOG_SMOKE=NOT_RUN` until an authorized read-only RPC run records real log(s), indexed Agreement #1, `lastIndexedBlock`, and direct Vault balance reconciliation. To reproduce the read-only Fuji gate after the service and isolated PostgreSQL are running, invoke `node services/chain-indexer/test/smoke-fuji-readonly.mjs` with `FUJI_RPC_URL` set. The script checks the indexed opening receipt and five money fields against a new `eth_call`; it never signs.

`PG_DURABLE_RESTART=NOT_RUN` until isolated actual PostgreSQL integration is executed. `FULL_D18_10_ACCEPTANCE=HOLD` until Reviewer 2 and Owner accept those gates. Do not claim completed live chain history based on offline fixtures.
