# D17-06 · Fuji deployment preparation

**AWAITING_REVIEW. Fuji remains NO-GO pending separate deployment authorization.**

Baseline: `a48cbd28f799d57f30fb27c6e89a306d432d1a1e`. No live deployment, signing, transaction submission, token transfer, approval, or agreement creation was performed. The Solidity deployment script uses Forge's broadcast collection cheatcodes to construct the two CREATEs for simulation. The preflight runner never passes the CLI option that submits transactions.

## Inputs and execution

- Copy the public placeholders from `.env.example` to an ignored `.env.fuji`, or export them through the shell. Load only a trusted local file. Use separate, nonzero test wallets for buyer, merchant and resolver. No key or mnemonic belongs in the file tracked by Git.
- `FUJI_MOCK_INITIAL_SUPPLY` is required, in decimal integer base units. The fixed mock has 18 decimals. The demo allocates **1,903 base units** to buyer, for PT **1,003** and TIME **900**. A larger supply remains with deployer. These amounts are deterministic test fixtures.
- An omitted deployer uses a synthetic local address. For the optional live-fork simulation, supply the intended public deployer and a valid HTTPS Fuji RPC endpoint. Keep credential-bearing URLs untracked. The runner checks `eth_chainId` independently and verifies `43113` before creating a fork. Failed RPC/chain validation never substitutes a local pass for a live result.
- In `contracts/script/DeployFuji.s.sol`, the EVM chain guard runs first. The script verifies roles, supply, and the expected CREATE addresses from the deployer nonce. Demo roles cannot equal the planned Vault or token addresses. The mock runtime hash, supply/mint, decimals, Vault constructor references, and `timeAccessConfig()` are checked after simulation. The expected profile is **270 seconds**, **60 seconds**, and terms-v1.0.1 hash `0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8`. Future deployment review must recheck nonce and configuration; simulated addresses are not deployment evidence.
- The optional RPC branch uses the Foundry `fuji` alias and leaves the fork's chain ID intact. The local branch strips ambient RPC overrides, checks effective configuration and runs offline with explicit chain ID `43113`. This requires Solc 0.8.30 already available locally and Forge 1.9.0. The runner emits status and bounded error labels rather than raw subprocess or RPC output.

From the repository root, with Forge on PATH and dependencies installed from the lockfile:

```bash
unset FUJI_RPC_URL FUJI_DEPLOYER_ADDRESS
export FUJI_BUYER_ADDRESS=0x000000000000000000000000000000000000B001
export FUJI_MERCHANT_ADDRESS=0x0000000000000000000000000000000000006001
export FUJI_RESOLVER_ADDRESS=0x000000000000000000000000000000000000A001
export FUJI_MOCK_INITIAL_SUPPLY=10000
python3 scripts/fuji-preflight.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test-fuji-preflight.py -v
(cd contracts && forge test --match-contract '^DeployFujiTest$' -vv)
```

The local fixture funds buyer from deployer, approves the exact allocation, opens both policies, proposes an elapsed 90-second TIME interval, challenges it, and simulates a resolver split of 200 earned and 75 refundable against its 300-unit budget. It checks the cleared hold, separate PT accounting and unchanged escrow backing. Simulated time uses Foundry's warp locally. The later live demo must wait for actual block time.

## Verification

- `LOCAL_FUJI_PROFILE_SIMULATION=PASS`. `LIVE_RPC_PREFLIGHT=NOT_RUN`, no RPC configured for this run.
- Foundry 1.9.0 / Solidity 0.8.30. Original suite **55/55**, deployment suite **5/5**, full suite **60/60**, zero failures/skips. Python preflight tests **3/3**.
- Formatting, build, Git whitespace, frozen selectors and SDK ABI check passed. Vault, frozen interface, terms, generated SDK and earlier evidence are byte-identical to baseline.
- [verification.log.gz](verification.log.gz) preserves command output and exit codes. Read with `gzip -dc proofs/d17-06/verification.log.gz`.
- Deploy and seed in a later task only after approval. Use a separately authorized external signer or secure local signing configuration. Refresh chain ID, wallet control/gas, nonce, roles and artifact checks immediately before acting.

## Residual testnet limits

| Risk | Control for a later controlled demo |
| --- | --- |
| OR-02 · Fixed resolver | Verify resolver availability and control of its test wallet. The protocol has no rotation or dispute expiry. |
| OR-03 · Claim/termination interlock | Rehearse settlement and closure with bounded numbers of intervals. Live claims can delay termination and a pending proposal blocks new claims. |
| OR-04 · Time-sensitive inclusion | Use on-chain deadlines and leave time for transaction inclusion within the 60-second window. |
| OR-05 · Mock token and wallet operability | Use the approved fixed-supply artifact and verify role wallets independently. Address syntax and distinctness do not prove wallet control. |

This evidence covers preparation and local simulation. It does not establish live Fuji connectivity or production security.
