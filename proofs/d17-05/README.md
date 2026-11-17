# D17-05 — ReserveVault security review

**Original baseline verdict: BLOCKED · NO-GO for controlled Fuji testnet deployment.** One HIGH fund-locking finding was confirmed using the approved MockReserveToken. No CRITICAL finding was confirmed. This review makes no production security certification.

Baseline: `d3249efea33273dc14a4e373e7876d0fcb478591` on `unihack-final`. The production implementation, frozen interface and terms, prior evidence, and State Log were not modified.

## Scope and method

Reviewed Execution Lock Rev 1.2 and State Log, `docs/contract-interface.md`, `docs/product-and-terms-v1.0.1-proposed.md`, `contracts/src/{ReserveVault,IReserveVault}.sol`, `contracts/src/mocks/MockReserveToken.sol`, the three original suites under `contracts/test/`, and `proofs/d17-04/forge.log.gz`. Compared reachable states and accounting against the spec, then checked previously uncovered boundaries in a separate test file. Roles are modeled as distinct operational wallets. The asset model is the fixed-supply OpenZeppelin ERC-20 mock; arbitrary callback, fee, rebase, blacklist, and malicious token behavior are outside the deployment approval. Frontend provisioning, live chain conditions, operational key custody and deployment configuration were not certified.

The audit findings, line numbers and test results below describe the approved pre-fix baseline. The remediation and post-fix evidence are recorded at the end.

## Findings

| ID | Severity | Finding and impact | Mitigation |
| --- | --- | --- | --- |
| OR-01 | HIGH | `openAgreement` can irrevocably lock the entire deposit when the merchant is the Vault itself. The address check at `ReserveVault.sol:67` allows that destination. A real supported token transfer and the OPEN state are possible. Vault has no self-call or recipient-change path. This is a permanent agreement-level lock, not a way to debit another buyer or collect their tokens. | With separate approval, reject `merchant == address(this)` before transfer using the existing `InvalidInput` error. Keep the rejection test, rerun the full suite, and verify a valid merchant can still open. Validate the expected distinct merchant wallet during setup as an additional operational check. |
| OR-02 | MEDIUM | The fixed resolver is a liveness dependency for challenged TIME claims and disputed terminations. There is no expiry, key rotation or unilateral release. An absent or withholding resolver can keep the affected agreement from closing indefinitely. Other agreements and already-authorized payouts remain independent. | Use an available test-only resolver, record response expectations and stop the demo on liveness failure. Introduce recovery only through a separately approved terms/interface change. |
| OR-03 | MEDIUM | A party's active termination proposal blocks new service claims, and unresolved live claims block termination. A counterparty can dispute a proposal to engage the resolver; this does not automatically resume service. Fragmented TIME periods can also require multiple settlement transactions before closure. No historical-scan gas dependency was found. | Keep the demo to a bounded number of intervals and rehearse both closure workflows. Treat an expiry or resumable dispute as a separately scoped change. |
| OR-04 | LOW | TIME uses block-time inclusion, so transactions near the proposal or challenge boundary may land on the other side. This matters for the accelerated 60-second profile. | Display the on-chain deadline and submit with margin. Verify on-chain timestamps and receipt order in the subsequent deployment gate. |
| OR-05 | INFORMATIONAL | Constructor excludes zero/code-empty token addresses and a zero resolver, but does not attest the token implementation or the operability of arbitrary recipient wallets. The accounting relies on conventional ERC-20 behavior. | Pin the deployed mock and its bytecode, and verify role addresses. Reassess a wider asset model or recovery policy separately. |

Severity count: 0 CRITICAL, 1 HIGH, 2 MEDIUM, 1 LOW, 1 INFORMATIONAL. Lint classifications below are separate from these findings.

### OR-01 evidence and reasoning

The minimized defensive regression is `test_D17_05_RejectsVaultAsItsOwnMerchant`. On the supported mock, the expected input rejection fails and the trace shows `AgreementOpened` for a one-unit fixture deposit. The test is retained with its expected rejection. There is no fuzz seed for this deterministic case. The exact command and trace are in `verification.log.gz`, section `[minimized]`.

Root cause: the Vault is a nonzero address distinct from buyer and resolver, so it passes the input guard. A merchant-authenticated PT or TIME claim cannot originate from the Vault's implementation. With the buyer as sole operable party, a termination proposal cannot receive counterparty acceptance or dispute, and the resolver cannot decide an undisputed proposal. There is no rescue or recipient reassignment. The financial balances remain arithmetically conserved, while participant validity and liveness fail. I7/I10 do not provide an exit for an agreement that cannot reach an authorized payout. A separate reviewer decision is required before applying a production fix.

## Archived warning triage (13/13)

All locations below are in `contracts/src/ReserveVault.sol`. Exact diagnostic headers from the D17-04 build:

- **T** ``warning[block-timestamp]: usage of `block.timestamp` in a comparison may be manipulated by validators``
- **R** `warning[reentrancy-events]: event emitted after an external call; reentrancy can reorder or fabricate logs that off-chain consumers rely on`
- **C** `warning[unsafe-typecast]: typecast can truncate values`
- **Z** `warning[missing-zero-check]: address parameter is used in a state write or value transfer without a zero-address check`
- **U** `warning[uninitialized-local]: local variable is read before being initialized`

| # | ID / line | Verdict / severity | Root cause, exploitability and impact | Minimal mitigation / code needed |
| --- | --- | --- | --- | --- |
| 1 | Z / 37:17 | False positive / INFORMATIONAL | Token address is checked via `code.length == 0`, which rejects zero. Resolver has an explicit zero check. | Pin mock bytecode at deployment. No code change for this warning. |
| 2 | T / 75:17 | True positive / LOW | TIME start admission depends on block time. Late inclusion can cause a proposal to revert. No bypass of supported duration or window was identified. | Schedule with margin. No code change for demo. |
| 3 | T / 116:13 | False positive / INFORMATIONAL | This comparison is a narrowing guard at the uint64 limit, not a use of timestamp as randomness or economic eligibility. | Retain bound. No code change. |
| 4 | C / 123:24 | False positive / INFORMATIONAL | Prior guard bounds the very same block timestamp before the uint64 cast. No reachable truncation. | Retain guard. No code change. |
| 5 | T / 167:63 | True positive / LOW | Block time decides when an interval has elapsed. Near-boundary inclusion can affect admission. | Verify receipt time and use a submission margin. No code change for demo. |
| 6 | T / 168:13 | False positive / INFORMATIONAL | Overflow guard rejects timestamps above max uint64 minus the window. | Retain guard. No code change. |
| 7 | R / 186:9 | False positive / INFORMATIONAL | Proposal calls internal helpers and pure arithmetic. No external call or token interaction before ClaimProposed. | Keep event after storage writes. No code change. |
| 8 | C / 181:24 | False positive / INFORMATIONAL | Cast and following deadline addition are both bounded by line 168. Boundary regression passed. | Retain checked arithmetic. No code change. |
| 9 | T / 208:20 | True positive / LOW | Buyer must land strictly before the deadline. Inclusion near the boundary can prevent a challenge. | Client warning and time margin. No code change for demo. |
| 10 | R / 214:9 | False positive / INFORMATIONAL | Authorization, internal math and hold writes do not call external code. No callback to reorder ClaimChallenged. | Keep event after effects. No code change. |
| 11 | R / 484:9 | False positive / INFORMATIONAL | PT finalize helper uses storage, internal arithmetic and emit. It makes no token call. | Retain event/order convergence tests. No code change. |
| 12 | U / 274:89 | False positive / INFORMATIONAL | Solidity initializes local uint8 to zero. Only a positive PT refund replaces it. Zero is the required retired-slot sentinel otherwise. | Optional explicit initialization for readability in a separate change. Not necessary for correctness. |
| 13 | T / 491:13 | True positive / LOW | TIME finalization compares block time with the shared deadline. Boundary admission can shift by inclusion, while challenge and finalize predicates remain complementary. | Use confirmed block timestamps. No code change for demo. |

Solidity default initialization semantics: https://docs.soliditylang.org/en/v0.8.30/control-structures.html

## Entrypoint attack surface (23/23, plus constructor)

All ledger mutators operate on an existing record keyed by agreement ID unless opening the record. Except for deposit and withdrawals, state transitions perform no external token call. Views have no event, mutation, token call or pending-operation effect.

| Entrypoint | Actor and allowed state | Bounds, transition, replay and event | Pending interactions and liveness |
| --- | --- | --- | --- |
| constructor | Deployer, local or Fuji chain ID | Fixed token with code, nonzero resolver, immutable chain-specific duration/window | Mock identity and resolver operability are provisioning requirements |
| token | Any, view | Fixed address | No pending-operation effect |
| resolver | Any, view | Fixed address | No recovery/rotation |
| timeAccessConfig | Any, view | Returns fixed duration/window/hash | No pending-operation effect |
| openAgreement | Caller funds its own agreement | Positive amount, matching terms and profile, exact token receipt, new ID, AgreementOpened | Guarded transferFrom. OR-01 invalid counterparty can lock funds |
| proposeSession | Merchant, OPEN PT | Nonzero fresh ID and hash, live + consumed < 10, permanently records ID, ClaimProposed | Active termination blocks |
| cancelSessionProposal | Either party, OPEN PT, PROPOSED | Cancels and decrements live once, preserves ID, SessionProposalCancelled | Does not touch another claim's hold |
| confirmSession | Buyer, OPEN PT, PROPOSED or current CHALLENGED | Confirm or atomically release held head and finalize, SessionConfirmed then ClaimFinalized | Terminal resolver decision excludes later confirm |
| proposeTime | Merchant, OPEN TIME | Elapsed half-open interval, exact cumulative budget, permanent reservation, ClaimProposed | Active termination blocks. Tree work does not scan history |
| challengeClaim | Buyer, OPEN PROPOSED | Evidence required; one PT pointer including zero, TIME strictly before deadline; adds hold once, ClaimChallenged | Holds isolated by agreement and claim |
| finalizeClaim | Either party, OPEN | PT requires CONFIRMED and no challenge pointer. TIME unchallenged and at or after deadline; ClaimFinalized | TIME subtracts remaining holds from available allocation |
| resolveClaim | Resolver, OPEN CHALLENGED | Nonzero decision, PT gym zero, tail cap, TIME split cap, terminal once; ClaimResolved | Releases only selected hold; no transfer; availability depends on resolver |
| proposeTermination | Either party, OPEN or TERMINATED | No live claims or active proposal, valid refund budget and evidence; TerminationProposed | Active proposal blocks both claim types; OR-03 |
| disputeTermination | Counterparty, PROPOSED | Nonzero evidence, DISPUTED once; TerminationDisputed | Escalation relies on resolver; OR-02 |
| cancelTermination | Proposer, PROPOSED | CANCELLED and clears active ID; TerminationCancelled | Enables new claims only if agreement still OPEN |
| acceptTermination | Counterparty, PROPOSED | Exact proposed amount, budget recheck, terminal and clears ID; AgreementTerminated or TerminationRefundAuthorized | No live claims; existing payouts remain |
| resolveTermination | Resolver, DISPUTED | Nonzero decision, budget recheck, terminal and clears ID; matching first/supplemental event | No live claims; cannot redirect funds or reopen |
| claimEarned | Fixed merchant, OPEN or TERMINATED | Only unpaid earned, positive, effect before transfer, EarnedClaimed | Allowed during pending operations; OR-01 can make merchant unusable |
| claimRefund | Fixed buyer, OPEN or TERMINATED | Only unpaid authorized refund, positive, effect before transfer, RefundClaimed | Allowed during pending operations if already authorized |
| getAgreement | Any, existing agreement | Returns agreement; NotFound otherwise | View only |
| getClaim | Any, existing agreement and claim | Returns live or terminal record; NotFound otherwise | View only |
| getTermination | Any, existing agreement and proposal | Returns live or terminal record; NotFound otherwise | View only |
| getActiveTerminationId | Any, existing agreement | Active ID or zero | View only |
| getBalances | Any, existing agreement | Remaining, payable, disputed and allocation views | Outstanding holds are included in unallocated; no transfer |

## I1–I10 and token/reentrancy assessment

| Invariant | Audit result |
| --- | --- |
| I1 | Conservation covered in successful transitions, maximum-supply split and existing multi-agreement sequences. Accounting conservation alone does not ensure liveness. |
| I2 | Fixed token conservation and exact receipts preserve aggregate backing. Cross-agreement sequences pass. |
| I3 | Withdraw counters precede transfer and cannot exceed authorized values. Repeat direct calls revert. |
| I4 | Session IDs and TIME occupancy survive zero awards and terminal transitions. PT zero-value challenges retain the slot lock pointer. |
| I5 | No visit counter participates in the formula. Existing 0/15 case passes. |
| I6 | Claim and termination bounds reviewed. Maximum-size over-budget split rejected without releasing the hold. |
| I7 | Role gates prevent unrelated payout or assignment in reviewed paths. OR-01 permits an invalid fixed role at agreement creation. |
| I8 | Hold, claims and approvals have per-agreement storage. Existing targeted isolation and simultaneous TIME holds pass. |
| I9 | Cumulative floors, head/tail alternatives and timestamp equality reviewed. uint64 deadline and maximum-deposit tests pass. |
| I10 | Direct wallet withdrawal works for authorized balances. OR-01 blocks an agreement from reaching payout authorization. |

For TIME, accepted intervals are disjoint and each amount is the difference of two cumulative floors. Their budgets cannot sum above the deposit. An interval remains reserved after a decision, including when its award is zero. Finalization consumes only free allocation outside other holds. Resolution bounds the split by subtraction before addition, releases this claim's own amount once, then checks allocation net of all remaining holds. A failing check rolls back the release. Terminal state excludes re-entry into settlement. Termination requires zero live claims, which excludes holds.

For PT, consumed head slots and retired refund tail slots are disjoint. An in-flight challenge snapshots either outcome and holds their maximum. The singleton pointer blocks ordinary finalization even at zero amount. Cancelling another proposal returns only its live capacity. Resolver cannot award gym on PT. Buyer confirmation of the challenged claim and resolver settlement are mutually exclusive. The configured resolver can make a bad evidence decision within those on-chain limits; the contract authenticates authority and ceilings, and does not establish service delivery.

External token interactions are deposit balance reads and SafeERC20 transferFrom, and the two SafeERC20 payouts. All three entrypoints use the same nonReentrant lock. Deposit validates inputs, checks exact receipt before recording a new agreement, and reverts atomically if the token call or receipt fails. The existing short-receipt test verifies rollback. Withdrawals record the debit before transfer and SafeERC20 failure rolls it back. The reviewed MockReserveToken has no callback path. Arbitrary hostile-token reentrancy and payout behavior were not dynamically tested and are outside the supported asset model.

## Tools and results

Forge 1.9.0 (`6056c5845d34205a83cf7108042adb137325c9df`), Solidity 0.8.30. Foundry build lint ran. Slither, Aderyn and Mythril were not installed; those analyses were not run. See `verification.log.gz` for exact commands, full stdout/stderr, exit codes and the minimized trace. Run `gzip -dc proofs/d17-05/verification.log.gz` from the repository root.

| Gate | Result |
| --- | --- |
| Format check and build | Exit 0 |
| Existing tests excluding new suite, seed 0xd1704 | 51 PASS, 0 FAIL, exit 0 |
| New targeted security tests | 2 PASS, 1 FAIL, exit 1 |
| Full suite | 53 PASS, 1 FAIL, 0 SKIP, exit 1 |
| Minimized OR-01 trace | 0 PASS, 1 FAIL, exit 1; expected input rejection missing |
| Git whitespace | Exit 0, with all three audit additions checked through a temporary index |

**Recommendation: NO-GO for controlled Fuji testnet deployment.** Reopen the gate after separately authorized remediation of OR-01, a passing focused test and clean full regression, followed by review of deployment configuration and operational wallets. The fixed resolver, short Fuji challenge window and absence of unilateral recovery remain explicit demo limitations.

## D17-05-HIGH-01 remediation

**AWAITING_REVIEW · NO-GO for controlled Fuji testnet deployment pending reviewer approval.**

OR-01 was a permanent-lock condition on the approved mock-token deployment when an agreement named Vault as its own merchant. The only production change adds `merchant == address(this)` to the existing `InvalidInput()` guard of `openAgreement`, before any token interaction. The original severity remains HIGH for the vulnerable baseline.

- [Pre-fix reproduction](high-01-pre-fix.log.gz): reran the unmodified `test_D17_05_RejectsVaultAsItsOwnMerchant` on baseline `d3249efea33273dc14a4e373e7876d0fcb478591`. Exit 1 and `AgreementOpened` in the trace confirm the missing rejection. The original [independent review trace](verification.log.gz) is also retained.
- [Post-fix verification](high-01-post-fix.log.gz): the exact same test exits 0, with `InvalidInput()` in the trace. The companion test checks unchanged buyer and Vault balances, zero recorded logs, `NotFound` for agreement 1, and valid PT and TIME openings at IDs 1 and 2.
- Forge 1.9.0 and Solidity 0.8.30: format and build passed. Original regression 51/51 PASS, security tests 4/4 PASS, full suite 55/55 PASS with no failures or skips. ABI JSON matches the baseline and the production function selectors match the frozen interface.
- Warning triage above retains all 13 original diagnostics. The only production change is the merchant guard. Remaining warnings, assumptions about the approved fixed mock, timestamp inclusion and wallet operability remain relevant.

### MEDIUM findings carried forward

**OR-02 · Fixed-resolver availability.** A challenged TIME claim cannot take the ordinary finalize path, and a disputed termination cannot use the PROPOSED acceptance or cancellation paths. The corresponding resolution methods require the fixed resolver. No expiry or replacement mechanism grants an alternative exit. A prolonged outage can hold the challenged allocation and delay termination for that agreement. A resolver cannot redirect payouts or block already-authorized collections in unrelated agreements. The post-fix log section `[medium-evidence]` includes `test_DisputedTerminationRequiresScopedResolverDecision`, `test_D17_03_TimeResolutionReleasesOnlyItsOwnHold`, and `test_DisputeIsIsolatedAndPayableFundsRemainAvailable`. The lack of a timeout or rotation path is established by the frozen interface and reviewed state transitions. Use an available test-only resolver and a documented response process. Any on-chain recovery remains a separate design decision.

**OR-03 · Agreement-level claim and termination interlock.** An active termination proposal blocks new PT and TIME claims. Live claims must clear before termination can be proposed or settled. A pending proposal can be cancelled by its proposer or answered by the counterparty. Once disputed, progression depends on the resolver under OR-02. Multiple TIME intervals require individual settlement calls, so a backlog can delay closure even when individual calls remain bounded. The post-fix `[medium-evidence]` section includes `test_D17_03_ActiveTimeTerminationBlocksNewIntervals`, which verifies both directions of the interlock and that cancellation permits new claims when the agreement is open. Limit and rehearse demo intervals and closure workflows. Expiry or a different resumable transition would need separate approval.

Both findings remain MEDIUM. The fix prevents the specific self-merchant configuration. It does not establish that an arbitrary merchant address is operable or change either liveness policy. Fuji deployment and production certification remain outside this review.
