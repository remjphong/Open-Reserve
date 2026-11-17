# D17-07 Customer Portal

Baseline `0f3dadac5bef8814433843b4356af026181eb0b7`. Node 24.22.1, npm 11.9.0, Foundry 1.7.1 and headless Chromium.

| Command | Exit | Observation |
| --- | ---: | --- |
| `npm ci` | 0 | Installed the lockfile with the typed contracts SDK workspace and viem 2.58.0. |
| `npm run typecheck` | 0 | All workspaces. |
| `npm run build` | 0 | Vite reports the entry bundle is larger than 500 kB before compression. |
| `npm test` | 0 | Available workspace suites. |
| `npm run test:isolation` | 0 | Three independent service start and stop/restart cycles. |
| `node proofs/ui/d17-07/verify-routes.cjs` | 0 | Customer paths, disabled unconfigured writes, all three portal entry points and no horizontal overflow at 1440×900 and 390×844. |
| `node proofs/ui/d17-07/verify-local.mjs` | 0 | See below. |
| `forge test --root contracts` | 0 | 60/60. |

## Local reproduction

Build the SDK with `npm run prebuild` and the contracts with `forge build --root contracts`. Provide Playwright/Chromium to either browser script via `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` or install the Playwright browser separately. With the unconfigured app on port 4173, run `verify-routes.cjs` to generate the six screenshots here. The local functional script targets a fresh Anvil on port 8545 and starts its own Vite server on 4174.

The local script deploys the exact baseline contracts and injects a controlled EIP-1193 interface forwarding to Anvil. It exercises rejection and delayed receipt visibility, PT and TIME_ACCESS purchases, buyer-only PT confirmation, both dispute types and an authorized refund. The local experiment uses unlocked, ephemeral test accounts only.

Catalog information is `DEMO_FIXTURE`. The amounts of 1,003 and 900 are base units from the approved demo script. The live pass reads balances and evidence hashes from the Vault. Confirmation is gated on reviewing the evidence reference. No evidence verification is implied.

The web integration accepts public deployment parameters `VITE_VAULT_CHAIN_ID`, `VITE_VAULT_ADDRESS`, `VITE_VAULT_DEPLOYMENT_BLOCK`, and `VITE_MERCHANT_ADDRESS`. Set them only from verified deployment evidence. No addresses are bundled. Local TIME_ACCESS starts 120 seconds after the block used to prepare checkout, with the duration and challenge window taken from the SDK.

Fuji and a physical browser extension were NOT_RUN. Screenshots are ready for human visual review.
