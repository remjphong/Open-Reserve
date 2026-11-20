# D18-10 local validation — Worker 3

- Base / parent: `d7323a0ed4dbff28127435b7e177c022f2f86ab6`
- Branch: `d18-10-chain-indexer-fuji`
- Execution: `2026-11-20T07:52:23Z` UTC
- API build: PASS_EXIT_0
- Indexer build: PASS_EXIT_0
- Indexer typecheck: PASS_EXIT_0
- Indexer tests: PASS_EXIT_0 **with optional isolated PostgreSQL integration SKIPPED/NOT_RUN**
- Git diff --check: PASS_EXIT_0
- Basic secret patterns: NO_PATTERN_MATCH
- Actual PostgreSQL durability test: NOT_RUN; requires disposable `chain_db`/`chain_user` and explicit opt-in
- Live Avalanche Fuji RPC smoke/reconciliation: NOT_RUN (separate read-only runtime gate)
- Fuji signing/broadcast: BLOCKED
- Full D18-10 acceptance: HOLD for Reviewer 2/Owner
- Raw local logs: `/tmp/openreserve-d18-10-worker3.KBX3f7`; committed sanitized copies in `proofs/d18-10/`
