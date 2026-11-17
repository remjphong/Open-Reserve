# OpenReserve — Codex Working Rules

## Source of truth
- Plan: OR-UH26-ONE-SHOT.
- Read `OPENRESERVE_EXECUTION_LOCK_16-20_NOV_2026.md` and both normative UX/Architecture annexes when required by change control.
- For follow-up tasks, reuse verified context and inspect relevant sections plus the latest State Log.
- Work on exactly one authorized task ID. No scope expansion.

## Repository map
- `contracts/src/` — ReserveVault and Mock ERC-20 (Solidity 0.8.30).
- `contracts/script/` — Fuji deployment configuration.
- `contracts/test/` — Foundry tests.
- `apps/web/` — React, TypeScript, Vite; three portals.
- `services/catalog-evidence/` — Fastify, catalog/evidence.
- `services/chain-indexer/` — Fastify, Fuji read-model.
- `services/economics/` — Fastify, economics.
- `packages/contracts-sdk/` — ABI/types.
- `proofs/` — reproducible evidence.

## Coding and cost
- Prefer existing patterns and dependencies.
- Follow TypeScript strict typing and Solidity integer-unit accounting.
- Do not add dependencies or refactor unrelated files.
- Read only the named files and directly necessary imports.
- Run targeted checks first. Full regression belongs to integration gates.
- Keep output concise: changes, tests, evidence, blockers.

## Commands
- Solidity: `cd contracts && forge build`
- Targeted Foundry test: `forge test --match-test <ExactTestName>`
- Web typecheck: `npm run typecheck --workspace apps/web`
- Service tests: `npm run test --workspace services/<service>`
- Git diff: `git diff --check`

## Safety
- Fuji chain ID: 43113. Mock tokens only.
- Raw ERC-20 amounts are integer base units.
- Never access or disclose signing secrets.
- Never sign, approve, transfer, deposit or broadcast without separate Owner authorization.
- Never claim a transaction succeeded without a receipt.
- Respect Reviewer 2 gates and the Owner's conditional Git merge policy.
- Do not start another task automatically.
