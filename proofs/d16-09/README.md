# D16-09 verification

Base: `5b144518fe19693e71900f16c8464f595ad5e017` (owner merge of PR #7).
Node.js 24.22.1, npm 11.9.0, Foundry 1.5.0, standalone Docker Compose CLI 2.39.4 and native PostgreSQL 17.6.

| Command | Observed result | Raw evidence |
| --- | --- | --- |
| `npm ci` | PASS | [npm-ci.log](npm-ci.log) |
| `npm run typecheck` | PASS, six workspaces | [typecheck.log](typecheck.log) |
| `npm run build` | PASS, six workspaces | [build.log](build.log) |
| `npm test` | PASS, Catalog 6, Indexer 8, Economics 4, schema 6, SDK 2. 26 total, 0 failures or skips | [tests.log](tests.log) |
| `npm run test:isolation` | PASS, each service starts alone, then each stops/restarts while both peers still answer with unchanged PIDs. 3 standalone startups, 3 stop/restart checks | [isolation.log](isolation.log) |
| `node scripts/test-db-ownership.mjs` | PASS, real PostgreSQL authenticated sessions, own DB writes rolled back, both cross-DB connections rejected with SQLSTATE 42501. Catalog 200 with correct DB and 503 with wrong role/DB. Indexer DB passes, readiness stays 503 without RPC and sync | [postgres.log](postgres.log) |
| `docker compose --env-file .env.example config --quiet` | PASS with standalone Compose CLI. Docker daemon and container startup/build/isolation NOT_RUN | [compose.log](compose.log) |
| `(cd contracts && forge build)`, `npm run sdk:check` | PASS, 54 ABI entries from frozen interface, exact generated file match | [foundry-sdk.log](foundry-sdk.log) |
| `(cd contracts && forge test)` | 10 PASS, 24 expected RED, 0 skipped, exit 1. Existing settlement test baseline preserved | [foundry-baseline.log](foundry-baseline.log) |

## Reproduce

Run the repository commands in [README](../../README.md) after checking out the PR.
The isolation command launches the built services on loopback ports 3001–3003 and
expects those ports to be free. It deliberately omits DB/RPC configuration.
The Fastify injection suite includes malformed/unreachable DB configurations,
disabled business routes and RPC success, mismatch, unavailability and timeout.
RPC success tests use a loopback JSON-RPC fixture.

For the PostgreSQL check, initialize a disposable PostgreSQL 17 database using
the repo bootstrap and an admin connection. Use `PGHOST` and `PGPORT` for the
admin connection if using TCP. The seeded service roles must authenticate
with passwords. Supply local-only credentials through your environment:

```bash
export POSTGRES_USER=postgres
export CATALOG_DB_PASSWORD=your_local_catalog_password
export CHAIN_DB_PASSWORD=your_local_chain_password
sh infra/postgres-init/01-ownership.sh
export CATALOG_DATABASE_URL=postgresql://catalog_user:your_local_catalog_password@127.0.0.1:5432/catalog_db
export CHAIN_DATABASE_URL=postgresql://chain_user:your_local_chain_password@127.0.0.1:5432/chain_db
node scripts/test-db-ownership.mjs
```

This run used the native PostgreSQL 17.6 server from the
`@embedded-postgres/linux-x64@17.6.0-beta.15` bundle on TCP port 55432.
That bundle lacks the psql CLI, so a local adapter executed the repository
script's exact SQL statements through node-postgres, preserving per-database
connections and literal quoting. The Docker entrypoint path with native psql
remains unverified. The script above is the reproduction path with native psql.

Neither local test covers business route processing, Fuji availability or sync,
financial actions, or fallback UI integration. The 501 responses and
`SYNC_NOT_IMPLEMENTED` are expected at this checkpoint.
