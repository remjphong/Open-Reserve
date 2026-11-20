# OpenReserve — Legal scope, user trust and unresolved approvals (D19-05)

**Classification:** RESEARCH-RISK ANNEX / NOT A LEGAL OPINION.
**Scope:** UniHack 2026 prototype; Avalanche Fuji C-Chain 43113; mock ERC-20 only. The group has not supplied a jurisdiction-specific legal opinion, operating license, fiat custody contract, KYC/AML compliance review, commercial merchant agreements, or authenticated production deployment.

## What can be accurately claimed

1. **Demonstration:** A `ReserveVault` smart contract and separate mock token deployed on Avalanche Fuji can represent prepaid-service rights and bounded on-chain settlement in a testnet demonstration.
2. **Two policies:** ten-session `PER_SESSION` rights and elapsed-time `TIME_ACCESS` rights differ. TIME_ACCESS Fuji demo 270 seconds, 60-second challenge; not 90-day real proof.
3. **Financial visibility:** when known-agreement live Vault reads succeed, show locked, finalized/withdrawable, buyer-authorized refundable and disputed balances separately. Indexer history is a **derived read model** and may be delayed or unavailable; never substitute stale database totals for chain balance.
4. **Dispute controls:** Resolver can act only through narrowly defined contract methods and claim/termination budgets. A route named Operations does not itself provide signing authority.
5. **Privacy:** public blockchain addresses and hashes can be cited as on-chain evidence. They do not establish real gym identity, independent class attendance, customer consent, or merchant eligibility.

## Claims that are NOT validated

- “OpenReserve guarantees that all unused classes will be refunded”: false as a general description. Refund is subject to actual contract rights, authorized termination/dispute and available escrow.
- “The project provides regulated fiat escrow, payment services, insurance or bank-equivalent custody in Vietnam”: not established. No real VND custody in testnet prototype.
- “A group of gyms has agreed to participate” / “production deployed”: no verified pilot agreements, source-of-funds operation or public deployment evidence.
- “Our fee model preserves every provider's profit”: economics unverified; see the negative scenario in `research/unit-economics.md`.
- “D18-10 proves full Fuji historical completeness”: only a bounded real event plus PostgreSQL replay was verified at its accepted checkpoint. Full continuous reconciliation remains NOT_VERIFIED until genuinely tested.
- “Wallet 1 owner-demo session is independently verified attendance”: the provided evidence hash is marked `OWNER_ATTESTATION_DEMO_NOT_INDEPENDENT_SERVICE_RECORD`.

## Must-resolve items before any real-world pilot

| Risk / question | Evidence required | Present status |
|---|---|---|
| Nature of custody, funds, refunds and fee flows under applicable Vietnam law | Qualified local legal analysis, lawful payment/custody arrangement | NOT_VERIFIED |
| Consumer contractual terms and lawful termination/refund conditions | Counsel-reviewed buyer/merchant contracts and fair disclosure | NOT_VERIFIED |
| Merchant cash flow/profit effect | Provider accounts, cash-gap and contribution tests, explicit compensation if applicable | NOT_VERIFIED |
| Identity, evidence authenticity and dispute resolution | Role authentication, signed nonce/domain/chain proof, real service logs, dispute policy | Prototype; production NOT_VERIFIED |
| Data privacy and evidence retention | Data minimization, lawful basis, access rules, retention/deletion policy | NOT_VERIFIED |
| Smart-contract operational security | Independent security review, deploy/runbook controls, incident procedures, upgrade strategy | NOT_VERIFIED |
| Stable asset valuation, network costs and chain disruptions | Treasury/legal feasibility and recovery protocol | NOT_VERIFIED |

## Words for the demo and submission

> OpenReserve là bản mẫu nghiên cứu trên Avalanche Fuji, nhằm minh họa cách tách quyền lợi của người dùng và phần doanh thu nhà cung cấp đã thực sự đủ điều kiện nhận. Hai chính sách gói 10 buổi và gói theo thời gian được xử lý khác nhau. Hoàn tiền chỉ xảy ra khi điều kiện hợp đồng và quy trình ủy quyền cho phép. Chúng tôi chưa triển khai lưu ký VNĐ, chưa xác thực hiệu quả kinh doanh ở gym thực tế, và chưa có kết luận pháp lý để thương mại hóa.

## Owner acceptance boundary

Owner personally approves each exact testnet transaction and signs using the role-correct wallet. General CTO approval of source changes is **not** approval to sign, transfer tokens, retry broadcast, change frozen terms/ABI, activate Plan B, or submit a final application on the Owner's behalf. On-chain transaction receipts, GitHub CI, screenshot render and official submission acceptance are separate proof types.
