# D18-02 Stage B — ReserveVault review packet

**STAGE_B=ACCEPTED**
**STAGE_B_BROADCAST=COMPLETED**

## Closure

[ĐÃ XÁC NHẬN] The reviewer accepted both Fuji deployments at source commit `cdbaa581f5249459cdc8ede9ab19d8bda8cd0697`. Independent read-only RPC checks agreed with the Stage B receipt and deployed state. This closes the deployment evidence review. It does not constitute a comprehensive smart-contract security audit.

| Field | Verified value |
| --- | --- |
| Vault / deployer | `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad` / `0x111cFcD0F11ca1a11368B1a2Bd1D57c2815F0e23` |
| Transaction | `0x120617c50873b2393289c5f292c065a060d565b99f0fc8707d82071cfb179451` |
| Chain / block / receipt / nonce | Fuji 43113 / 61240386 / status 1, type 2 / 1 |
| Canonical block hash | `0xfd6ead9230b65c0d6e31ab59f693cbdb9012933420a85e3a001620b34f8205f1` |
| Gas / effective gas price / cost | 5006421 gas / 160 wei per gas / 801027360 wei (0.000000000801027360 AVAX) |
| Initcode hash | `0xff722e584bf6acedcc2b9aed29d71d012e9b24dde5fa623c6c0f9827e9772495` |
| Deployed runtime hash | `0xec6e91428e146d4e97b0eed09cf4afbdd701c95a64ca8b6b2a696102242db366` |
| Token / Resolver getters | `0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9` / `0x9eded45c48255039861d4d801Eb4287521A98019` |
| TIME_ACCESS / challenge | 270 seconds / 60 seconds |
| Terms hash | `0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8` |

No discrepancies observed. See [Stage C RPC snapshot](stage-c-rpc-snapshot.json) for the fixed block used to read code and state. OR-02 through OR-05 remain documented. Stage C requires a separate owner decision.

## Historical Stage B preflight

Remote `unihack-final` was checked at `cdbaa581f5249459cdc8ede9ab19d8bda8cd0697`. The clean checkout was built with Forge 1.9.0 and Solidity 0.8.30. All four approved creation/runtime artifact hashes reproduced.

| Artifact | Creation bytecode | Runtime artifact |
| --- | --- | --- |
| MockReserveToken | `0x3c784b65e0a52676ef447e6a3ff1a54a6f574bf52a08f8185d2598b14412ac55` | `0xe6aa6c9b2a82deddad482f6a552ba557d139e81f605e5c7ae9f33dc9e2e26313` |
| ReserveVault | `0x7eef0dd9a36d83475cf4939156abc4b05edf5f6d115f827f2723d2c860f291ad` | `0xa107c80459d2e25e4eef8c714fdd1f7da6877e21b8a2d693b5d163b13c0b0cc4` (immutable template) |

The Fuji RPC independently confirmed Stage A receipt success and canonical block 61238655 for transaction `0xa43f194eb5b5ea568726e8e2106e0faa4ff698d9cd73bacfa854577a35d8890e`. The receipt contract address is `0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9`. Its runtime hash matches the approved artifact. Supply and deployer token balance were both 10000 base units at the Stage B snapshot.

## Fixed-block Stage B checks

- Chain ID: 43113. Block: 61239169. Hash: `0x50cb97298a9748d3b79062d411cbe8eb9a985b9832dbb2a3497f8f6ffe6c1859`, matched on re-read.
- Deployer: `0x111cFcD0F11ca1a11368B1a2Bd1D57c2815F0e23`. Code empty, balance 549999999849290720 wei, fixed/latest/pending nonce 1/1/1.
- Vault CREATE at nonce 1 derives `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad`. Code and nonce at the destination were empty and zero. Address remains PREDICTED_ONLY.
- Proposed transaction: one CREATE from the approved deployer with no recipient and zero native value. Constructor arguments are the verified Token and approved Resolver `0x9eded45c48255039861d4d801Eb4287521A98019`. Keccak-256 of exact initcode with arguments: `0xff722e584bf6acedcc2b9aed29d71d012e9b24dde5fa623c6c0f9827e9772495`.
- Independent unsigned Vault-only `eth_call` and `eth_estimateGas` at block 61239169 passed. Returned runtime matched the artifact after masking compiler-declared immutable slots, whose observed values were the Token, Resolver, 270-second duration and 60-second challenge window. Expected runtime Keccak-256 with immutables materialized: `0xec6e91428e146d4e97b0eed09cf4afbdd701c95a64ca8b6b2a696102242db366`.

## Fee and review boundaries

RPC gas price was 160 wei/gas, header base fee 10, RPC priority quote 150 and maximum sampled five-block median tip 150. Estimate: 5047322 gas. Proposed review limit: 6561519, rounded up from 130% of estimate. At the snapshot planning cap of 170 wei/gas (twice base plus the larger tip indicator), worst-case fee is 1115458230 wei. With a 20% reserve, the review budget is 1338549876 wei. The deployer balance covers this snapshot budget. The cap is an input to review, and must be refreshed and explicitly approved.

Before a separately authorized Stage B attempt, reconfirm pinned remote HEAD, artifacts, chain, Token runtime, deployer signer, latest/pending nonce, predicted address, balances, gas and fees. If any input differs, rebuild the packet for review. After submission, require a successful canonical receipt, matching deployer and nonce, expected contract address and exact materialized runtime hash. Check Token, Resolver, duration, challenge window and terms hash against the approved runbook. An uncertain receipt calls for reconciliation before any retry. Preserve OR-02 through OR-05 and the browser signer end-to-end verification limitation.

At the historical preflight, Stage B and Buyer funding authorization were both NOT_GRANTED. The subsequent Stage B deployment and acceptance are recorded above.
