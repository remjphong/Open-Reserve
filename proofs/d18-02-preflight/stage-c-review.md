# D18-02 Stage C — Buyer funding review and closure

**STAGE_C_FUNDING=COMPLETED** · **STAGE_C_TECHNICAL_REVIEW=ACCEPTED**
**EVIDENCE_CLOSURE=ACCEPTED_BY_REVIEWER_2**

[ĐÃ XÁC NHẬN] Owner executed one funding transaction on Fuji and supplied the receipt and balance evidence. Reviewer 2 accepted Stage C. Independent read-only RPC verification reproduced the transaction, its receipt and event, and adjacent-block balances. Source commit: `cdbaa581f5249459cdc8ede9ab19d8bda8cd0697`.

| Check | Independently verified value |
| --- | --- |
| Network and tx | Fuji 43113 · [transaction](https://testnet.snowtrace.io/tx/0xc1abbc794cce5f6b82c3c7868b34883dd35b51a312e92ed410f2cf04b276ee69) |
| Canonical block | 61244005 · `0x58b1d19ce6999c7513dcf4420af64ce4fc6b40eb13ec6b09a25642a8485bae37` |
| Envelope | Type 2, nonce 2, native value 0, gas limit 68795, max fee 170 and priority cap 150 wei/gas |
| Transfer | Exactly one matching Token event from Deployer to approved Buyer for 1903 base units |
| MRES reconciliation | Deployer 10000 → 8097, Buyer 0 → 1903 |
| Deployer AVAX reconciliation | 549999999048263360 → 549999999039922720 wei |
| Receipt | Status 1, 52129 gas × 160 wei/gas = 8340640 wei |
| Nonce reconciliation | Deployer 2 → 3 |

[Transaction and receipt evidence](stage-c-transaction-receipt.json) includes the calldata, exact addresses, decoded event and canonical parent block. To reproduce, use the recorded Fuji RPC with `cast tx`, `cast receipt`, `cast block`, `cast call` for Token balances, and `cast balance` plus `eth_getTransactionCount` for Deployer at blocks 61244004 and 61244005.

This acceptance covers Stage C mock-token funding only. OR-02 through OR-05 remain in scope. No new signing, submission, funding, agreement creation or Vault deposit occurred during the closure.

## Historical preflight statuses

- Initial preflight: `HISTORICAL_STAGE_C_PREFLIGHT=PASS`, `HISTORICAL_STAGE_C_TECHNICAL_REVIEW=AWAITING_REVIEWER`, `HISTORICAL_PREFLIGHT_OWNER_AUTHORIZATION=NOT_GRANTED`.
- Hosted execution checkpoint: `HISTORICAL_OWNER_AUTHORIZATION=GRANTED_CONDITIONAL`, `HISTORICAL_LOCAL_SIGNER=BLOCKED`, `HISTORICAL_BUYER_FUNDING=NO-GO`.

## Confirmed preflight

[ĐÃ XÁC NHẬN] Local HEAD and remote `unihack-final` both resolved to approved source `cdbaa581f5249459cdc8ede9ab19d8bda8cd0697`. The only initial worktree addition was the prior Stage B review evidence. [D18-01 wallet-role evidence](../wallet-roles.md) identifies the exact Buyer wallet below.

| Field | Verified value |
| --- | --- |
| Fuji chain / executed snapshot | 43113 / block 61241011 |
| Snapshot hash | `0xb9e50a9d46a7fabd67bf4a1a613e2ad4695800c0f2d9fa6d96801891bfa2db9e`, matched on re-read |
| Transaction destination | MockReserveToken `0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9` |
| Token runtime Keccak-256 | `0xe6aa6c9b2a82deddad482f6a552ba557d139e81f605e5c7ae9f33dc9e2e26313` |
| Deployer | `0x111cFcD0F11ca1a11368B1a2Bd1D57c2815F0e23` |
| Buyer | `0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B` |
| Exact amount | 1903 base units at 18 decimals, or 0.000000000000001903 MRES |
| Current MRES balances, base units | Deployer 10000, Buyer 0 |
| Current AVAX balances | Deployer 0.549999999048263360, Buyer 0.249999999989479000 |
| Deployer latest / pending nonce | 2 / 2 |
| Simulated transaction | `transfer(address,uint256)`, from Deployer, to Token, zero native value |
| Read-only result / gas estimate | ABI-encoded true / 52919 gas |
| Fee observations | Block base 10, suggested priority 150, gas price 160 wei/gas. Each sampled block's median tip was 150 wei/gas. |

Exact calldata:

```text
0xa9059cbb000000000000000000000000124c7de92df945477caebdc6745756c4b29e7b7b000000000000000000000000000000000000000000000000000000000000076f
```

Calldata Keccak-256: `0x016922cad20d0d851f6f8cd42c1f72c2d427807a7d2c40b38cd9980bfeb00c60`.

## Budget and pending review

- [GIẢ THUYẾT] Proposed type-2 limits are 68795 gas (130% rounded up), max fee 170 wei/gas (twice base plus the observed higher priority indicator), max priority fee 150 wei/gas. Maximum expenditure is **11695150 wei (0.000000000011695150 AVAX)** and native transaction value is zero. Snapshot deployer AVAX covers this proposed ceiling. Refresh before authorization. A fee move can delay inclusion.
- [MINH HỌA] If the exact transfer succeeds with no intervening MRES changes, Deployer and Buyer balances would be 8097 and 1903 base units. Verify receipt, Transfer event and both deltas before recording funding completion.
- [ĐÃ XÁC NHẬN] The read-only correction re-read the original block hash and confirmed the original wallet balances and fixed nonce. Fuji PublicNode returned zero inbound Token Transfer logs for Buyer across the entire inclusive range 61238655–61241011. All 24 bounded subranges independently returned empty. The provider returned the expected boundary block hashes on chain 43113. See the [correction evidence](stage-c-rpc-correction.json) for empty ranges and failed attempts.
- [ĐÃ XÁC NHẬN] Fresh block 61242763, hash `0x5ab4e2757788a4f8ba7763531ebd6b5a76b54725259ce14b7ed477b107e26d7a`, matched on re-read. Both wallets' MRES and AVAX balances matched the original snapshot. Fixed/latest/pending nonce was 2/2/2. The identical calldata returned ABI-encoded true again, with 52919 gas estimated. Fresh base, priority and gas-price observations were 10, 150 and 160 wei/gas. The proposed 68795 gas limit, 170 wei/gas cap and 11695150 wei fee ceiling remain supported at this snapshot.
- [CHƯA XÁC NHẬN] History after block 61241011 was outside the historical scan. Refresh the relevant state and fees immediately before any separately authorized submission. Technical review and owner authorization remain pending.
- OR-02 through OR-05 remain in scope. Stage A/B acceptance is limited to deployment evidence and the approved configuration. No signature, allowance or transfer was requested or performed.

## Reproduction

Use the public Fuji endpoint `https://api.avax-test.network/ext/bc/C/rpc` and set `DEPLOYER`, `BUYER`, `TOKEN`, `VAULT` to the addresses in this packet and the Stage B closure. The commands below read state or encode data locally.

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/unihack-final
git status --porcelain
cast chain-id --rpc-url "$RPC"
cast rpc --rpc-url "$RPC" eth_getBlockByNumber 0x3a676b3 false
cast receipt 0x120617c50873b2393289c5f292c065a060d565b99f0fc8707d82071cfb179451 --rpc-url "$RPC" --json
cast keccak "$(cast code "$TOKEN" --block 61241011 --rpc-url "$RPC")"
cast keccak "$(cast code "$VAULT" --block 61241011 --rpc-url "$RPC")"
cast call "$VAULT" 'timeAccessConfig()(uint64,uint64,bytes32)' --block 61241011 --rpc-url "$RPC"
cast call "$TOKEN" 'decimals()(uint8)' --block 61241011 --rpc-url "$RPC"
for wallet in "$DEPLOYER" "$BUYER"; do
  cast balance "$wallet" --block 61241011 --rpc-url "$RPC"
  cast call "$TOKEN" 'balanceOf(address)(uint256)' "$wallet" --block 61241011 --rpc-url "$RPC"
done
for tag in latest pending; do cast rpc --rpc-url "$RPC" eth_getTransactionCount "$DEPLOYER" "$tag"; done
cast gas-price --rpc-url "$RPC"
cast rpc --rpc-url "$RPC" eth_maxPriorityFeePerGas
cast rpc --rpc-url "$RPC" eth_feeHistory 0x5 0x3a676b3 '[50]'
DATA=$(cast calldata 'transfer(address,uint256)' "$BUYER" 1903)
cast keccak "$DATA"
TX=$(jq -cn --arg from "$DEPLOYER" --arg to "$TOKEN" --arg data "$DATA" '{from:$from,to:$to,data:$data,value:"0x0"}')
cast rpc --rpc-url "$RPC" eth_call "$TX" 0x3a676b3
cast rpc --rpc-url "$RPC" eth_estimateGas "$TX" 0x3a676b3
```

For historical inbound logs, query `eth_getLogs` from block 61238655 through 61241011 with Token as the address, Transfer event topic, null sender and Buyer as the padded recipient topic. Use independent ranges of at most 100 blocks and respect RPC rate limits. [Recorded RPC snapshot](stage-c-rpc-snapshot.json).

### Reproduce the correction

For the historical scan, use `https://avalanche-fuji-c-chain-rpc.publicnode.com`. Check chain ID 43113 and the boundary hashes recorded in the correction evidence. The following read-only filter covers the complete interval in one request.

```bash
HISTORY_RPC=https://avalanche-fuji-c-chain-rpc.publicnode.com
TOPIC=$(cast keccak 'Transfer(address,address,uint256)')
RECIPIENT=$(cast abi-encode 'f(address)' "$BUYER")
FILTER=$(jq -cn --arg token "$TOKEN" --arg event "$TOPIC" --arg buyer "$RECIPIENT" \
  --arg lo "$(printf '0x%x' 61238655)" --arg hi "$(printf '0x%x' 61241011)" \
  '{address:$token,fromBlock:$lo,toBlock:$hi,topics:[$event,null,$buyer]}')
cast rpc --rpc-url "$HISTORY_RPC" eth_getLogs "$FILTER"
```

To reproduce fixed state and simulation, use the earlier commands first with block 61241011 and then with correction block 61242763. For raw JSON-RPC use `printf '0x%x' 61242763` as the correction block tag. Latest/pending nonces and live gas-price/priority quotes are observations at request time. Fee history and transaction simulation can be repeated at their recorded block tags.

## Conditional execution attempt

[ĐÃ XÁC NHẬN] Owner authorization is GRANTED_CONDITIONAL for the single reviewed transfer. Reviewer 2 technical status is ACCEPTED_WITH_LIMITATIONS. The initial status lines above record the previous preflight checkpoint.

The fresh [execution snapshot](stage-c-execution-attempt.json) at Fuji block 61243324 reproduced the approved calldata and runtime hashes. Deployer and Buyer held 10000 and 0 MRES base units, respectively. Fixed/latest/pending nonce was 2/2/2. The RPC did not report an included or pending nonce increment. The exact read-only transfer returned true and estimated 52919 gas. Fresh base fee, priority quote and gas price were 10, 150 and 160 wei/gas. The authorized limits cover these observations.

EXECUTION_STATUS=BLOCKED. The owner's configured Foundry account was unavailable in this workspace. Signer identity could not be checked here. BROADCAST_ATTEMPTED=NO. No transaction hash, receipt or post-transfer balance exists for this attempt. Use the existing account in the owner's local environment and repeat the fresh gates before any submission. No credentials were accessed.

### Local signer recovery checkpoint

The active shell was the hosted scratch workspace and the existing owner account was unavailable. No account-load command, fresh Fuji preflight, signing or broadcast was attempted in this recovery checkpoint. The previous RPC snapshot is historical. Continue in the owner WSL environment with the configured account.
