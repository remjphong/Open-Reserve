# D17-04 financial invariant validation

Baseline: `a7aa173bd85b9ddfc3efc7bc3ac9b89cce2998cc`. Test-only changes. Compiler: Solidity 0.8.30. Runner: Forge 1.9.0.

## Coverage

| Invariant | Executable check |
| --- | --- |
| I1 | Each successful transition checks deposit against withdrawals, refunds and remaining locked. Full closure checks zero remaining balance. |
| I2 | Each transition checks aggregate token backing across two funded agreements. |
| I3 | Each transition checks both withdrawn balances against their authorized amounts. Direct payout calls check returned amount, recipient credit, and Vault debit. |
| I4 | Cancelled and zero-award PT IDs cannot replay. TIME overlap is rejected during a live claim and after zero-award resolution. Adjacent intervals are accepted. |
| I5 | Equal TIME intervals with 0 and 15 check-ins encoded in evidence produce the same finalized earnings. |
| I6 | Allocation and dispute holds are bounded at each transition. Over-budget PT and TIME decisions revert. The last PT slot settles only once and supplemental termination refunds use the exact residual. |
| I7 | Wrong-role actions and payouts revert. Successful direct payouts go only to the agreement wallet. The outsider and resolver balances remain zero. |
| I8 | Each policy tests payout on agreement B while a dispute is held on A. TIME resolution releases only the selected claim's hold. |
| I9 | PT slot amounts are checked against an independent cumulative-floor oracle. TIME checks the full partition, invalid future endpoints, exact deadline equality, and both local and simulated Fuji profiles. |
| I10 | Both parties collect authorized balances directly from Vault, including after closure. Subsequent collection reverts. |

The balance checks also enforce PT consumed-slot identity and live capacity, and zero PT counters and challenge pointer for TIME. Expected reverts compare agreement, claim and termination read models and all fixture token balances before and after.

## Sequence fuzzing

| Test | Sequence depth exercised |
| --- | --- |
| `testFuzz_D17_04_PtSequences` | Nine fuzz-selected PT claim lifecycles after cancellation and zero-award fixtures. Two agreements, isolation payout, then termination, supplemental refund when residual exists, and withdrawals. |
| `testFuzz_D17_04_LastSlotRace` | Nine finalized PT slots, then either order of the two terminal actions on the tenth. |
| `testFuzz_D17_04_TimeLocal` | Three adjacent intervals on A and one on B, two simultaneous holds, bounded split and zero award, deadline and replay checks, then closure and withdrawals. |
| `testFuzz_D17_04_TimeFujiProfile` | Same bounded sequence as local, with the simulated 270-second term and 60-second challenge window. |

Each new test ran 256 cases at seed `0xd1704` in the expanded suite and 256 more at seed `0xd1704002` in the targeted run, with no assumption discards. Deposits are mapped to 1–2048 token units to stress small values and rounding. These are ordered, multi-transaction fuzz scenarios. They check every action against its oracle and snapshot, without a native Foundry invariant handler. The suite does not sample unrestricted orderings across all external methods.

## Reproduction

Run in `contracts/` with dependency installation from the repository lockfile and Forge 1.9.0. The complete command output, including exit codes and actual run counts, is in [forge.log.gz](forge.log.gz). Read it with `gzip -dc proofs/d17-04/forge.log.gz` from the repository root.

- `forge fmt --check`
- `forge build`
- `forge test --no-match-contract '^ReserveVaultInvariantTest$' --fuzz-seed 0xd1704 -vv` — 47/47.
- `forge test -vv` — 51/51.
- `forge test --fuzz-runs 256 --fuzz-seed 0xd1704 -vv` — 51/51.
- `forge test --match-contract '^ReserveVaultInvariantTest$' --fuzz-runs 256 --fuzz-seed 0xd1704002 -vv` — 4/4.

D17-05 security review remains a separate gate. Fuji profile tests change the local chain ID and do not deploy or use a live network.
