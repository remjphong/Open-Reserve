# OpenReserve — Minh bạch quyền lợi dịch vụ trả trước

> **Prototype trên Avalanche Fuji · Không phải dịch vụ tài chính/thanh toán VNĐ hoặc bản phát hành thương mại.** Repo triển khai ở nhánh `unihack-final`; tại thời điểm tạo bản tài liệu này, **default branch `main` vẫn là README placeholder**. Việc chuyển default branch cần Owner phê duyệt riêng.

**Bắt đầu trong 60 giây:** [Hướng dẫn giám khảo / mã nguồn / demo an toàn](docs/JUDGE_REVIEW_GUIDE.md) · [Chỉ mục bằng chứng & giới hạn xác minh](proofs/RELEASE_EVIDENCE_INDEX.md) · [Tầm nhìn đa ngành & lộ trình scale có bằng chứng](docs/PRODUCT_VISION_AND_SCALE_ROADMAP.md) · [ReserveVault.sol](contracts/src/ReserveVault.sol) · [CI Compose / workspaces / contracts](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341).

### OpenReserve giải quyết vấn đề gì?

OpenReserve là bản mẫu ghi nhận quyền lợi và quyết toán gói gym trả trước trên **Avalanche Fuji (chain 43113)**. Người mua cần biết khoản đã trả trước được phân bổ và hoàn như thế nào; gym đồng thời cần giữ dòng tiền nhận trước để vận hành. Trong khảo sát nhỏ do Owner cung cấp có 21 phản hồi, 14 người từng mua gói trả trước, 8 trong 14 người này tự báo cáo đã mất giá trị chưa dùng. Đây là mẫu thuận tiện, **không đại diện thị trường**, và việc bỏ lỡ buổi tập **không tự động tạo quyền hoàn tiền**.

Prototype thử nghiệm hai chính sách: **PER_SESSION / PT 10 buổi** phân bổ giá trị cho buổi đủ điều kiện, trong khi **TIME_ACCESS** ghi nhận quyền truy cập theo thời gian hợp lệ đã trôi qua, **không đếm check-in**. Ba portal Customer, Gym và Operations xem cùng trạng thái từ `ReserveVault`; UI và Indexer không có quyền tự xác lập số tiền hoàn hoặc được rút.

Theo chứng cứ RPC do Owner cung cấp, Wallet reviewer và CTO đã chấp nhận **có giới hạn**, PT Agreement #1 nạp **1003** đơn vị nhỏ nhất mock MRES: gym đã chốt/rút **100**, Buyer đã được duyệt và nhận hoàn **903** sau quy trình đề nghị–chấp thuận–nhận hoàn; `refundable=0` sau TX3. TIME_ACCESS Agreement #2 nạp/đã chốt/đã rút **900** đơn vị nhỏ nhất. Đây là **18-decimal ERC-20 base units, không phải 1003 hay 900 MRES nguyên token, không phải VNĐ**. Chưa có pilot gym được ký, bảo đảm lợi nhuận bên cung cấp, xác nhận pháp lý lưu ký VNĐ, bảo hiểm, PMF hoặc kiểm toán bảo mật chính thức.

**EN:** OpenReserve is a bounded **Avalanche Fuji testnet prototype** for auditable prepaid-service accounting. A React/TypeScript application hosts Customer, Gym and Operations role portals; three separately executable Fastify backends support catalog/evidence, chain indexing and economic scenarios. `PER_SESSION` credits eligible sessions and `TIME_ACCESS` credits eligible elapsed access. Owner-provided, reviewer-accepted testnet records demonstrate conditional PT refunds and time-based gym payouts in mock ERC-20 **base units**. No public production deployment, legal fiat custody, signed gym pilot or provider profit neutrality is claimed.

### Tầm nhìn sau gym — nghiên cứu đa ngành, không phải tính năng đã triển khai

**[GIẢ THUYẾT CHIẾN LƯỢC]** Gym PT10 là trường hợp thử nghiệm đầu tiên của OpenReserve, không phải toàn bộ phạm vi dài hạn. Nhóm ưu tiên **(1) gym PT chuẩn hóa để chứng minh cơ chế**, **(2) yoga/Pilates và lớp thể thao 10 buổi đồng giá để kiểm chứng nhu cầu**, **(3) spa/wellness phi y tế theo buổi đồng nhất để nghiên cứu khả năng đa ngành**. Các gói có hạn sử dụng/hủy lịch, gói hỗn hợp và điều khoản theo mốc **chưa được v1 thực thi đầy đủ**. Đây là thứ tự ưu tiên *nghiên cứu*, không phải đã ký đối tác, có TAM, doanh thu hoặc product-market fit.

**Ranh giới đặc biệt quan trọng:** Khoản hoàn trên Fuji đã minh họa trường hợp **Merchant hợp tác chấp thuận**; v1 **chưa có tự động xử lý đề nghị chấm dứt khi Merchant biến mất và im lặng**. TIME_ACCESS ghi nhận giá trị theo thời gian hợp lệ, **không tự xác minh phòng gym thực sự mở cửa**. Mô hình giữ tiền còn tạo **cash gap và rủi ro contribution margin** cho doanh nghiệp; chưa có nguồn tài trợ hay xác nhận pháp lý VNĐ. Xem [roadmap có bảng nguồn và điều kiện loại trừ](docs/PRODUCT_VISION_AND_SCALE_ROADMAP.md), [CTO phản biện Round B](https://github.com/remjphong/Open-Reserve/issues/40#issuecomment-7057230725) và [unit economics giả định](research/unit-economics.md).

### Ba vai trò và lý do cần Avalanche

- **Customer:** xem gói PT/TIME_ACCESS, phân biệt `remainingLocked` và `refundable`; không được hoàn chỉ vì vắng mặt.
- **Gym/Merchant:** so sánh `earnedFinalized`, `gymWithdrawn` và `withdrawable`, tránh nhầm doanh thu đã chốt với tiền đã rút.
- **Operations/Resolver:** đối chiếu claim, hash bằng chứng và vai trò phân xử, chỉ đọc trong bản demo; không tự xác thực dịch vụ gym thực tế.

**Vì sao on-chain?** Nếu tất cả quyết toán chỉ nằm trong một cơ sở dữ liệu Web2 do một bên kiểm soát, các bên phải tin một sổ cái riêng. `ReserveVault` trên Fuji để Buyer, Merchant và Resolver đối chiếu **cùng quy tắc, quyền rút/hoàn và sự kiện trên chuỗi**; web và Indexer là lớp hiển thị/dữ liệu dẫn xuất. Điều này **không** chứng minh doanh nghiệp gym thực, buổi tập ngoài đời hoặc quyền lưu ký tiền pháp định. [Hợp đồng](contracts/src/ReserveVault.sol) · [Kiến trúc](OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md).

### Demo sáu màn hình — chỉ đọc

Khi **Owner đã chạy local** trên `http://localhost:5175`, kết nối đúng tài khoản Core trên Avalanche Fuji 43113 và chỉ đọc Vault:

| Thứ tự / ví | Tuyến trên ứng dụng local | Bằng chứng trên giao diện do Owner cung cấp |
| --- | --- | --- |
| 1 · Buyer | `/customer/passes/1` | PT #1: nạp 1003, gym đã rút 100, Buyer đã nhận 903, `refundable=0` |
| 2 · Buyer | `/customer/passes/2` | TIME #2: gym đã chốt và rút 900 |
| 3 · Merchant | `/gym/agreements/1` | PT #1: đọc trực tiếp hợp đồng và sổ cái |
| 4 · Merchant | `/gym/agreements/2` | TIME #2: `earnedFinalized=900`, `gymWithdrawn=900` |
| 5 · Resolver | `/operations/disputes/1?claimId=1` | PT claim #1 đã chốt, gym được phân bổ 100 |
| 6 · Resolver | `/operations/disputes/2?claimId=1` | TIME claim #1 đã chốt, gym được phân bổ 900 |

**Nguồn:** [CTO nghiệm thu 6/6 màn hình với giới hạn](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055805314) là **OWNER_REPORTED**, gồm ảnh và nội dung Owner copy từ browser; **không phải bản ghi demo liên tục đã bấm giờ**. `localhost` **không phải public deployment**. Xem [hướng dẫn chuyển ba ví và tái lập an toàn](docs/JUDGE_REVIEW_GUIDE.md).

**CẢNH BÁO READ-ONLY:** Không nhấn **Approve, Deposit, Confirm, Claim Refund / Nhận token được duyệt hoàn, Claim Earned, finalize, Resolver decision** hoặc ký thông điệp/giao dịch. Một số Buyer CTA trong source có thể gọi `wallet.writeContract`. Chỉ dùng nút kết nối/làm mới dữ liệu **đọc**; dừng trình bày số dư nếu sai ví/mạng, lỗi RPC hoặc `LEDGER_MISMATCH`.

### Mã nguồn, khả năng chạy lại và kết quả thực tế

| Chủ đề | Kiểm tra ở đâu | Trạng thái bằng chứng |
| --- | --- | --- |
| Solidity/Foundry: PT 10 phiên, TIME_ACCESS, claim/refund | [Vault](contracts/src/ReserveVault.sol) · [Foundry tests](contracts/test) · [SDK](packages/contracts-sdk) | **SOURCE_VERIFIED**; CI chứng minh `forge build`, không tự suy diễn `forge test` đã chạy trong CI |
| Một React/TypeScript app, ba portal | [Source frontend](apps/web/src/portals) | **SOURCE_VERIFIED**; không phải ba website public độc lập |
| Ba Fastify services, database boundaries | [Services](services) · [Compose proof](proofs/d18-11-compose-integration.md) | **CI_VERIFIED** Compose 3/3 jobs tại [run 44848508341](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341), không chứng minh ba services đang chạy tại Owner local |
| Fuji TX và refund PT sau TX3 | [Wallet2 receipts + Owner RPC](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053821341) · [CTO chấp nhận có giới hạn](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053895754) | **OWNER_REPORTED / WALLET_REVIEWED**, không phải fresh independent RPC audit |
| Nghiên cứu và economics | [Surveys](research/primary-surveys.md) · [Unit economics](research/unit-economics.md) | Mẫu nhỏ; tình huống provider giảm **420.000 VNĐ [MINH HỌA]**, chưa xác minh thực tế |

**Public testnet:** chain `43113`; `ReserveVault` `0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad`; mock MRES `0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9`. **Số dư demo = đơn vị nhỏ nhất của MRES 18 decimals**, không phải VNĐ; diễn giải chi tiết trong [evidence index](proofs/RELEASE_EVIDENCE_INDEX.md).

**Trạng thái pre-demo 21/11/2026 (Owner WSL, không phải giám sát liên tục):** frontend `:5175` PID4180 trên release SHA `26bdcc45715830553b78e3fb6fc3707c9a8bd8da` và 6/6 HTTP routes PASS; public Fuji RPC chain43113/head block61406125 PASS; **cả ba backend local 3001/3002/3003 `/health` và `/ready` đều HTTP000/DOWN**. Indexer full historical Fuji sync **NOT_VERIFIED**. No current independent wallet negative-path QA, same-block 3-role proof, continuous timed rehearsal, playable backup video or Owner submission receipt. [Actual preflight report](https://github.com/remjphong/Open-Reserve/issues/38#issuecomment-7056121170).

**Định hướng đánh giá:** Theo [Avalanche Team1 VN UniHack Builder Hub](https://build.avax.network/events/596c0b2d-63aa-4cf0-a0ad-a7e34ddbfdc0), tiêu chí gồm *value proposition*, *technical complexity*, *usage of Avalanche technologies* (không công bố trọng số điểm trong nguồn được kiểm tra). Xem [bản đồ tiêu chí → bằng chứng](docs/JUDGE_REVIEW_GUIDE.md) và [chỉ mục bằng chứng](proofs/RELEASE_EVIDENCE_INDEX.md). Official Builder Hub ghi hạn nộp **25/11/2026 05:59 (UTC+7)**; hạn nội bộ 21/11 15:00 là mốc khác. Owner chịu trách nhiệm nộp repo, slides và tài liệu bổ trợ thực tế; hiện **SUBMISSION_RECEIPT=NOT_VERIFIED**.

---

## Tài liệu sprint

1. [Execution Lock 1.2](OPENRESERVE_EXECUTION_LOCK_16-20_NOV_2026.md) chốt phạm vi, tiêu chí nghiệm thu và State Log.
2. [Three-Portal UX Spec 1.1](OPENRESERVE_THREE_PORTAL_UX_SPEC_2026-11-16.md) mô tả ba portal, giao diện và quyền người dùng.
3. [Microservices Architecture 1.0](OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md) mô tả ranh giới service, API và chủ sở hữu dữ liệu.

`docs/` lưu đặc tả triển khai, `proofs/` lưu bằng chứng kiểm thử và `research/` lưu tài liệu nghiên cứu đã ẩn danh. Theo dõi kết quả từng task ở mục H của Execution Lock.

## Chạy D16-09

Cần Node.js 24, npm 11 và Foundry. Xem [hợp đồng API](docs/service-contracts.md).

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run test:isolation
(cd contracts && forge build)
npm run sdk:check
```

Mở ba terminal và chạy mỗi service một lệnh. Cổng mặc định lần lượt là 3001, 3002 và 3003.

```bash
npm run start --workspace @openreserve/catalog-evidence
npm run start --workspace @openreserve/chain-indexer
npm run start --workspace @openreserve/economics
```

Gọi `curl -i http://127.0.0.1:3001/health` hoặc `/ready` ở các cổng tương ứng.
Catalog và Indexer nhận `DATABASE_URL` riêng theo role/database đã định. Indexer
nhận thêm `RPC_URL` và `CHAIN_ID` (Fuji mặc định 43113, local 31337).
Thiếu cấu hình vẫn khởi động được nhưng `/ready` trả 503 cho dependency chưa sẵn
sàng. Indexer luôn degraded ở D16-09 vì chưa có đồng bộ. Economics sẵn sàng khi chạy.

### Docker Compose

Sao chép `.env.example` sang `.env`, đặt mật khẩu dev riêng ở dạng URL-safe
(chữ, số, dấu gạch dưới hoặc gạch ngang) và tùy chọn URL RPC của Fuji.
Postgres chỉ lắng nghe trong mạng Compose, và script phân quyền chạy khi
volume PostgreSQL được khởi tạo lần đầu. Đổi mật khẩu bằng SQL trên volume
đã tồn tại hoặc dùng volume phát triển mới với dữ liệu có thể bỏ.

```bash
docker compose --env-file .env.example config --quiet
docker compose up --build -d
docker compose ps
docker compose up -d --no-deps --build economics
```

### D18-11 — Compose preview và ba API proxy

`docker compose up --build -d` chạy **web :4173**, Catalog :3001, Chain
Indexer :3002, Economics :3003 và PostgreSQL. Mỗi backend là container riêng;
`catalog_db` và `chain_db` có user riêng. Vite dev/preview proxy theo
`/api/catalog/*`, `/api/chain/*`, `/api/economics/*` về `/v1/*`
của service tương ứng; **không thêm gateway service**.

Các URL preview/refresh: `http://127.0.0.1:4173/customer`,
`/gym`, `/operations` và các deep link của từng portal. Chạy kiểm tra
không ký giao dịch:

```bash
docker compose --env-file .env.example config --quiet
docker compose --env-file .env.example up -d --build
node scripts/compose-smoke.mjs
docker compose --env-file .env.example ps
```

Script smoke mặc định dùng `.env.example` **không có Fuji RPC** và kiểm
Indexer `/health=200`, `/ready=503`, `/v1/sync=503`; không dùng kết quả
này để chứng minh historical sync. Nếu cấu hình Fuji RPC thật, kiểm tra trạng
thái hiện tại bằng `/api/chain/v1/sync` và `/api/chain/ready` theo dữ liệu thật,
không ép trạng thái PASS. Các biến `VITE_*` trong `.env.example` là public
config tùy chọn cho ví trình duyệt; **không đặt RPC URL có credential hoặc khóa
bí mật vào VITE**. Khi chưa điền, các màn hình on-chain phải báo chưa cấu hình.

`/health` chỉ chứng minh process còn sống, `/ready` còn kiểm tra DB/RPC/sync;
Docker healthcheck Indexer cố ý dùng `/health`, không ngụ ý số liệu đã cập
nhật. **Full Fuji historical sync vẫn NOT_VERIFIED**; mã D18-10 có bounded
real event proof riêng. D18-11 kiểm thử HTTP/Compose; giao dịch Fuji nhiều
vai và ảnh browser cần bằng chứng bổ sung ở D19/D20.

Xem [hướng dẫn nghiệm thu và giới hạn D18-11](proofs/d18-11-compose-integration.md).
