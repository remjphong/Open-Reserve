# OPENRESERVE — EXECUTION LOCK / SINGLE SOURCE OF TRUTH

**Plan ID:** `OR-UH26-ONE-SHOT`  
**Revision:** `1.2 — 2026-11-16 / THREE-PORTAL + MICROSERVICES LOCK`  
**Execution window:** 16/11/2026 → 20/11/2026 (ICT, UTC+07)  
**Internal submission deadline:** **20/11/2026 20:00 ICT** (đã nộp và chụp bằng chứng); tuyệt đối không dồn sang 21/11.  
**Owner / final reviewer:** Người sáng lập OpenReserve (người dùng).  
**Working mode:** *Human-in-the-loop*: AI chỉ thực hiện **một task ID được chọn**, người dùng kiểm tra và phê duyệt xong mới giao task kế tiếp.  
**Status:** TÀI LIỆU KẾ HOẠCH, chưa phải bằng chứng code/deployment hoặc giải thưởng.
**Normative UX annex:** `OPENRESERVE_THREE_PORTAL_UX_SPEC_2026-11-16.md` — BẮT BUỘC ĐỌC.
**Normative architecture annex:** `OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md` — BẮT BUỘC ĐỌC; định nghĩa microservices tối thiểu.
**Changelog 1.2 / CR-ARCH-001:** Người dùng yêu cầu microservices. Chốt một monorepo, một frontend gồm ba portal, **ba backend service chạy trong process/container độc lập**, hai kho dữ liệu thuộc chủ sở hữu khác nhau, một Vault Fuji làm nguồn tài chính duy nhất. Thêm API contract, service contract tests, Docker Compose, healthchecks và failure tests; giữ nguyên mô hình sản phẩm, 02 contract deploy, 03 portal, các bất biến tài sản, deadline 20/11. Thay thế Rev 1.1.
**Changelog 1.1 (giữ lịch sử):** ba portal đa trang thay bốn màn hình; high-fidelity UX là P0.

> **Tuyên bố phạm vi:** Đây là tài liệu điều hành DUY NHẤT cho giai đoạn nước rút, thay thế lịch ngày và cách giao việc “Codex autonomous one-shot” trong các file cũ. Mọi nội dung về nghĩa vụ dịch vụ, pháp lý, dữ liệu khảo sát trong `OpenReserve_Context_Handoff_2026-11-16.md`, `OpenReserve_Decision_Record_V1_2026-11-16.md`, và `OpenReserve_UniHack_ONE_SHOT_MasterPlan_2026-11-16.md` tiếp tục là tài liệu tham khảo, trừ nơi tài liệu này đã khóa phương án thi công cụ thể. Hai annex UX và Architecture là **phần ràng buộc** của Execution Lock, không phải các kế hoạch độc lập. **Không tự thêm yêu cầu từ tài liệu tham khảo.** Nếu mâu thuẫn: dừng, báo người dùng, không tự đổi scope.

## A. PRODUCT LOCK — CỐ ĐỊNH, CẤM AI TỰ Ý SỬA

**Tên:** OpenReserve (không viết OpenReverse trong sản phẩm).  
**One-liner:** Một prototype bảo vệ giá trị dịch vụ trả trước: token thử nghiệm nằm trong Vault trên Avalanche Fuji, gym chỉ được nhận theo nghĩa vụ đã được chốt, người dùng nhận hoàn khi đủ điều kiện; có công cụ minh họa tác động kinh tế cho gym.  
**Không phải:** ngân hàng, bảo hiểm, dịch vụ lưu ký VNĐ đã được cấp phép, marketplace nhiều gym, sản phẩm đã có doanh thu hay đối tác triển khai.

### A1. Bốn năng lực BẮT BUỘC (P0)

1. **ReserveVault trên Fuji giữ Mock ERC-20 token** thật sự (tài sản testnet, không có giá trị tiền thật), không chỉ ghi hash/DB.
2. **Hai loại quyền dịch vụ:** `PER_SESSION` = lượt đã cung cấp và được xác nhận; `TIME_ACCESS` = khoảng thời gian quyền truy cập hợp lệ đã cung cấp, không theo check-in.
3. **Bằng chứng và quyền tài sản:** chặn double payout, chặn rút sai, bất biến tiền, phản đối / phân xử demo giới hạn, hoàn theo quyết định chứ không hoàn tùy tiện số dư.
4. **Business Lab minh bạch:** so A/B/C/D qua lợi nhuận đóng góp gym, dòng tiền/chi phí vốn, chi phí/đóng góp OpenReserve, có ví dụ cho kết quả âm và nhãn [MINH HỌA].

### A1b. THREE-PORTAL EXPERIENCE — P0, KHÔNG PHẢI POLISH

Thay bản thiết kế 4 màn hình cũ bằng **03 cổng ứng dụng (portal)** có nhiều trang và luồng riêng, chia sẻ một React app và một Vault:
- **Customer** `/customer/*`: chọn gói → xem điều khoản → mua bằng Fuji token → xem pass/quyền → xác nhận/phản đối → nhận khoản hoàn hợp lệ.
- **Gym** `/gym/*`: overview → agreement → đề xuất session/time → trạng thái chốt → rút phần earned → Business Lab. Chủ gym ký bằng merchant wallet; nhân viên chỉ được hiển thị **chế độ quan sát demo** nếu không có phân quyền thật.
- **OpenReserve Operations** `/operations/*`: overview → audit agreement → kiểm tra evidence/event → dispute → quyền resolver giả lập có giới hạn → kết quả. OpenReserve **không** có quyền rút tiền tùy ý.

**UI/UX P0:** mỗi portal có navigation, page hierarchy, trạng thái loading/error/empty/success, kết nối chain thật, nhãn dữ liệu nguồn, sự nhất quán hình ảnh; phải duyệt high-fidelity mẫu cả ba portal trong ngày 16. Nghiêm cấm trang dashboard generic, số liệu giả không gắn nhãn và CTA chết. **Đọc UX annex** để lấy routes, content, visual tokens, acceptance test và Plan B.

### A2. Scope định lượng — KHÔNG MỞ RỘNG

- **02 deployed contracts:** `ReserveVault.sol`, `MockReserveToken.sol`; có thể dùng internal Solidity library để tổ chức logic, **không deploy thêm contract** trong kế hoạch A.
- **03 portal đa trang, 03 URL đầu vào:** `/customer`, `/gym`, `/operations` chạy độc lập trên cùng **01 web deployment**; Business Lab nằm trong `/gym/economics`, Proof & Resolution nằm trong `/operations/disputes` và trang chi tiết pass của khách. Không cố giới hạn số route thành 4. Navigation và từng luồng theo UX annex.
- **02 gói:** PT 10 buổi (`PER_SESSION`); gym unlimited 90 ngày (`TIME_ACCESS`). Trong demo Fuji dùng *accelerated time window* thực sự trôi qua, được gắn nhãn rõ; trong test local dùng `vm.warp` để kiểm đúng 90 ngày.
- **03 vai trò ví test:** buyer / merchant owner / demo resolver; người vận hành giao diện không có quyền lấy tiền bất kỳ. Nhân viên gym có read-only UI demo; không tự tạo role writer hoặc login chưa được xác thực.
- **01 frontend deployment:** React + TypeScript + Vite + Tailwind + **viem/wagmi** (không thêm ethers parallel); Foundry + OpenZeppelin cho hợp đồng. **03 backend microservices** có API và lifecycle độc lập (chi tiết A2b).
- **Backend P0 ở Revision 1.2:** `catalog-evidence-service`, `chain-indexer-service`, `economics-service`; mỗi service process/container, API và kiểm thử riêng, triển khai lại độc lập. Dùng Node.js + TypeScript + Fastify, npm workspaces, Docker Compose, PostgreSQL với **hai database/schema độc lập có quyền ghi tách biệt** (catalog/evidence và chain read-model); economics stateless. Không database nào được phép tạo ra quyền rút/hoàn.
- **Không thêm:** auth server riêng, Kafka, Redis cluster, service mesh, Kubernetes, gateway service viết mới, IPFS, ví nhúng, AI, token thương mại, NFT, staking, yield, cross-chain, L1 riêng, referral marketplace hay VNĐ banking. Frontend vẫn ký ví trực tiếp với Fuji; backend chỉ hỗ trợ trình bày, bằng chứng và mô hình kinh tế. Các dịch vụ không dùng chung bảng dữ liệu hoặc thao tác chuyển tài sản.
- **Full Reserve** trong demo. A/B/C/D ở Business Lab dưới dạng phương án nghiên cứu, không tự kích hoạt A/C/D lên Vault. B là giả thuyết ưu tiên kiểm chứng, chưa chứng minh lợi nhuận dương.
- **Dữ liệu khảo sát:** 21 phiếu người tiêu dùng, 3 phiếu đại diện nhà cung cấp, 1 phiếu A/B/C/D; KHÔNG mặc định 25 người/25 doanh nghiệp phân biệt. Chỉ công bố số liệu tổng hợp đã ẩn danh.

### A2b. MICROSERVICES TOPOLOGY LOCK — CR-ARCH-001

| Deployment | Chủ sở hữu nghiệp vụ | Dữ liệu và quyền | Endpoint tối thiểu |
|---|---|---|---|
| `apps/web` | 03 portal Customer/Gym/Operations | Không lưu private key, không nguồn tiền | `/customer/*`, `/gym/*`, `/operations/*` |
| `services/catalog-evidence` | catalog gói minh họa, versioned terms, mô tả/evidence demo, dispute metadata | `catalog_db` riêng; evidence không tự quyết chi trả | `/health`, `GET /v1/packages`, `GET /v1/agreements/:id/evidence`, `POST /v1/evidence` (ký ví/kiểm quyền khi ghi) |
| `services/chain-indexer` | đồng bộ event Vault thành read-model để 3 portal đọc nhanh | `chain_db` riêng, **read-only to chain**, không ký/rút token | `/health`, `GET /v1/agreements/:id`, `GET /v1/agreements/:id/events`, `GET /v1/sync` |
| `services/economics` | tính lại A/B/C/D, chi phí vốn, lãi đóng góp 3 bên | Stateless, inputs giả định có schema; không tạo giao dịch | `/health`, `POST /v1/scenarios/compare` |
| `contracts` | quyết định tài sản on-chain | Fuji Vault + Mock ERC-20, **nguồn sự thật duy nhất** | ABI được chia sẻ qua `packages/contracts-sdk` |

**Điều kiện được gọi là microservices:** mỗi backend có `package.json`, Dockerfile, entrypoint, schema API, test, health/readiness, log, config riêng; thay đổi/khởi động lại một backend không bắt buộc build/restart hai backend còn lại. **Monorepo != monolith**; frontend một deployment không phản bác microservices backend.

**Chống tạo microservices giả:** 2 DB/schema riêng, không cross-service SQL joins, không shared mutable DB, không API service gọi backend để duyệt giá trị được phép rút. `chain-indexer` chỉ cache/query; Vault vẫn enforce. `catalog-evidence` chỉ giữ thông tin mô tả có hash trên chain khi phát sinh claim. Frontend phải hiển thị `block number / thời điểm đồng bộ / trạng thái có thể chậm` và refetch trực tiếp từ Fuji khi chuẩn bị hành động tài chính. Một service chết không được làm mất quyền rút/hoàn phần đã được chốt.

**Triển khai:** `docker compose up --build` chạy web, 3 service và PostgreSQL trên máy phát triển/host demo; Compose dùng `healthcheck`/`depends_on: service_healthy` cho dependency thật, reverse proxy HTTP `/api/catalog`, `/api/chain`, `/api/economics` dùng cấu hình (không thêm service nghiệp vụ). GitHub Actions test riêng cho từng service và contracts. `docker compose up -d --no-deps --build economics` phải không đụng tới `catalog-evidence`/`chain-indexer`. Trên Fuji chỉ deploy **2 smart contracts**, không coi container backend là nơi nắm tài sản.

**Giới hạn thời gian:** không microfrontend, không hệ thống message broker, không phân tán microservice theo từng CRUD, không dựng production HA/Kubernetes trong 5 ngày. **Plan A luôn là 3 backend service chạy thật**; khi có lỗi, Plan B giảm tính năng nội bộ của service nhưng giữ API/process và công khai trạng thái degraded, không quay về một monolith được gọi là microservices.

### A3. Hành vi tài chính cố định

- Buyer nạp token vào Vault khi mở agreement; điều khoản có `termsHash`, loại gói, giá, thời gian, buyer, gym bất biến cho giao dịch đã mở.
- `PER_SESSION`: gym đề xuất session có ID duy nhất và evidence hash sau buổi; buyer xác nhận -> `earnedFinalized` tăng đúng phần hợp lệ; rút không thể lặp. Check-in đơn lẻ không đủ.
- `TIME_ACCESS`: gym đề xuất đoạn `[from,to)` đã trôi qua thuộc thời hạn; không trùng đoạn; buyer có cửa sổ phản đối; nếu không phản đối theo quy tắc công khai thì finalized, nếu phản đối thì giữ khoản đó. **Không dựa check-in**. Đây là mô hình chấp thuận lạc quan có giới hạn tin cậy, không xác minh gym mở cửa tự động.
- Termination/refund trong demo chỉ có `mutual agreement` hoặc demo resolver phán quyết theo phạm vi/điều khoản; không mặc định `remainingVault == refundable`.
- Demo resolver được gắn nhãn **giả lập**, không có quyền sweep hay rút về ví của chính họ; quyết định không vượt số tiền còn của agreement/claim, không chuyển cho địa chỉ lạ.
- Nếu frontend chết: `claimEarned`/`claimRefund` đối với phần **đã chốt** phải gọi trực tiếp được; phần chưa chốt còn phụ thuộc bằng chứng và vai trò khác — ghi rõ giới hạn.
- Phí on-chain từ giá gói trong prototype = **0** để không lẫn với giả định A/B/C/D; mock token có decimals được cố định trong code và mọi bảng tính dùng đơn vị số nguyên.

### A3b. QUY TẮC TÍNH NHẤT QUÁN QUA CÁC SERVICE

- **On-chain authoritative:** chỉ Vault tính và thực thi `earnedFinalized`, `withdrawable`, `refundable`, quyền rút/hoàn. Microservices không viết đè trạng thái này; read-model ở `chain-indexer` có thể trễ và phải có `lastIndexedBlock`.
- **Off-chain identity:** giao diện route không tạo quyền. Các API ghi evidence/metadata yêu cầu chữ ký ví có nonce, hạn dùng, chain ID, domain và xác minh vai trò on-chain; nếu chưa đạt kiểm thử an ninh, `POST /evidence` bị tắt và sử dụng demo fixtures **read-only** gắn nhãn, không tuyên bố người dùng thực sự xác thực.
- **Hash và nguyên bản:** tx phải chứa `termsHash`/claim `evidenceHash` đúng nội dung dùng ở phiên demo. Không sửa nội dung đã hash; thay đổi cần version mới.
- **Indexer idempotency:** `chainId + txHash + logIndex` unique; sync từ deployment block, lưu checkpoint, chống ghi trùng, hỗ trợ replay khi bị sai lệch/reorg; số liệu dashboard luôn cho phép so sánh trực tiếp Vault.
- **Service fail independent:** tắt `economics` không chặn mua/rút; tắt `catalog` không làm mất agreement đã tạo trên chain; tắt `indexer` giao diện phải direct read known agreement ID và hiển thị degraded, không sinh số liệu giả.

### A4. Bất biến không thương lượng (test bằng mã)

`I1` Per agreement: `deposited = gymWithdrawn + buyerRefunded + remainingLocked` (nếu sau này thu fee phải mở RFC; kế hoạch hiện tại phí on-chain bằng 0).  
`I2` Tổng số dư token của Vault >= tổng số tiền còn khóa theo tất cả agreement.  
`I3` Gym không rút quá `earnedFinalized` và không quá khoản hợp lệ chưa rút.  
`I4` Session ID không thể dùng hai lần; time interval không được overlap/replay.  
`I5` Số lần check-in không tác động tiền TIME_ACCESS.  
`I6` Không refund trùng với gym withdrawal; refund phải theo quyết định có hiệu lực.  
`I7` Vai trò sai không thể đề xuất/phê duyệt/giải ngân trái phép; không admin sweep.  
`I8` Tranh chấp agreement A không làm khóa agreement B.  
`I9` Timestamp biên, rounding cuối, endAt/startAt và tổng giá trị phải đúng.  
`I10` Nếu web không hoạt động, khoản đã chốt vẫn rút trực tiếp được bằng contract call.

### A5. Đối chứng cạnh tranh / điểm

Rubric công bố: Technical 25; Avalanche 25; Innovation 15; Impact 15; Pitch 10; UI/UX 10. **94/100** là mục tiêu nội bộ có điều kiện (24+24+14+14+9+9), KHÔNG phải điểm được đảm bảo. Mục tiêu là nộp sản phẩm có test tái hiện, tx Fuji, UI ba portal độc lập, đúng vai trò và end-to-end, 3 khảo sát thật và unit economics không tô hồng. Không khẳng định vượt toàn bộ đối thủ hoặc chắc chắn có giải.

---

## B. CHANGE CONTROL — CHỐNG AI QUÊN NGỮ CẢNH, CHỐNG SCOPE CREEP

**Phần A, B, C (mục tiêu, công nghệ, sản phẩm, kiến trúc, acceptance) là `LOCKED`.** AI không được sửa nếu người dùng không nói rõ `APPROVE CHANGE REQUEST CR-...`. Khi một task thất bại, chỉ chuyển theo **Plan B đã được định nghĩa tại mục E** hoặc xin duyệt CR; không tự thêm chức năng/hợp đồng/tài khoản/app.

### B1. Quy trình cho MỖI task

1. AI đọc **file này**, **cả hai annex UX/Architecture**, `README.md`/`git status`/file liên quan trong repo hiện tại; đọc **STATE LOG** cuối file.
2. AI nêu lại **một** task ID được giao, file dự kiến sửa, acceptance criteria, phương pháp test; **không làm task khác**.
3. AI thực thi task; chỉ sửa file tối thiểu; không thay contract ABI/type/roles nếu task không yêu cầu.
4. AI chạy test/lint/build phù hợp. Không được báo PASS nếu chưa chạy hoặc không có log. Không được báo deployed khi không có TX/chain proof.
5. AI đưa báo cáo `TASK ID / changed files / commands+results / evidence / risks / next task suggestion`. Đánh dấu `AWAITING HUMAN REVIEW`, không tự check `[x]`.
6. Người dùng tự review code, demo, tests; nếu đạt, cập nhật checklist và state log; commit với task ID. Nếu không đạt, giao sửa cùng task ID.
7. Sau mỗi phiên, ghi trạng thái vào **STATE LOG** bằng đường dẫn file/commit/tx. Không dựa vào ChatGPT Memory để biết tiến độ.

### B2. Giao thức tình trạng

Task có 5 trạng thái: `TODO`, `IN_PROGRESS`, `BLOCKED`, `AWAITING_REVIEW`, `ACCEPTED`.
- Chỉ `ACCEPTED` mới được check `[x]`.
- Mọi bằng chứng nằm trong `proofs/` hoặc trong đường dẫn test/commit/CI có thể mở.
- Nếu AI đề nghị thêm thư viện, contract hay chức năng: trả lời `SCOPE REJECTED — đề xuất giải pháp trong scope hiện tại` trừ khi người dùng duyệt CR.
- Nếu xuất hiện bug tài chính/role high severity, **đóng băng UI** và xử lý bug P0 trước.

### B3. Freeze & precedence

- Source of truth của sprint là **file này**. `MasterPlan`, `Codex_ONE_SHOT_Mission` và roadmap V1/V2/V3 là **reference/history**; lệnh “làm toàn bộ” trong mission cũ **không còn hiệu lực**.
- Nếu reference mâu thuẫn hoặc AI bảo đã hoàn thành task không có evidence: ưu tiên bằng chứng code/test/chain thực tế, sau đó báo người dùng phê duyệt.
- `Plan A` là mục tiêu mặc định; `Plan B` chỉ được dùng khi ngưỡng thất bại nêu rõ xảy ra và người dùng chấp thuận. Không bù thất bại bằng claims giả.
- Không thay scope để bám một ý tưởng mới; không thay kiến trúc chỉ vì AI mới thích thư viện khác.

---

## C. CHECKLIST 16–20/11 — THEO THỨ TỰ NGHIỆM THU

**Chính sách UI + backend:** từ 16/11, high-fidelity UX/UI và ba microservices tối thiểu là **P0 song hành với contract**; không đẩy chúng sang 19/11 để làm sau. Human review phải nghiệm thu **giao diện và nghiệp vụ** riêng. Không chấm P0 hoàn thành nếu chỉ có wireframe hoặc trang placeholder. Mọi task vẫn làm **một ID mỗi lần**, không giao AI tự chạy chuỗi.

### 📅 16/11 — KHÓA THIẾT KẾ SẢN PHẨM, VISUAL VÀ KHUNG CONTRACT (Gate: cuối ngày)

- [x] **D16-01 [P0]** Repo/nhánh `unihack-final`, đưa `EXECUTION_LOCK` (rev 1.2) + UX + Architecture annexes vào root; commit và ghi SHA. **ACCEPT:** link 3 file trên GitHub + `git status` sạch.
- [x] **D16-02 [P0]** Khởi tạo npm workspaces `apps/web`, `services/catalog-evidence`, `services/chain-indexer`, `services/economics`, `packages/contracts-sdk`, `contracts/` Foundry/OpenZeppelin; `.env.example`, `.gitignore`, Docker Compose/CI stub. **ACCEPT:** `forge build`, npm workspace build/typecheck, `docker compose config` (nếu cài Docker) hoạt động; không commit secrets.
- [ ] **D16-07 [P0]** **VISUAL FREEZE**: 3 reference frames high-fidelity (Customer package/pass, Gym agreement/action, Operations ledger/dispute), design tokens, thành phần chung, microcopy tiếng Việt; review theo UX annex. **ACCEPT:** 3 ảnh chụp hoặc 3 URL preview, bạn APPROVE; không chấp nhận wireframe chữ như hoàn thành.
- [ ] **D16-08 [P0]** Dựng `apps/web/src/portals/*`, 3 URL `/customer`, `/gym`, `/operations`, AppShell/RoleNavigation/WalletIdentity/MoneyFigure/Status. **ACCEPT:** có thể mở cả 3 URL riêng, cùng visual system, không dead navigation trên skeleton; mock UI ghi rõ `DEMO UI — CHƯA KẾT NỐI` nếu chưa nối chain.
- [ ] **D16-09 [P0]** **SERVICE BOUNDARY FREEZE:** tạo `docs/service-contracts.md` (bảng API OpenAPI/Zod, data ownership, auth rules, stale-state rules); tạo `/health` cho cả 3 service và `packages/contracts-sdk` chia ABI/types read-only. **ACCEPT:** 3 process khởi động riêng, contract tests HTTP health pass, một service stop không kéo hai service còn lại.
- [x] **D16-03 [P0]** `docs/product-and-terms.md` khóa PER_SESSION, TIME_ACCESS, `termsHash`, 6 kịch bản, chính sách hoàn có điều kiện, testnet demo accelerated. **ACCEPT:** bạn xác nhận quyền và nghĩa vụ không nhầm check-in.
- [x] **D16-04 [P0]** `docs/contract-interface.md`: agreement/claim state, actor, input, events, precondition, read APIs đủ phục vụ 3 portal; bất biến I1–I10. **ACCEPT:** frontend không cần đoán ABI.
- [x] **D16-05 [P0]** Test skeleton RED: deposit, PT session, time interval, unauthorized, duplicate, refund/conservation. **ACCEPT:** `forge test` thực thi test case tên rõ.
- [ ] **D16-06 [P0]** Mock token và Vault deposit minimal, kiểm thử thật. **ACCEPT:** tiền test chuyển từ buyer → Vault, `forge test` deposit PASS.
- [ ] **D16-GATE [P0]** **Cả 2 gate**: 3 portal visual directions đã duyệt + routes chạy; 3 service boot/health pass riêng và contract deposit được test. Nếu chậm, giảm phần trang phụ nhưng KHÔNG được bỏ high-fidelity freeze hoặc một portal.

### 📅 17/11 — COMPLETE FINANCIAL CORE + CUSTOMER JOURNEY (Gate: cuối ngày)

- [ ] **D17-01 [P0]** PT proposal/approval/finalization, session ID duy nhất, rounding. **ACCEPT:** 10-buổi test pass; replay/unauthorized revert.
- [ ] **D17-02 [P0]** TIME_ACCESS past interval, optimistic challenge, overlap guard, finalize, không phụ thuộc checkin. **ACCEPT:** test 30/90 ngày và 0/15 check-in tương đương bằng `vm.warp`.
- [ ] **D17-03 [P0]** Refund/termination, mutual + bounded resolver, disputed funds isolation. **ACCEPT:** không admin sweep, refund và payout không vượt fund.
- [ ] **D17-04 [P0]** I1–I10 tests, fuzz conservation, ≥2 agreements isolation. **ACCEPT:** `forge test -vv` PASS với log đường dẫn và không high-severity unknown.
- [ ] **D17-05 [P0]** Security pass `SafeERC20`, `ReentrancyGuard`, access controls, timestamps, event content, zero-value/rounding. **ACCEPT:** checklist attack surface mỗi entrypoint.
- [ ] **D17-06 [P0]** Fuji deployment scripts + seed, hard check `43113`, mock wallets `.env.example`. **ACCEPT:** dry-run, no secrets leak.
- [ ] **D17-08 [P0]** `catalog-evidence` triển khai GET packages, GET evidence theo ID, schema/fixture, versioned terms; POST evidence chỉ mở khi có signature verification; contract tests. **ACCEPT:** database riêng, GET trả dữ liệu gắn nhãn, sai schema bị từ chối, không có phương pháp chuyển token.
- [ ] **D17-09 [P0]** `economics` triển khai `POST /v1/scenarios/compare`, 4 mô hình A/B/C/D từ công thức ở Decision Record, trường hợp lỗ; unit tests. **ACCEPT:** đầu vào cố định tính ra kết quả có thể đối chiếu bằng tay, tính không phụ thuộc DB hay blockchain.
- [ ] **D17-07 [P0]** **Customer Portal COMPLETE VISUAL SHELL:** `/customer` → package detail → checkout → passes/detail; buyer actions coupled to typed ABI/local chain mock where available; navigation/state handling. **ACCEPT:** coherent visual, no fake success; receipt after chain confirmed; 1440×900 + 390×844 preview screenshots.
- [ ] **D17-GATE [P0]** Foundry tests for financial core pass + Customer journey visual review + catalog/economics services tests pass. **B-TIME** only upon evidenced blocker and human approval. UI must not be sacrificed to decorative backend work.

### 📅 18/11 — FUJI + THREE-PORTAL INTEGRATION (Gate: cuối ngày)

- [ ] **D18-01 [P0]** 3 testnet-only buyer/merchant/resolver wallets + gas. **ACCEPT:** no key exposure, wallets independent.
- [ ] **D18-02 [P0]** Deploy MockToken/Vault Fuji, capture address, chain, deploy receipt and commit SHA. **ACCEPT:** explorer opens and contract state readable.
- [ ] **D18-03 [P0]** Deposit/open agreement Fuji through customer flow or direct script, record receipts. **ACCEPT:** Vault ERC20 real balance increases.
- [ ] **D18-04 [P0]** PT claim confirmation/payout Fuji. **ACCEPT:** merchant receives authorized amount and no duplicate.
- [ ] **D18-05 [P0]** TIME_ACCESS claim/payout Fuji for elapsed demo interval; local 90-day test. **ACCEPT:** real time elapsed, no fabricated 90 days.
- [ ] **D18-06 [P0]** Authorized termination + refund Fuji. **ACCEPT:** buyer balance/ledger reconcile after tx.
- [ ] **D18-10 [P0]** `chain-indexer` lập chỉ mục event Fuji từ deployment block vào `chain_db`, checkpoint/idempotency, API `/v1/agreements/:id` và `/events`. **ACCEPT:** same tx không tạo event trùng sau restart; `lastIndexedBlock` hiện rõ và số dư agreement khớp readContract sau sync.
- [ ] **D18-11 [P0]** Compose end-to-end web + 3 services + DB, reverse proxy routes; kiểm tra service restart độc lập và readiness. **ACCEPT:** `docker compose up --build` healthy; restart economics không làm sai dữ liệu chain; test stop indexer + direct read.
- [ ] **D18-07 [P0]** Wallet/contract SDK, typed API clients + query keys/events shared across 3 portals; `readContract` authoritative for money, indexer for activity, refetch on confirmation. **ACCEPT:** same agreement ID shows equal economic ledger after refresh.
- [ ] **D18-08 [P0]** **Gym Portal functional UI:** overview, agreements, claim form by policy, payout, visible pending/finalized and errors. **ACCEPT:** correct wallet, claim → earned → withdraw visual flow, screenshot and receipt.
- [ ] **D18-09 [P0]** **Operations Portal functional UI:** overview, audit agreement, dispute queue/details, resolver mock bounded action. **ACCEPT:** not a vault admin, can inspect real tx and handle only contract-authorized dispute.
- [ ] **D18-GATE [P0]** 4 real Fuji transaction groups + 3 portal URL và browser profiles + 3 service independently healthy + đồng bộ indexer/Fuji smoke test. If conflicts, apply `B-PORTAL-DEPTH` (reduce secondary routes) with approval, not portal deletion.

### 📅 19/11 — PRODUCT POLISH + BUSINESS EVIDENCE + CROSS-PORTAL QA (Gate: cuối ngày)

- [ ] **D19-01 [P0]** Customer Pass: trust copy, package rights, clear approve/deposit states, receipt, pass detail ledger, buyer challenge/refund, mobile. **ACCEPT:** no confusing Vault/refundable; primary customer E2E without CLI.
- [ ] **D19-02 [P0]** Gym Console: agreement search, sessions/time interval UI, pending/challenged, payout, staff read-only demo distinction; access errors. **ACCEPT:** agreement/payout works through UI; no staff writer privilege falsely presented.
- [ ] **D19-03 [P0]** Operations: status/ledger/evidence/dispute timeline, bounded demo resolution, explorer, provenance labels. **ACCEPT:** real on-chain and fixture evidence not confused, no spoofed arbitration.
- [ ] **D19-04 [P0]** `Gym / Economics`: A/B/C/D as **research choices**, scenario inputs + weekly cash gap + gym contribution + OpenReserve variable contribution; negative example and data-source labels. **ACCEPT:** recompute on paper, Full Reserve not modified by illustration.
- [ ] **D19-05 [P0]** Research/legal annex with aggregated n=21/3/1, anonymization, testnet-only/VNĐ/legal limitations. **ACCEPT:** no invented pilot, partners, usage data, revenue.
- [ ] **D19-09 [P0]** Microservice resilience test: kill/restart catalog, economics, indexer từng service; bảo đảm không mất chức năng rút đã chốt, không giả success và có trạng thái degraded. **ACCEPT:** lưu log `proofs/service-failure-tests.md` + test event replay, API version/schema validation.
- [ ] **D19-06 [P0]** Visual QA across 3 portals, consistent tokens, responsive 1440×900 & 390×844, loading/empty/error/receipt states, no broken CTA; capture 3 key screenshots. **ACCEPT:** portal review score ≥8/10 each per UX annex with written reasons.
- [ ] **D19-07 [P0]** Browser profiles Buyer/Gym/Resolver **live synchronized E2E**; negative-path wallet reject/wrong network/rpc lag. **ACCEPT:** all portals show same agreement ledger on refresh; transaction receipts verified.
- [ ] **D19-08 [P0]** README, CI, proof manifest, scripted demo 3 minutes. **ACCEPT:** public visitor can run/understand/reproduce; all UI URLs documented.
- [ ] **D19-GATE [P0]** Three polished portal journeys + working Fuji + 3 independent services + honest Business Lab, screenshots và failure-test logs, test paths documented. `B-PORTAL-DEPTH` can merge secondary screens into attractive sections but NEVER downgrade the three roles into a single generic dashboard.

### 📅 20/11 — QA + DEMO + SUBMIT (INTERNAL HARD GATE 20:00 ICT)

- [ ] **D20-01 [P0]** Full `forge test` / npm workspace tests/build/typecheck / Compose smoke + cross-service contract tests / wallet smoke on Fuji. **ACCEPT:** no known High/Critical loss-of-funds, role or false-transaction bug; record results.
- [ ] **D20-02 [P0]** Fresh three-browser-profile QA for `/customer`, `/gym`, `/operations`, 1440×900 and 390×844, visual pass and role-safe interactions. **ACCEPT:** navigation, refresh, state sync and wallet statuses all usable.
- [ ] **D20-03 [P0]** Proof manifest có token/Vault addresses, chain ID, ≥4 tx groups, 3 service image/health, replay/failure-test logs, test logs, revision/commit, screenshots từng portal và provenance labels. **ACCEPT:** URL publicly opens and matches deployed code.
- [ ] **D20-04 [P0]** Record **2–3 minute demo of the THREE portals**, demonstrate same agreement/asset across buyer→gym→operations; include 1 permitted failed action and proof of chain. **ACCEPT:** public video, no fabricated state.
- [ ] **D20-05 [P0]** Deck 8–10 slides featuring 3-portal journey screenshots, two service policies, technical proof, survey caveats, economics limitations. **ACCEPT:** exact claims match working build.
- [ ] **D20-06 [P0]** Q&A rehearsal: 8 hard questions + “why 3 portals?” and “who can resolve disputes?” **ACCEPT:** answers evidence-based and brief.
- [ ] **D20-07 [P0]** Freeze code, tag `unihack-final-2026-11-20`, public URLs proof, README, screenshot gallery. **ACCEPT:** clean git, tag commit matches evidence.
- [ ] **D20-08 [P0]** Submit Team1VN **before 20:00 20/11**, repo, deck, video, accurate description. **ACCEPT:** screenshot/email/receipt acceptance.
- [ ] **D20-09 [P0]** Recheck submission and link access incognito. **ACCEPT:** three URLs, video, deck, repo accessible and no critical broken action.
- [ ] **D20-GATE [P0]** Submission accepted; no feature change afterward merely for animation or UI trends.

---

## D. PRIORITIES & SCOPE CUTS (UX IS FIRST-CLASS)

**Plan A P0 priorities (interleaved):** financial invariants + 3-portal art direction + API boundary freeze → contract core + 3 microservices skeleton → Fuji + event indexer + merchant/operations → cross-portal/service failure QA + economics → final demo/submission.

**Never cut:** correct service policies, no double payouts, role bounds, independent 3 portal URLs, **3 backend service processes with distinct APIs/ownership**, on-chain proof, accurate money language, functional primary action journeys, contract tests, submission.

**Can cut without breaking the user request:** secondary filters, optional charts, decorative photography, illustration animations, redundant detail routes, advanced responsiveness for minor pages (not 3 primary flows), multilingual UI and nonessential data visualizations.

**Do not treat UI as a P1 cosmetic task.** Rework budget is minimized with UX annex, shared components and early design approval. The acceptance for each portal includes actual workflow, not a screenshot.

---

## E. CONTROLLED PLAN B (EXPLICIT HUMAN APPROVAL REQUIRED)

| Code | Trigger | Plan A | Approved-scope fallback | Never |
|---|---|---|---|---|
| `B-TIME` | 17/11 optimistic-challenge flow cannot pass local tests | Past interval + challenge window + finalize | Buyer explicitly confirms elapsed interval; TIME_ACCESS stays time-based | Unlock based on check-in or unverified future time |
| `B-DISPUTE` | 17–18/11 bounded resolver cannot be proven safe | Per-claim resolver, no sweeping | Buyer+gym mutual resolution; UI transparently labels limitations | Arbitrary admin withdrawal |
| `B-FUJI` | 18/11 RPC/faucet network failure | Live Fuji tx + three portals | Previously captured **real** Fuji tx + explorer and local contract test walkthrough, labeled | Invent tx or mislabel local as Fuji |
| `B-PORTAL-DEPTH` | D18/D19 secondary route backlog threatens core paths | All routes in UX annex | Keep 3 independent URL/visual shells and functional main paths; merge secondary subroutes into clean sections/tabs | Remove a portal or publish generic unfinished shell |
| `B-EVIDENCE` | Catalog evidence upload/signature verification fails | Signed off-chain evidence + hash on-chain | Keep catalog service running **read-only** with explicitly labeled fixture; store hash on-chain; mark write API disabled | Claim evidence independently verified a real gym |
| `B-INDEX` | Indexer cannot reconcile/replay or provider RPC stale | Indexer + dedicated read-model + checkpoint | **Keep chain-indexer service running** as degraded health/API, direct read known agreement ID through web; mark listing/search unavailable until sync healthy | Fake a database ledger or describe unhealthy service as functional |
| `B-LAB` | Chart rendering fails but calculation service passes | economics API + chart + cashflow | Economics microservice returns validated table; web renders compact comparison with assumptions and negative scenario | Fake profit or choose D without data |
| `B-VISUAL` | Decorative assets block deadline | Polished 3 portals | Keep typography, coherent UI components, clean layouts; drop decorative media/animation | Revert to raw wireframes or nonfunctional CTAs |
| `B-WALLET` | Browser extension multi-tab role switching | Three profiles live | Separate browser profiles or distinct browsers with connected wallets and known accounts | Present one wallet as all three independent actors |
| `B-PITCH` | 20/11 slide production delays submission | 8–10 polished slides | 8 clear evidence-led slides plus real video, freeze UI scope | Miss submission chasing effects |
| `B-SERVICE-AUTH` | Evidence signature validation cannot pass on 17/11 | Authenticated signed evidence API | Catalog service remains online, **read-only** with demo fixtures; disable POST; fulfill claims via contract-safe signed actions only | Insecure POST or role based only on route |
| `B-SERVICE-DEPLOY` | Public 3-service deployment lacks infrastructure/time before 19/11 | Single Compose host with 3 independently restartable containers and TLS front door | Keep 3 processes on one host/local Compose; record video + logs and label public-service limitation; DO NOT call this publicly deployed microservices | Rewrite to monolith or fabricate production URL |
| `B-CHAIN-RECON` | Indexer event lag/reorg causes discrepancy | Idempotent replay / rescan | Show direct Fuji reads for financial values, mark indexer stale; pause activity KPI until fixed | Prefer stale DB number over Vault balance |

**Activation:** append approved Plan B code, trigger evidence and user approval into STATE LOG. Once activated, add limitation to demo/README. Fallback is not permission to claim 90+ or hide incompleteness.

---

## F. PROOF LEDGER — GÓI BẰNG CHỨNG BẮT BUỘC

| Bằng chứng | Nơi lưu | Tiêu chí thực |
|---|---|---|
| Source/test và CI | `contracts/test/`, `services/*/test/`, `.github/workflows/`, log | `forge test`, 3 service test/build + web PASS, SHA cụ thể |
| Deploy và TX | `proofs/manifest.json` | `chainId=43113`, vault/token, tx receipt+block+explorer; không bịa hash |
| Test scenarios | `proofs/scenarios.md` | Buyer deposit, PT payout, time payout, refund, reject unauthorized |
| Three-portal demo | video + 3 URLs + screenshots | Customer, Gym, Operations độc lập; cùng agreement trên Fuji; không nút giả |
| Microservices evidence | `compose.yaml`, `proofs/service-failure-tests.md`, service health | 3 separately started/stopped services, own APIs/DB ownership, restart/resync tested |
| Market evidence | `research/primary-surveys.md` | n=21, n=3, n=1, caveat và bảo vệ riêng tư |
| Economics | `research/unit-economics.md`/Business Lab | gym profit AND cash gap; OpenReserve có scenario âm |
| Legal caveat | `research/legal-scope.md` | Fuji test only, không VND custody, resolver demo |
| Visual QA | `proofs/ui/` | 3 portal screenshots, 1440×900 và 390×844, UX review ≥8/10 each |
| Final submission | `proofs/submission/` | receipt/screenshot/email xác nhận, link mở ẩn danh |

**Cuối cùng: chỉ có `E1` tài liệu, `E2` test tái hiện, `E3` Fuji tx, `E4` user journey nếu thực sự đã làm. Chưa có `E5` xác nhận kinh doanh/pilot thương mại.**

---

## G. PROMPT ĐỂ GIAO AI — COPY/PASTE Ở MỖI PHIÊN

### G1. Prompt khởi động / khôi phục ngữ cảnh

```text
Bạn là kỹ sư thực hiện cho OpenReserve trong UniHack 2026.
SOURCE OF TRUTH: ./OPENRESERVE_EXECUTION_LOCK_16-20_NOV_2026.md + UX ANNEX ./OPENRESERVE_THREE_PORTAL_UX_SPEC_2026-11-16.md + ARCH ANNEX ./OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md.
BẮT BUỘC đọc toàn bộ ba file, git status, STATE LOG cuối Execution Lock và các file thuộc task hiện tại trước khi viết code.
Các prompt cũ về V1/V2/V3 hoặc “one-shot autonomous build all” đã hết hiệu lực.
KHÔNG tự mở rộng scope, không đổi API/schema/roles, không thêm contract, không hứa chắc có giải.
Chỉ làm task ID: [ĐIỀN D16-XX/D17-XX/...].
Trước khi sửa: nêu mục tiêu, file cần sửa, test/acceptance; sau đó thực thi task đó và chạy test.
Sau khi sửa: báo cáo Changed files, Commands+Results, Evidence, Limitations, Next task.
KHÔNG tự tick ACCEPTED. Dừng ở AWAITING_REVIEW để tôi tự kiểm chứng.
Nếu gặp blocker, đề xuất đúng Plan B có mã trong tài liệu; không tự kích hoạt mà chưa được tôi duyệt.
```

### G2. Prompt review sau mỗi task

```text
Review task [TASK ID] của OpenReserve theo file EXECUTION_LOCK.
Không làm tính năng mới. Đọc diff, đối chiếu acceptance + invariant I1-I10 liên quan,
chạy các test phù hợp (nếu có công cụ). Trả lời:
1) PASS / FAIL / NOT VERIFIED từng acceptance;
2) bằng chứng cụ thể (command, output, path, tx, SHA);
3) lỗ hổng/assumptions;
4) sửa tối thiểu nếu FAIL;
5) chỉ rõ có thể ACCEPT hay phải làm lại.
Không đánh đồng code tồn tại với tính năng chạy; không bịa test result.
```

### G3. Prompt handoff khi đổi phiên ChatGPT/Codex

```text
Đọc ./OPENRESERVE_EXECUTION_LOCK_16-20_NOV_2026.md, ./OPENRESERVE_THREE_PORTAL_UX_SPEC_2026-11-16.md, ./OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md và STATE LOG.
Tóm tắt CHỈ: Plan ID, ngày/gate hiện tại, task ACCEPTED gần nhất, task đang BLOCKED,
commit SHA, TX Fuji có chứng cứ, next task ID, Plan B đang bật (nếu có).
Mọi nhận định phải dựa file/code/log. Không tự đề xuất lại roadmap hay sửa scope.
Nếu thiếu tệp hoặc trạng thái, thông báo thiếu bằng chứng trước khi thực hiện.
```

### G4. Prompt bảo vệ scope khi AI đi lệch

```text
SCOPE VIOLATION: phương án vừa đề xuất không thuộc EXECUTION_LOCK hoặc UX ANNEX.
Dừng triển khai đề xuất đó. So sánh với mục A/B/C và nhiệm vụ ID hiện tại.
Nêu cách đáp ứng acceptance bằng kiến trúc đã khóa, ít thay đổi nhất.
Không thêm portal thứ tư, smart contract, provider, dependency hoặc feature ngoài route đã được khóa; các trang trong UX annex đã được duyệt trong scope.
Nếu không thể làm trong scope, nêu blocker và mã Plan B, chờ tôi phê duyệt.
```

---

## H. STATE LOG — CẬP NHẬT SAU TỪNG TASK, KHÔNG SỬA SCOPE KHÓA

**Cập nhật lần cuối:** 16/11/2026 — Revision 1.2 Microservices lock (chưa có code/build/deploy được xác minh trong file kế hoạch này)  
**Current Gate:** `D16-GATE`  
**Next task:** `D16-06`  
**Accepted task IDs:** `D16-01`, `D16-02`, `D16-03`, `D16-04`, `D16-05`  
**Blocked task IDs:** *(trống)*  
**Approved Plan B:** *(trống)*  
**Current Git commit:** `12996a7c2b1bec50d6e8e765084c97207e9bbe12`  
**Fuji addresses / TX:** `NOT_VERIFIED`  
**Actual submission proof:** `NOT_SUBMITTED`

### Mẫu entry phải thêm (không xóa lịch sử)

```text
[YYYY-MM-DD HH:MM ICT] TASK=DXX-YY STATUS=ACCEPTED|BLOCKED|AWAITING_REVIEW
Owner: user-reviewed / AI-implemented
Git: <commit SHA or NOT_VERIFIED>
Files: <changed paths>
Tests: <exact command + PASS/FAIL/NOT_RUN>
Proof: <log path / TX URL / screenshot>
Notes: <limitation, mock, unresolved issue>
Next: <task ID>
PlanB: <none or B-CODE; approval reference>
```

```text
[2026-11-16 14:07 ICT] TASK=D16-01 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: c1fdd3085930912aa26158177dbe7822ecedb4d8
Files: 3 root lock documents, README.md, .gitignore, docs/, proofs/, research/
Tests: anonymous HTTPS reads of all 3 documents at the proof commit PASS, byte comparison PASS, local git status clean
Proof: https://github.com/remjphong/Open-Reserve/commit/c1fdd3085930912aa26158177dbe7822ecedb4d8
Notes: Public branch unihack-final. D16-GATE remains partial pending the remaining tasks.
Next: Owner reviews D16-01, then D16-02.
PlanB: none
```

```text
[2026-11-16 14:10 ICT] TASK=D16-01 STATUS=ACCEPTED
Owner: user-reviewed / AI-implemented
Git: 5dc785a5ed35af2ab9de92eb83d416e1d154ab6f
Proof: owner confirmed ACCEPT D16-01 in chat after anonymous verification.
Next: D16-02.
PlanB: none
```

```text
[2026-11-16 14:13 ICT] TASK=D16-02 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: D16-02 scaffold commit on review branch d16-02-scaffold
Files: apps/web, services/*, packages/*, contracts/, compose.yaml, .github/workflows/scaffold.yml, proofs/d16-02-*
Tests: npm ci, npm run typecheck, npm run build, forge build and OpenZeppelin import compile, Compose config PASS locally.
Proof: proofs/d16-02-workspaces.log, proofs/d16-02-foundry.log, proofs/d16-02-compose.log, proofs/d16-02-tree.txt
Notes: Compose configuration checked with Docker Compose v2.39.4. Containers were not run. Routes, health, and Vault logic are later tasks.
Next: Owner reviews D16-02.
PlanB: none
```

```text
[2026-11-16 14:19 ICT] TASK=D16-02 STATUS=ACCEPTED
Owner: user-reviewed / AI-implemented
Git: 300e70dca912f0718245917c890962c459698958
Proof: owner confirmed ACCEPT D16-02 in chat. PR #1 merged into unihack-final. GitHub Actions run 43822363951 passed.
Next: D16-03.
PlanB: none
```

```text
[2026-11-16 14:19 ICT] TASK=D16-03 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: 010a7852130a84358dc37f793bd109308ef727cf
Files: docs/product-and-terms.md
Tests: checks of canonical bytes, PT rounding, interval additivity, 30/90 equivalence and refund conservation passed. GitHub file content matched local bytes.
Proof: termsVersion 1.0.0 / Keccak-256 0xbcb7bf6578cd0ed96b1a90d80b63ef778c9d38eb55b4e8f17ee36bde7c52201c
Notes: proposed challenge windows are 24h for the model and 60s for Fuji, with 270s Fuji access. No contract or Fuji execution at this step.
Next: Owner reviews D16-03, then D16-04.
PlanB: none
```

```text
[2026-11-16 15:11 ICT] TASK=D16-03 STATUS=ACCEPTED
Owner: user-reviewed / AI-implemented
Git: 010a7852130a84358dc37f793bd109308ef727cf
Proof: user confirmed ACCEPT D16-03 in chat.
Next: D16-04.
PlanB: none
```

```text
[2026-11-16 15:11 ICT] TASK=D16-04 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: 20d85b0e7d6ed314db07b6203f2c7836d9b8336b
Files: docs/contract-interface.md
Tests: solcjs 0.8.30 extracted interface --abi PASS, 21 functions, 12 events, 14 errors; GitHub content comparison PASS.
Notes: specification only, no Vault runtime or invariant tests executed.
Next: Owner reviews D16-04, then D16-05.
PlanB: none
```

```text
[2026-11-16 16:01 ICT] TASK=D16-04 STATUS=ACCEPTED
Owner: user-reviewed / AI-implemented
Git: 2eaf4c3a45d7ff246dff698756d854e9d35755e2 (PR #3 merge into unihack-final)
Reviewed head: d6c50cd650f1057538b7fd347f91ca63fe67025e
Files: docs/contract-interface.md, docs/product-and-terms-v1.0.1-proposed.md (approved bytes retained)
Proof: owner approved ReserveVault ABI v1 and terms v1.0.1, Keccak-256 0x32f8c0afbc8e0cabce1cd940791651b578630150fdef727c3cf53cd27144d0d8. Scaffold CI run 43834774962 passed.
Notes: specification freeze. Runtime and financial invariants I1–I10 remain unverified pending Foundry implementation and tests.
Next: D16-05.
PlanB: none
```

```text
[2026-11-16 16:15 ICT] TASK=D16-05 STATUS=ACCEPTED
Owner: user-reviewed / AI-implemented
Git: 12996a7c2b1bec50d6e8e765084c97207e9bbe12 (PR #4 merge)
Proof: reviewed d3128b3f9191a19f1907ef2eac3ad3ec260e3d07, Scaffold CI 43837116163 passed. Foundry executed 29 expected RED cases, zero skips or passes.
Notes: accepted RED baseline only. Financial runtime invariants remain unverified.
Next: D16-06.
PlanB: none
```

---

## I. NON-NEGOTIABLE SAFETY / QUALITY

1. Không chuyển tiền thật; không dùng token commercial để nhận thanh toán dịch vụ tại Việt Nam; không gọi dự án là sản phẩm lưu ký đã được cấp phép.
2. Không đưa seed/private key vào ChatGPT, GitHub, logs, screenshot; chỉ ví test dành riêng, `.env` không commit.
3. Không khẳng định khảo sát đại diện toàn thị trường; không gọi 3 phản hồi nhà cung cấp là 3 doanh nghiệp độc lập nếu chưa có bằng chứng.
4. Không giả TX, test, deploy, pilot hoặc trạng thái đã hoàn thành.
5. Không tự nâng cấp logic sổ cái sau khi đã tạo proof mà chưa rerun tests và re-deploy/đổi manifest tương ứng.
6. Không trì hoãn submission sau ngày 20/11 vì polish hoặc chức năng phụ.
7. Đạt giải / 90+ là mục tiêu tham vọng **không thể bảo đảm**; bắt buộc trung thực nếu fail gate.
8. Không tuyên bố hoàn tất UX khi mới có screenshot: 3 portal phải có riêng URL, role-safe, navigation và luồng on-chain đúng.
9. Không biến thư viện mock nội bộ thành ảnh chụp của phòng gym thật hoặc bằng chứng doanh nghiệp tham gia.
10. Không tuyên bố “microservices đã triển khai” khi chỉ có folder, Dockerfile hoặc API mock. Phải có process độc lập, own data, API tests, health, restart/failure evidence.
11. Nếu status của indexer trễ/lỗi, không hiện số dư lưu cache như số dư trên chain đã chốt. Không để database/worker ký chi tiêu tài sản.

**NEXT ACTION NGAY:** Tạo repo, đưa **Execution Lock rev 1.2, UX annex và Microservices annex** vào root và thực hiện `D16-01`. Chỉ sau khi bạn ACCEPT mới giao `D16-02`.
