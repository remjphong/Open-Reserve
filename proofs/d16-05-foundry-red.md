# D16-05 ReserveVault RED baseline

Install the locked workspace dependencies with `npm ci` from the repository root. With Foundry 1.5.0 installed, run:

```sh
cd contracts
forge fmt --check
forge build
forge test -vv
```

The clean-run output is in [d16-05-foundry-red.log](d16-05-foundry-red.log). Compilation and test discovery succeeded. The test command returned exit 1 with 29 failures and no skips. The placeholder reverts with `VaultBehaviorNotImplemented(bytes4)`. Its argument identifies the first unimplemented Vault entry point: 27 failures reach `openAgreement` and 2 reach `timeAccessConfig`. Downstream assertions remain pending. The fuzz test reached its first counterexample before completing a fuzz iteration.

| Scope | Regression targets |
| --- | --- |
| I1, I2 · Conservation | Exact buyer debit and Vault receipt; deposit identity after payouts and refunds; aggregate balance across two agreements; fuzzed deposit and authorized refund amounts. |
| I3, I6 · Payout and refund | Withdrawal only after settlement; refund only after the counterparty or scoped resolver decision; over-budget split and supplemental refund rejection; duplicate withdrawal/refund rejection. |
| I4 · Replay and capacity | Duplicate PT IDs; overlapping and replayed TIME intervals; cancellation retains session ID; head and tail cannot settle the same final slot. |
| I5 · Time-based accrual | 30 of 90 days earns 300 of 900, including comparisons with evidence describing zero and fifteen visits. |
| I7 · Caller authorization | Reject unrelated wallets across proposal, confirmation, finalization, payout and resolution. Cancellation tests reject unrelated wallets and the resolver. Financial transfers use fixed buyer or merchant recipients. |
| I8 · Dispute isolation | A held claim does not block already payable amounts or affect the backing and payouts of a second agreement. |
| I9 · Rounding and boundaries | 10-session allocation totals; two-ended PT refunds before gym payouts; zero award and zero hold; real and accelerated TIME profiles; interval and deadline boundaries. |
| I10 · Direct claims | Buyer and merchant invoke their payable-balance methods directly, without a web or service dependency. |
| D16-04 cancellation | Buyer and merchant can cancel and emit the indexer event; wrong state and repeated cancellation fail; competing challenge remains intact; termination can proceed after the last proposal is cancelled. |

The tests use the v1.0.1 terms hash and import the published ABI declarations. The fixture token is isolated to the tests. The Vault placeholder contains no settlement logic.
