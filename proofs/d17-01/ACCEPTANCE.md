# OpenReserve D17-01 Phase D acceptance evidence

Phase D VERIFIED. Evidence freeze authorized. D17-01 remains IN_PROGRESS pending
reviewer authorization for commit and PR preparation.

Branch `ai/d17-01-pt-settlement`, baseline
`7738f0153bf59768d91fb56696fc413ba34c91a2`, local Foundry 1.9.0.

## Completed scope

PT session proposal and confirmation, finalization and exact rounding,
ten-session capacity, rejection of duplicate sessions and replays, cancellation
of unanswered proposals, authorized gym earnings withdrawals, independent
agreement accounting, and zero-value slot behavior.

## Verified results

| Check | Result | Command exit | Tee exit |
| --- | --- | ---: | ---: |
| Original formatter on CRLF test file | FAIL | 1 | 0 |
| Resumed formatter after test-file LF normalization | PASS | 0 | 0 |
| Build | PASS | 0 | 0 |
| Focused PT | 11 PASS, 0 FAIL, 0 SKIP | 0 | 0 |
| Deposit regression | 5 PASS, 0 FAIL, 0 SKIP | 0 | 0 |
| Full Foundry suite | FAIL, 40 total, 21 PASS, 19 RED, 0 SKIP | 1 | 0 |
| Source integrity, Git diff check, and RED comparison | PASS | 0 | 0 |

All 19 RED names, selectors, and revert reasons match Phase C. No new RED
cases were introduced. The full suite remains FAIL while D17-02 and D17-03
are outstanding. The refund fuzz test did not reach its intended assertions
because its dependency is unimplemented.

Source delta against baseline is 106 insertions in `ReserveVault.sol` and 126
insertions in `ReserveVault.t.sol`, with zero deletions. The reviewed LF
normalization preserved source content. Source bytes and the tracked diff were
verified again during the evidence freeze.

## Outstanding and NOT_RUN

- D17-02 TIME_ACCESS and D17-03 challenge, termination, and refunds are outstanding.
- D17-04 full invariant and fuzz validation and D17-05 security review are outstanding.
- Native Node.js/SDK verification and Fuji deployment are NOT_RUN.
- CI execution is NOT_RUN for this freeze. Available workflow version declarations
  are recorded below. Unpinned CI versions have no confirmed resolved version.
- Compiler and linter messages are retained verbatim in the raw logs and indexed
  below. No warning remediation was performed in this evidence freeze.

## CI configuration observed at baseline

```text
HEAD:.github/workflows/scaffold.yml:32:      - uses: foundry-rs/foundry-toolchain@v1
```

## Warning and lint excerpts

```text

[fmt]
No warning or lint markers found in this log.

[build]
4:warning[missing-zero-check]: address parameter is used in a state write or value transfer without a zero-address check
12:warning[block-timestamp]: usage of `block.timestamp` in a comparison may be manipulated by validators
20:warning[block-timestamp]: usage of `block.timestamp` in a comparison may be manipulated by validators
28:warning[unsafe-typecast]: typecast can truncate values
34:    ├ note: consider disabling this lint if you're certain the cast is safe
42:warning[reentrancy-events]: event emitted after an external call; reentrancy can reorder or fabricate logs that off-chain consumers rely on
50:warning[unsafe-typecast]: typecast can truncate values
56:    ├ note: consider disabling this lint if you're certain the cast is safe
64:warning[unsafe-typecast]: typecast can truncate values
70:    ├ note: consider disabling this lint if you're certain the cast is safe

[focused]
No warning or lint markers found in this log.

[deposit]
No warning or lint markers found in this log.

[full-suite]
No warning or lint markers found in this log.
```
