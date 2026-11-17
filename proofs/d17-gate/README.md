# D17-GATE acceptance evidence

Reviewer decision (17 November 2026): **TECHNICALLY_ACCEPTED_WITH_DOCUMENTED_LIMITATIONS** within the local prototype scope. This evidence PR is pending documentation review.

- Accepted and tested integration commit: [`2422b8eef9ec04a15e38f6ca301612d890b9402c`](https://github.com/remjphong/Open-Reserve/commit/2422b8eef9ec04a15e38f6ca301612d890b9402c).
- [PR #19](https://github.com/remjphong/Open-Reserve/pull/19) was merged with ordered parents `46a9bf1d7c7f5cbeb664123d05ff3e0ef1f36214` and `18e043d94ee032bddace870466d4b905bebfc9ec`. D17-01 through D17-09 are in the accepted integration history. `unihack-final` pointed at the accepted commit and `main` pointed at `b85531d3978ca378597df610c3f99f61d0638492` at evidence closure.
- [Scaffold CI run 44064732756](https://github.com/remjphong/Open-Reserve/actions/runs/44064732756) passed on the approved PR #19 head. A separate workflow on the merge commit was not verified.

## Verified post-merge regression

Recovered complete command output from the post-merge run on the exact accepted commit. [The transcript](post-merge-regression.log) includes each command, tool version and observed exit code. Browser scripts were copied unchanged to a temporary directory in the tested checkout to keep their generated images out of tracked proofs. Tool versions were confirmed in the retained runner during evidence closure.

| Check | Result |
| --- | --- |
| `npm ci`, `npm run typecheck`, `npm run build` | PASS. Build emitted a Vite bundle-size warning. |
| `npm test` | 33 PASS, 0 failed, 1 skipped. The skipped opt-in PostgreSQL test passed in the dedicated configured run below. |
| `npm run test:isolation` | PASS. Three standalone startups and three stop/restart cycles preserved peer processes and HTTP contracts. |
| `npm run sdk:check` | PASS. 54 ABI entries match the frozen Solidity interface. |
| `forge test --root contracts` | 60 PASS, 0 failed, 0 skipped. |
| Catalog migration and PostgreSQL integration | Migration applied on disposable PostgreSQL. 9 PASS, 0 failed, 0 skipped. Evidence upload returns HTTP 501 `WRITE_DISABLED`. |
| `node scripts/test-db-ownership.mjs` | PASS. Each role could write to its own schema in a rolled-back transaction. Cross-database CONNECT denied in both directions with SQLSTATE 42501. The Catalog service also rejected the other service's credentials. |
| Economics workspace | 9 PASS. V1 HTTP 501 `NOT_IMPLEMENTED`, v2 workbook A/B/C/D references, coverage boundaries, and request/response validation verified. |
| Customer Chromium and Anvil | PASS at 1440×900 and 390×844, with all three portal entries. The local journey used a controlled EIP-1193 interface, Anvil Vault and simulated Catalog responses to verify purchase, confirmation, challenges and authorized refund behavior. |
| `git diff --check` | PASS. Exit 0 with no output on the accepted checkout. |

Customer references: [existing desktop evidence review](../ui/d17-07/pass-evidence-1440x900.jpg), [existing mobile evidence review](../ui/d17-07/pass-evidence-390x844.jpg), [route regression](../ui/d17-07/verify-routes.cjs) and [local Anvil journey](../ui/d17-07/verify-local.mjs). The images come from the existing D17-07 evidence. The transcript contains the integrated rerun results.

## Acceptance boundaries

[The approved D17-09 Service Contract amendment](../../docs/service-contracts.md#d17-09-amendment--economics-v2) scopes prototype acceptance to functional `POST /v2/scenarios/compare`. The original v1 route remains HTTP 501. A/B/C/D are illustrative research scenarios. No on-chain advance or non-Full-Reserve mode is authorized. Production and real-money custody remain unapproved.

| Item | Status |
| --- | --- |
| Actual Catalog reverse proxy | NOT_RUN |
| Browser wallet extension with a real wallet | NOT_RUN |
| Docker Compose end-to-end runtime | NOT_RUN |
| Fuji deployment | NOT_RUN · `NO-GO_PENDING_SEPARATE_AUTHORIZATION` |
| OR-02 and OR-03 | REPORTED MEDIUM, carried forward from prior review. Severity was not reassessed in this regression. |
