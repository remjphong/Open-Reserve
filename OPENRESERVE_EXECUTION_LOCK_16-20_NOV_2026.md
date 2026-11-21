# OPENRESERVE — EXECUTION LOCK / SINGLE SOURCE OF TRUTH

**Plan ID:** `OR-UH26-ONE-SHOT`  
**Revision:** `1.2 — 2026-11-16 / THREE-PORTAL + MICROSERVICES LOCK`  
**Execution window:** 16/11/2026 → 20/11/2026 (ICT, UTC+07)  
**Internal submission deadline:** **20/11/2026 20:00 ICT** (đã nộp và chụp bằng chứng); tuyệt đối không dồn sang 21/11.  
**Owner / final reviewer:** Người sáng lập OpenReserve (người dùng).  
**Working mode:** *Human-in-the-loop*: AI chỉ thực hiện **một task ID được chọn**, người dùng kiểm tra và phê duyệt xong mới giao task kế tiếp.  
**Status:** D16-GATE đã được owner nghiệm thu kỹ thuật. Xem State Log và các log kiểm thử được dẫn chiếu. Production deployment chưa được phê duyệt.
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
- [x] **D16-07 [P0]** **VISUAL FREEZE**: 3 reference frames high-fidelity (Customer package/pass, Gym agreement/action, Operations ledger/dispute), design tokens, thành phần chung, microcopy tiếng Việt; review theo UX annex. **ACCEPT:** 3 ảnh chụp hoặc 3 URL preview, bạn APPROVE; không chấp nhận wireframe chữ như hoàn thành.
- [x] **D16-08 [P0]** Dựng `apps/web/src/portals/*`, 3 URL `/customer`, `/gym`, `/operations`, AppShell/RoleNavigation/WalletIdentity/MoneyFigure/Status. **ACCEPT:** có thể mở cả 3 URL riêng, cùng visual system, không dead navigation trên skeleton; mock UI ghi rõ `DEMO UI — CHƯA KẾT NỐI` nếu chưa nối chain.
- [x] **D16-09 [P0]** **SERVICE BOUNDARY FREEZE:** tạo `docs/service-contracts.md` (bảng API OpenAPI/Zod, data ownership, auth rules, stale-state rules); tạo `/health` cho cả 3 service và `packages/contracts-sdk` chia ABI/types read-only. **ACCEPT:** 3 process khởi động riêng, contract tests HTTP health pass, một service stop không kéo hai service còn lại.
- [x] **D16-03 [P0]** `docs/product-and-terms.md` khóa PER_SESSION, TIME_ACCESS, `termsHash`, 6 kịch bản, chính sách hoàn có điều kiện, testnet demo accelerated. **ACCEPT:** bạn xác nhận quyền và nghĩa vụ không nhầm check-in.
- [x] **D16-04 [P0]** `docs/contract-interface.md`: agreement/claim state, actor, input, events, precondition, read APIs đủ phục vụ 3 portal; bất biến I1–I10. **ACCEPT:** frontend không cần đoán ABI.
- [x] **D16-05 [P0]** Test skeleton RED: deposit, PT session, time interval, unauthorized, duplicate, refund/conservation. **ACCEPT:** `forge test` thực thi test case tên rõ.
- [x] **D16-06 [P0]** Mock token và Vault deposit minimal, kiểm thử thật. **ACCEPT:** tiền test chuyển từ buyer → Vault, `forge test` deposit PASS.
- [x] **D16-GATE [P0]** **Cả 2 gate**: 3 portal visual directions đã duyệt + routes chạy; 3 service boot/health pass riêng và contract deposit được test. Nếu chậm, giảm phần trang phụ nhưng KHÔNG được bỏ high-fidelity freeze hoặc một portal.

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

**Cập nhật lần cuối:** 16/11/2026 — Revision 1.2 Microservices lock · owner đã nghiệm thu code và bằng chứng kiểm thử trong phạm vi D16
**Current Gate:** `D16-GATE`  
**Next task:** `D17-01` (sau khi owner merge PR #9)
**Accepted task IDs:** `D16-01`, `D16-02`, `D16-03`, `D16-04`, `D16-05`, `D16-06`, `D16-07`, `D16-08`, `D16-09`, `D16-GATE`
**Blocked task IDs:** *(trống)*  
**Approved Plan B:** *(trống)*  
**Current Git commit:** `ba136e7861f3b1d54fe43847b6a94ff1315c096c` (verified base on unihack-final)
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

```text
[2026-11-16 16:46 ICT] TASK=D16-06 STATUS=ACCEPTED
Owner: user-reviewed / AI-implemented
Git: cba2594b09128f4960ed0622338b8b3f9c59f72e (PR #5 merge into unihack-final)
Reviewed head: 6e59ad21f062551801bb0bcc667b3ac30e3345d8
Proof: clean Foundry re-run matched 10 targeted PASS and full suite 10 PASS, 24 expected RED, 0 skipped. Scaffold CI run 43838633624 passed.
Notes: deposit functionality only. PT settlement, TIME_ACCESS claims, disputes, refunds and withdrawals remain unimplemented. No production deployment approval.
Next: D16-07.
PlanB: none
```

```text
[2026-11-16 17:03 ICT] TASK=D16-07 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: review branch ai/d16-07-visual-freeze
Files: docs/design/d16-07/, proofs/ui/d16-07/
Tests: Chromium visual/viewport checks PASS for Customer, Gym, Operations at 1440x900 and 390x844.
Proof: proofs/ui/d16-07/review.md, capture.log and six viewport screenshots.
Notes: static fixture only; no Fuji connection, signing or service integration.
Next: Owner reviews all three visual references before D16-08.
PlanB: none
```

```text
[2026-11-16 17:27 ICT] TASK=D16-07 STATUS=ACCEPTED
Owner: user-reviewed and merged PR #6
Git: a90ac94 (owner merge)
Proof: approved d5dbb1abf7cfd87865ee8fc77cd82d42ae36108a. Customer 9/10, Gym 9/10, Operations 8/10. Scaffold CI 43845974149 passed.
Notes: visual direction only.
Next: D16-08.
PlanB: none
```

```text
[2026-11-16 17:27 ICT] TASK=D16-08 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: review branch ai/d16-08-portal-shells
Files: apps/web/src/, proofs/ui/d16-08/
Tests: web typecheck/build and Chromium direct entry, navigation, reload and responsive checks passed.
Proof: proofs/ui/d16-08/README.md, browser.log and four screenshots.
Notes: fixture data and UI states only; wallet signatures and chain integrations are pending.
Next: owner reviews D16-08.
PlanB: none
```


```text
[2026-11-16 19:12 ICT] TASK=D16-08 STATUS=ACCEPTED
Owner: user-reviewed and merged PR #7
Git: 5b144518fe19693e71900f16c8464f595ad5e017 (owner merge)
Reviewed head: a9343c80d14d9abfaafcd9ce83001979257fb1e1
Proof: owner accepted 13 route cases in Chromium at 1440×900 and 390×844, typecheck, build and Scaffold CI.
Notes: static React shell acceptance only.
Next: D16-09.
PlanB: none
```

```text
[2026-11-16 19:12 ICT] TASK=D16-09 STATUS=AWAITING_REVIEW
Owner: AI-implemented / pending user review
Git: review branch ai/d16-service-boundary
Files: docs/service-contracts.md, services/*, packages/*, infra/postgres-init/, compose.yaml, scripts/, proofs/d16-09/
Proof: proofs/d16-09/README.md and raw command logs.
Notes: independent local processes and database ownership verified. Business routes return 501. PR #8 review revision uses /health for Indexer container liveness and keeps /ready at 503 (SYNC_NOT_IMPLEMENTED). Docker runtime NOT_RUN locally.
Review proof: proofs/d16-09/healthcheck-review/
Next: Owner reviews D16-09.
PlanB: none
```


```text
[2026-11-16 19:41 ICT] TASK=D16-09 STATUS=ACCEPTED
Owner: user-reviewed and merged PR #8
Git: ba136e7861f3b1d54fe43847b6a94ff1315c096c (owner merge)
Reviewed head: 99699f19c120d2028c21a4766bdba3f46d35e57e
Proof: proofs/d16-09/README.md and proofs/d16-09/healthcheck-review/. Scaffold CI run 43867538923 passed.
Notes: Docker runtime NOT_RUN. Fuji indexing, business APIs and production integration remain unimplemented.
Next: D16-GATE.
PlanB: none
```

```text
[2026-11-16 19:41 ICT] TASK=D16-GATE STATUS=AWAITING_REVIEW
Owner: AI evaluated evidence; awaiting owner decision
Git: ba136e7861f3b1d54fe43847b6a94ff1315c096c (evaluated unihack-final)
Tests: reviewed existing accepted evidence; no new runtime tests run for this documentation task.
Proof: D16-07 visual acceptance and D16-08 proofs/ui/d16-08/browser-route-review.log; D16-09 proofs/d16-09/healthcheck-review/isolation.log; D16-06 proofs/d16-06-vault-deposit.log.
Result: all three portal visual directions and routes accepted. Three service processes start independently and return HTTP 200 at /health. Vault deposit has passing Foundry coverage.
Notes: scope is the D16 checkpoint. Docker runtime NOT_RUN; Fuji sync unimplemented; 24 expected Vault RED cases remain outside the deposit scope.
Next: Owner reviews D16-GATE before D17.
PlanB: none
```


```text
[2026-11-16 19:46 ICT] TASK=D16-GATE STATUS=ACCEPTED
Owner: user-reviewed and technically accepted D16-GATE in the PR #9 final review
Git: 95c98ad7dfa1a34a8e1a4a46d4e301e70a9d36d5 (reviewed PR #9 head); ba136e7861f3b1d54fe43847b6a94ff1315c096c (verified unihack-final checkpoint)
Proof: PR #9; D16-07 visual acceptance; proofs/ui/d16-08/browser-route-review.log (13 routes at both viewports); proofs/d16-09/healthcheck-review/isolation.log (three independent services and HTTP liveness); proofs/d16-06-vault-deposit.log (deposit coverage).
Notes: Docker runtime NOT_RUN. Foundry full suite: 10 PASS, 24 expected RED. Fuji sync is not implemented. Production deployment is not approved.
Next: D17-01 after owner merges PR #9, as a separately reviewed task.
PlanB: none
```


```text
[2026-11-17 18:06 ICT] TASK=D17-GATE STATUS=TECHNICALLY_ACCEPTED_WITH_DOCUMENTED_LIMITATIONS
Owner: independent reviewer accepted the local prototype at the integration checkpoint. The timestamp records the evidence commit time.
Git: 2422b8eef9ec04a15e38f6ca301612d890b9402c (unihack-final, PR #19 merge).
Proof: proofs/d17-gate/README.md and proofs/d17-gate/post-merge-regression.log.
Tests: Foundry 60 PASS, workspace 33 PASS, Catalog PostgreSQL 9 PASS, Economics 9 PASS, Chromium 1440x900 and 390x844 PASS, local Anvil PASS. Typecheck, build, isolation and SDK ABI PASS.
Scope: D17-09 prototype acceptance uses POST /v2/scenarios/compare under the documented Service Contract exception. V1 remains HTTP 501. A/B/C/D are illustrative research scenarios.
Limitations: Actual Catalog proxy, real browser wallet extension, Docker Compose end-to-end and Fuji deployment NOT_RUN. OR-02 and OR-03 remain MEDIUM per prior review. No on-chain advance or non-Full-Reserve mode authorized. Production and real-money custody unapproved.
Next: Controlled-merge authorization after the documentation corrections. Fuji remains NO-GO_PENDING_SEPARATE_AUTHORIZATION.
PlanB: none
```


```text
[2026-11-17 22:06 ICT] TASK=D18-02 STATUS=STAGE_A_AND_B_ACCEPTED
Owner: reviewer accepted Stage A and Stage B on Avalanche Fuji (43113).
Git: cdbaa581f5249459cdc8ede9ab19d8bda8cd0697 (approved deployment source).
Proof: proofs/d18-02-preflight/stage-b-review.md and proofs/d18-02-preflight/stage-c-rpc-snapshot.json.
[ĐÃ XÁC NHẬN] Stage A: MockReserveToken 0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9, tx 0xa43f194eb5b5ea568726e8e2106e0faa4ff698d9cd73bacfa854577a35d8890e, block 61238655, status 1.
[ĐÃ XÁC NHẬN] Stage B: ReserveVault 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad, tx 0x120617c50873b2393289c5f292c065a060d565b99f0fc8707d82071cfb179451, block 61240386, status 1, gas used 5006421, effective gas price 160 wei, cost 801027360 wei.
Limitations: Acceptance covers approved payloads, receipts and deployed configuration. Comprehensive security audit and production readiness are outside this acceptance. OR-02 through OR-05 remain.
Next: Stage C preflight evidence for independent review. Owner authorization NOT_GRANTED. Buyer funding NO-GO.
PlanB: none
```


```text
[2026-11-17 23:02 ICT] TASK=D18-02-STAGE-C-BUYER-FUNDING STATUS=BLOCKED
Owner: GRANTED_CONDITIONAL for exactly one reviewed Fuji transfer. Reviewer 2: ACCEPTED_WITH_LIMITATIONS.
Git: cdbaa581f5249459cdc8ede9ab19d8bda8cd0697.
Proof: proofs/d18-02-preflight/stage-c-execution-attempt.json and stage-c-review.md.
[ĐÃ XÁC NHẬN] Read-only snapshot at block 61243324 matched runtime and payload, nonce 2/2, simulation true and gas estimate 52919.
[CHƯA XÁC NHẬN] Local signer identity. Configured owner signer is unavailable here. No broadcast attempted.
Next: Repeat fresh gates where the existing owner signer is configured. Stage C funding remains unexecuted.
PlanB: none
```


```text
[2026-11-17 23:08 ICT] TASK=D18-02-STAGE-C-BUYER-FUNDING STATUS=BLOCKED
Owner: GRANTED_CONDITIONAL for the single reviewed Fuji transfer.
Git: cdbaa581f5249459cdc8ede9ab19d8bda8cd0697.
Proof: proofs/d18-02-preflight/stage-c-review.md.
[ĐÃ XÁC NHẬN] Recovery shell is the hosted workspace. The configured local signer is unavailable here.
[CHƯA XÁC NHẬN] Local signer identity. Fresh Fuji checks not run for this recovery checkpoint. No broadcast attempted.
Next: Resume in the owner WSL environment and verify the existing account before a fresh preflight.
PlanB: none
```


```text
[2026-11-17 23:26 ICT] TASK=D18-02-STAGE-C-EVIDENCE-CLOSURE STATUS=AWAITING_REVIEW
Owner: executed one approved Fuji transfer. Reviewer 2 technical decision: ACCEPTED.
Git: cdbaa581f5249459cdc8ede9ab19d8bda8cd0697 (approved deployment source).
Files: Stage C review, transaction receipt evidence and this State Log entry.
Tests: Read-only Fuji RPC transaction, receipt, event, adjacent block balances and fee reconciliation PASS.
Proof: proofs/d18-02-preflight/stage-c-transaction-receipt.json and https://testnet.snowtrace.io/tx/0xc1abbc794cce5f6b82c3c7868b34883dd35b51a312e92ed410f2cf04b276ee69.
[ĐÃ XÁC NHẬN] Stage C funding COMPLETED on Fuji 43113 at block 61244005. Deployer -1903, Buyer +1903 base units. Actual fee 8340640 wei.
Notes: This documentation closure is awaiting review. Testnet only. OR-02 through OR-05 remain. No further transaction was sent.
Next: OWNER_AND_REVIEWER_2_DOCUMENTATION_REVIEW.
PlanB: none
```


```text
[2026-11-20 ICT] TASK=D18-04 STATUS=TECHNICALLY_COMPLETED_PER_WALLET1
Owner: Owner-operated Fuji signing; Wallet 1 reported review of four successful receipts; CTO 2 inherited report, not an independent fresh RPC proof.
Chain: Avalanche Fuji 43113; PT Agreement #1; Token and Vault unchanged.
TX1: proposeSession 0x9dcca6c5feda36ef151fa5a7ad5cc9d3e59785432260a2182814989f18eeb01b block 61373562 status 1.
TX2: confirmSession 0xf90b5d3c9e24827600e3102e1afc36ed1b55889f45ce106ffbeb8eab179f106f block 61374892 status 1.
TX3: finalizeClaim 0xd84107f90027f7e90e3c61bdc74dceb9bc018625c8c291ec7a6973b807488ac5 block 61375443 status 1.
TX4: claimEarned 0x4b3f87cb99bc297fb8a57779fbc50c6c3e1f32fc7d0a6a5dc71dae5c84392273 block 61376149 status 1.
Result per Wallet 1 receipts: earnedFinalized=100, gymWithdrawn=100, vault balance=903 token base units after first PT payout. Token has 18 decimals; base units are not MRES whole tokens or VND.
Evidence provenance: WALLET_1_REPORTED_RECEIPTS_VERIFIED; CTO 2 did NOT re-broadcast, sign or independently re-query Fuji. Reviewer 2 earlier D18-04 HOLD snapshot predates these transactions. Evidence hash is owner demo attestation, not independently verified gym attendance.
Limitations: Owner's separate formal State Log acceptance is not claimed; D18-05 TIME_ACCESS and D18-06 authorized refund remain NOT_VERIFIED. Four PT receipts are not four D18-GATE transaction groups.
Next: Wallet 2 D18-05 then D18-06, exact Owner ONE_TX_GO per transaction; no PT retry.
PlanB: none
```

```text
[2026-11-20 ICT] TASK=D18-11 STATUS=TECHNICALLY_ACCEPTED_WITH_LIMITATIONS
Owner: CTO 2 direct exact-HEAD PR review and controlled merge within Owner-delegated authority; no wallet action.
PR: https://github.com/remjphong/Open-Reserve/pull/26
Reviewed candidate HEAD: cceccb3b6e206e05bee12fe7bb60d62d052eaeb9
Merge: bff2ff53bb7e1d858a0a77411f0fdcfbca9d2e45
CI: https://github.com/remjphong/Open-Reserve/actions/runs/44722505570 SUCCESS workspaces, contracts and real Docker Compose (3/3 jobs); inspected run logs.
Proof: source patch 10 paths; 6 SPA routes HTTP 200; Catalog/Economics/Indexer process liveness; DB role cross-connect denial; Economics isolated restart; Indexer stopped/fail-closed/restarted; real proxy schema and error checks.
Limitations: no Fuji RPC configured in Compose CI; Indexer /ready=503 is correct degraded state; full historical sync NOT_VERIFIED; browser-signed 3-role E2E and real desktop/mobile rendered QA NOT_VERIFIED; one npm HIGH advisory reported in CI remains to triage before D20 freeze.
Next: Worker 4 D18-09 Operations then D19/D20; Wallet 2 D18-05/D18-06 independent lane.
PlanB: none
```


```text
[2026-11-20 ICT] TASK=D18-09 STATUS=TECHNICALLY_ACCEPTED_WITH_LIMITATIONS
Owner: CTO 2 direct technical review and controlled merge (not an independent full browser acceptance).
PR: https://github.com/remjphong/Open-Reserve/pull/29
Exact reviewed source HEAD: b03a232ac4b7b40181f1f1e682add9a22240f51e
Base: 081c62312df3674426c1f793a2acf25119e5e0c4
Merge SHA: 47c1a1713aa960df95bd01c47ee16d55f17aa32d
Scope: 7 paths, read-only Operations financial audit and claim/evidence provenance; no ABI, contract or backend writing and no Fuji transaction.
CI: https://github.com/remjphong/Open-Reserve/actions/runs/44736389273 completed 3/3 SUCCESS, workspaces typecheck/build/tests and 7/7 targeted Operations tests, contracts Foundry/SDK, real five-container Compose HTTP/proxy/isolation/failure smoke.
Direct technical review: Operations numerical routes use shared direct Vault financial reads; getClaim shares pinned session.read.blockNumber; role classification derives from Vault, no signer/writeContract path in Operations; fixture labeling isolated; Catalog evidence bounded to agreement/claim/hash; indexer advisory/fail-closed; I1 equality displayed in token base units.
Limitations: No actual 1440x900/390x844 browser wallet-resolver profile verification, wrong-chain/account live EIP-1193 negative cases, signed Resolver settlement action, live verified Catalog evidence or full Fuji historical sync evidence. No production-ready claim. npm one HIGH advisory still needs targeted D20 triage.
Next: Worker 4 D19-01/02/03/06/07/08/09 technical integration; Wallet 2 D18-05/06 separate Owner-signed tx lane; CTO D20 release/screenshot/evidence review.
PlanB: none
```


```text
[2026-11-20 ICT] TASK=D19-01 STATUS=TECHNICALLY_ACCEPTED_WITH_LIMITATIONS
Reviewer: CTO 2 targeted technical review of exact source diff and CI, not real Buyer browser end-to-end acceptance.
PR: https://github.com/remjphong/Open-Reserve/pull/30
Reviewed HEAD: c79eea4789e9473dbc3853842f96d9e34906d3e8
Base: d1af9e4a60ccb1f4573cad0d27bd8cd0d3617c26
Controlled merge SHA: 89f544dd1f96d82a87668d2ef4763b6a25d19230
Scope: 5 source/CI/test/proof paths, Customer PT Agreement #1 direct read, Vault ledger/base-unit classification and four historical PT receipt hashes as WALLET1_REPORTED_RECEIPTS_VERIFIED. Optional read-only structural receipt/transaction/canonical block check does not independently prove attendance or full event/value settlement.
CI: https://github.com/remjphong/Open-Reserve/actions/runs/44739567915 completed workspaces/contracts/real Compose 3/3 SUCCESS; targeted D19-01 6/6 PASS; logs examined for npm HIGH advisory and bounded Compose failure smoke.
Limitations: real Buyer browser, 1440x900 and 390x844 screenshots, manual Fuji receipt-click verification, full historical Indexer sync and full three-role E2E NOT_VERIFIED. Existing one HIGH npm advisory requires D20 targeted triage.
Next: Worker4 D19-02 Gym, then D19-03/06/07/08 and D20 integration/QA; Wallet2 on-chain D18-05/06 remains separate.
PlanB: none
```

```text
[2026-11-20 ICT] TASK=D18-05-TX1 STATUS=ONCHAIN_RECEIPT_VERIFIED_PER_WALLET2_REPORT
Reviewer: CTO 2 records Wallet 2 final read-only receipt/ledger review reported in GitHub issue #27 comments 7040947288 and 7041015347; CTO did not independently re-query Fuji RPC.
Transaction: 0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85; block 61380299; status 1; Buyer to Vault, agreementId 2 TIME_ACCESS, 900 MRES base units; getBalances(2) remainingLocked=900, withdrawable=0, refundable=0, disputedLocked=0, unallocated=900 per Owner cast output validated by Wallet 2.
Actual event parameters reported: startAt=1795182500, endAt=1795182770, challenge=60; gasUsed=177904, effectiveGasPrice=167 wei.
Provenance: USER_PROVIDED_CAST_RECEIPT_AND_RPC_STATE + WALLET2_REPORTED_VERIFIED, not direct fresh CTO RPC; no auto retry.
Governance caveat: in CTO chat an earlier ONE_TX_GO candidate had startAt=1795181258, endAt=1795181528 and maxPriority=68 wei. Actual reported TX uses different time fields and Wallet2 reported an additional Owner-authorized fee candidate. Evidence of the exact Owner approval for actual new candidate must be cross-referenced before marking GOVERNANCE_AUTHORIZATION_VERIFIED; receipt success itself is not an authorization record.
Next: Wallet2 D18-05 TX2 Merchant proposeTime only when elapsed and with separate exact Owner ONE_TX_GO; then remaining TIME sequence and D18-06 refund. D18-05 task gate remains open.
PlanB: none
```


```text
[2026-11-20 ICT] TASK=D19-02 STATUS=TECHNICALLY_ACCEPTED_WITH_LIMITATIONS
Reviewer: CTO 2 directly reviewed Worker 4 PR #31 exact source delta and GitHub Actions; not full Merchant browser E2E.
PR: https://github.com/remjphong/Open-Reserve/pull/31
Exact reviewed HEAD: f4901d29aa406308a96375a96804bec87bffcf26
Base: a50601dec7a2106a8d9c21e3b63df9f60a484657
Controlled merge SHA: 9869803b6f074714eccd165e750cbeb03e4b694d
Scope: 5 paths: D19-02 Gym direct PT #1 and TIME_ACCESS #2 pinned Vault ledger, documented historical receipt provenance, safety arithmetic, targeted regressions; no contract/ABI/backend/chain-write changes.
CI: https://github.com/remjphong/Open-Reserve/actions/runs/44749385721 workspaces/contracts/real Compose SUCCESS 3/3; targeted Gym 6/6, prior Customer 6/6 and Operations 7/7 PASS; live Compose isolation/proxy/stopped Indexer fail-closed verified in CI logs.
Evidence limitations: No actual Owner Fuji Merchant browser 1440x900/390x844 read and invalid-wallet negative traces; full Fuji Indexer historical sync not verified; TIME_ACCESS #2 only TX1 deposit reported by Wallet 2, no earned/finalized/withdraw/refund receipt in PR. HIGH npm audit advisory still open for targeted D20 triage.
Ownership: Worker 3 D18-10 closed and formally succeeded by Worker 4 (PR #25 handoff); no new Worker 3 task assigned.
Next: Worker 4 D19-03 Operations cross-portal consistency, then D19-06/07 browser E2E, D19-08 proof ledger, D19-09 failure, D20 release/submission.
PlanB: none
```


```text
[2026-11-20 ICT] TASK=D19-03 STATUS=TECHNICALLY_ACCEPTED_WITH_LIMITATIONS
Reviewer: CTO 2 reviewed exact Worker4 PR #32 source/CI directly; not full three-wallet browser E2E.
PR: https://github.com/remjphong/Open-Reserve/pull/32
Exact reviewed HEAD: 1182b8edc82a6383e5474b3828415820f13ab444
Base: 011efafe293a42c372c9e5365fc58a10fd2a9bc3
Controlled merge SHA: e96649a798cb776d19659ca76c00eaba34579e95
Scope: 5 paths, Operations numeric PT #1 and TIME_ACCESS #2 cross-portal links; pinned shared Fuji Vault identity/getter/I1 checks and explicit Wallet2 TX1 deposit provenance; no ABI/Solidity/backend change, no chain write.
CI: https://github.com/remjphong/Open-Reserve/actions/runs/44755080320, workspaces/contracts/real Compose 3/3 SUCCESS; D19-03 8/8 tests PASS; prior D18-09/D19-01/D19-02 regressions, TS/build/SDK and failure smoke passed.
LIMITS: Actual Fuji browser Customer/Gym/Resolver simultaneous wallet sessions and same-block comparative reads NOT_VERIFIED; 1440x900 and 390x844 screenshots NOT_VERIFIED; full Fuji historical scan NOT_VERIFIED; D18-05 TX2+ and D18-06 receipt not provided; one npm HIGH advisory pending exact-root triage.
NEXT: Worker 4 D19-06/07 actual three-role browser QA, then D19-08/09 and D20 submission proof. Wallet2 only with distinct Owner ONE_TX_GO per chain write.
PlanB: none
```


```text
[2026-11-20 ICT] TASK=D19-06-P1 STATUS=SCOPED_SOURCE_FIX_ACCEPTED_WITH_LIMITATIONS
Reviewer: CTO 2 directly reviewed PR #33 source/test/CI, GitHub proof record, NOT the 8 original Owner screenshot pixels.
PR: https://github.com/remjphong/Open-Reserve/pull/33
Exact reviewed HEAD: befd4778b4ed42cd6d7205b5ebd344ae7cc07ed3
Base: 7f45cee5ab810281866906a6f4f3730f087b87fa
Controlled merge SHA: aa84b54743d6443ec3e3bb5f2cb8cedad4159fea
Scope: 4 paths, Operations AppShell P1 unconditional disconnected-demo banner replaced with neutral read-only per-page notice, 2 new negative tests, exact-head CI, Owner screenshot provenance + route outcomes documented; no chain writes/contracts/roles/money changes.
CI: https://github.com/remjphong/Open-Reserve/actions/runs/44762028317 workspaces/contracts/real Compose SUCCESS 3/3; D19-06 2/2 tests, previous regressions and service failure smoke PASS. One existing npm HIGH still open.
Actual browser evidence source: Owner-reported eight Chrome 1440×900 screenshots with filename/SHA256 listed in proofs/d19-06-desktop-browser-qa.md. CTO did not receive screenshot image bytes from this GitHub PR and did NOT independently verify pixels/checksums. Owner WSL reported QA worktree at 7f45cee and Vite 127.0.0.1:5174; original screenshots PRE-FIX.
D19-06_FULL_DESKTOP_E2E=HOLD: Merchant real wallet remains not connected, two claim states below fold, wrong-account/chain/rejection/disconnect tests NOT_RUN, same-block three-role agreement matching NOT_VERIFIED, exact HTTP statuses/PID not measured, post-fix screenshot NOT_RUN.
D19-07_MOBILE=NOT_RUN; full Fuji historical sync NOT_VERIFIED; TX3/TX4 status separate Wallet2 chain lane.
Next: Worker4 gather actual post-merge desktop Merchant/claim/negative/post-fix and 390x844 mobile evidence. If blocked, report exact unresolved status; prioritize D20 security/release and Owner submission deadline.
PlanB: none.
```


```text
[2026-11-20 ICT] TASK=D18-05-TX3 STATUS=RECEIPT_VERIFIED_PER_WALLET2_REPORT
Authority: Explicit Owner ONE_TX_GO for exact finalizeClaim(2,1) recorded in Issue #27 comment 7043172991, following CTO technical approval comment 7043106106.
Evidence: Wallet2 reviewed Owner-provided raw cast tx/receipt/getClaim/getBalances and reported SUCCESS in Issue #27 comment 7043508116; CTO did not independently re-query Fuji RPC and original raw Owner console output is not embedded in this GitHub State Log.
Fuji TX: 0xe7bcd43b3b86ef752413ce09d6b8a2da8ea630ae2e42603dadd916ad20aa3603
Block: 61384394; status=1; Merchant nonce=3; Vault ClaimFinalized(agreementId=2,claimId=1,amount=900 MRES base units), Claim state FINALIZED=4, awardedToGym=900, awardedToBuyer=0.
Owner/WALLET2-reported post-TX3 getBalances(2): remainingLocked=900, withdrawable=900, refundable=0, disputedLocked=0, unallocated=0. Gym has earned but not withdrawn: gymWithdrawn=0. Do NOT claim token payout, ERC20 Transfer or gym balance increment from TX3.
Provenance label: USER_PROVIDED_CAST_ONCHAIN_RAW_OUTPUT + WALLET2_REVIEWED_SUCCESS / CTO_INDEPENDENT_RPC_NOT_RUN.
TX3: NO RETRY. TX4 claimEarned(2): separate exact candidate pending CTO technical review and separate Owner ONE_TX_GO; no signed/broadcast TX4 yet in evidence. D18-06 refund still open; TIME #2 has no unallocated budget after full earned award.
D19-06 Worker4: may reference historical TX3 reported-finalized proof, but current browser amounts must come only from fresh pinned Vault read, not from this historic snapshot. Same-block three-role E2E remains NOT_VERIFIED.
PlanB: none.
```


```text
[2026-11-20 ICT] TASK=D18-05 STATUS=ONCHAIN_HAPPY_PATH_ACCEPTED_PER_WALLET2
Reviewer: CTO 2 acceptance based on Wallet2 review of Owner-provided raw cast tx, receipts, event logs and Fuji RPC ledger; CTO independent live RPC query NOT_RUN (explorer URL not machine-accessible during review).
Source: https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7044296152
Chain: Avalanche Fuji ID 43113; Vault: 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad; Agreement #2 TIME_ACCESS; 900 MRES ERC20 base units (18 decimals, not 900 whole MRES/VND).
TX1 openAgreement Buyer deposit, block 61380299, receipt status 1 per Wallet2: 0xdb4c9d91f1895c88e719cb1062db8a61cd096c00e5bf75e58b70bf389808ae85
TX2 proposeTime Merchant Claim #1, block 61382886, receipt status 1: 0x4a24979eb2b8b254d7ccab1169689eea94325148b50dec1332842ff1b1fdb030
TX3 finalizeClaim(2,1) amount 900 earned to gym, block 61384394, receipt status 1: 0xe7bcd43b3b86ef752413ce09d6b8a2da8ea630ae2e42603dadd916ad20aa3603
TX4 claimEarned(2) Merchant, block 61385657, receipt status 1: 0x44c653605fb0db3fa5890d8338ac8d40e136b0737fa9a359e29019371b0a14b2
TX4 reported event EarnedClaimed(2,Merchant,900), ERC20 Transfer(Vault,Merchant,900). Reported fresh post-TX4 getBalances(2) = remainingLocked 0, withdrawable 0, refundable 0, disputedLocked 0, unallocated 0. Merchant MRES token balance 1000, Vault balance 903, delta +900/-900 versus prior.
Decision: D18-05 Fuji TIME_ACCESS four-transaction demo HAPPY PATH accepted WITH PROVENANCE LIMITATIONS; do not retry. Owner ONE_TX_GO TX4 reported in GitHub issue comment 7044076905. Original Owner exact candidate approval provenance discrepancy on TX1 remains OPEN and is NOT waived by on-chain success. Evidence hash is demo owner attestation, NOT independent attendance proof; no production, real legal custody, audit, PMF or pilot claims.
D18-06 remains HOLD: TIME #2 unallocated=0/refundable=0; PT #1 903 unallocated/remainingLocked as reported but no automatic Buyer refund; separate read-only termination feasibility and mutually authorized amount, CTO review and per-write Owner ONE_TX_GO required.
```

```text
[2026-11-20 ICT] TASK=D19-06-DESKTOP-PARTIAL STATUS=BOUNDED_QA_ACCEPTED_WITH_LIMITATIONS
Source: Worker4 Issue #27 comments 7043994059, 7044055135, 7044130629 and 7044331021. Original screenshot PNGs held in Owner-Worker4 ChatGPT; GitHub contains only reports/file names/SHA256, not actual image bytes; CTO did NOT independently inspect original pixel files/checksum.
Owner WSL QA provenance: /home/phong/openreserve-d19-06-postmerge on accepted source HEAD 460eec44fa208184a4737048db9071b7673de3f3, Vite 127.0.0.1:5175, Chrome responsive 1440x900, Fuji chain 43113, Core Merchant address 0xA337FCeC5f9508C3Ab5E10aE571610E167548878.
Bounded Owner/Worker4-reported PASS: Operations PR33 neutral banner post-fix rendered, Merchant Gym #1/#2 direct identity + pinned Vault financial ledgers, Resolver Agreement #1/#2 claimId1 below-fold direct FINALIZED rendered, and Indexer DOWN/HTTP500 isolated from direct Vault read with no false VERIFIED_EMPTY. Claim #1 on PT amount=100 earned/finalized; claim #1 on TIME amount=900 finalized; no attested attendance from UI.
Browser-reported Gym PT #1 at block 61385754: deposited 1003, earnedFinalized 100, gymWithdrawn 100, withdrawable 0, remainingLocked/unallocated 903, refundable 0.
Browser-reported Gym TIME #2 at block 61385727: deposited 900, earnedFinalized 900, gymWithdrawn 900, withdrawable 0, remainingLocked 0, unallocated 0, refundable 0, consistent with Wallet2 TX4 receipt at earlier block 61385657.
NOT_VERIFIED: original image pixel independent CTO inspection; buyer/merchant/resolver pinned same BLOCK HASH simultaneous financial concordance (screens differ); wrong-account, wrong-chain, rejected wallet connect, disconnect/reconnect negative browser traces; independent per-route HTTP status measured; 390x844 mobile; full Fuji historical Indexer sync. D19-06_FULL_BROWSER_E2E remains HOLD, D19-07_NOT_RUN, D20 security 1 HIGH npm advisory pending bounded audit. No new Worker4 PR open as of this review; PR33 had already been merged.
Next: Worker4 complete negative desktop QA or explicitly close with known limits; start high-priority mobile 390x844 and D20 readiness/security/public demo proof under CTO-controlled scope. No Worker4 Fuji writes.
```


```text
[2026-11-20 ICT] TASK=D20-ZOD SECURITY_PATCH_SCOPE=ACCEPTED_WITH_PROVENANCE_LIMITS
CTO controlled-merged PR #34 https://github.com/remjphong/Open-Reserve/pull/34 after review exact source diff and Actions. Base e54a97104602a89ca40ad6c23e150c5f1fef30aa, reviewed HEAD c7001d92054ddcf787c59a07af02b1ac2caa03ea, controlled merge SHA 3963e4df020d21ef8a698dd44195ee3345293844.
Scope: exactly 2 files packages/api-contracts/package.json pin zod 4.1.12 -> 4.6.7 and package-lock.json corresponding api-contracts pin and canonical zod package entry (version, tarball URL, integrity); unrelated lock entries/SDK/Solidity/ABI/portal/service code unmodified. GHSA-mrhx-c7xc-m3w5 HIGH affected <4.6.6 mitigated by chosen 4.6.7.
Exact-head CI: https://github.com/remjphong/Open-Reserve/actions/runs/44775322903 completed SUCCESS 3/3: real npm ci found 0 vulnerabilities in workspaces and Compose services, strict TypeScript/build/workspace API/service tests, previous portal regressions, Foundry/SDK, real five-container Compose service isolation, API proxy/readiness, DB-role separation, Indexer outage/restart.
Additional explicit audits: Owner reported WSL detached exact reviewed HEAD c7001d... (clean /home/phong/openreserve-d20-zod-audit) with npm audit --json and npm audit --omit=dev --json, both exit 0, metadata vulnerabilities info/low/moderate/high/critical/total all 0, affectedPackages=[] and error=null. Evidence source: OWNER_PROVIDED_WSL_PARSED_AUDIT_JSON / WORKER4_REVIEW; raw JSON retained only in Owner WSL /tmp/d20-zod-full.KSKalN.json and /tmp/d20-zod-prod.TjJgk8.json; CTO did not independently read those bytes. npm audit 0 is not exhaustive application security/pentest/regulatory clearance.
Remaining warning: esbuild@0.28.2 install-scripts allowScripts; Vite bundle size advisory; not equal a remaining npm HIGH. No adversarial large-array stress tests were added to exact two-file patch; existing API validation and 16KiB body limit retained.
D20_ZOD_AUDIT_BOUNDED=ACCEPTED; D20_PRODUCTION_SECURITY=NOT_APPROVED; D20_RELEASE_AND_SUBMISSION=HOLD until actual public address, incognito access, Owner evidence and submission receipt. D19-06 desktop partial/negatives and D19-07 390x844 mobile remain unaccepted. D18-06 refund separate Owner-authorized TX1 only, no CTO on-chain post-tx confirmation in this review.
PlanB: not activated.
```


[2026-11-21 ICT] TASK=D18-06-TX1 STATUS=ONCHAIN_SUCCESS_PER_WALLET2_OWNER_RPC_REPORT
Source: https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7045700542
Owner exact ONE_TX_GO reported in Issue comment 7045067264; CTO technical conditional GO comment 7044865050.
Fuji 43113 TX1 proposeTermination(agreementId=1,proposedRefund=903,evidenceHash=0xcc5b89e994155b1fd3e44997f2e1a10c6630fc076cda00dae55754bca29a64ee) Buyer 0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B to Vault 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad; nonce8/value0.
TX 0x9af4e6884900c97234b2cc583f34ed02add58fbe69e9c260ba425d40313e965b; Wallet2 reviewed Owner RPC block 61387585/hash 0x4141acf46040d3204dbc6f82127d9748157504d3c1151e1267a1d722fb04384b status1, gasUsed151038, effectiveGasPrice160wei.
Log TerminationProposed agreement#1/proposal#1/Buyer/903 MRES ERC20 base units and demo hash; later getActiveTerminationId(1)=1 and getTermination(1,1)=PROPOSED; Buyer nonce latest/pending9/9. Reported getBalances(1)=(903,0,0,0,903) remainingLocked,withdrawable,refundable,disputedLocked,unallocated; no refundAuthorized or token payout from TX1.
Provenance USER_PROVIDED_FUJI_RPC_PYTHON_TERMINAL_OUTPUT + WALLET2_REVIEWED_SUCCESS, CTO NOT independently queried Fuji. DEMO_ONLY_NO_REAL_PROVIDER_AGREEMENT hash does NOT establish provider assent, legal refund, financial viability. TX1 NO RETRY.

[2026-11-21 ICT] TASK=D18-06-TX2 STATUS=CTO_TECHNICAL_GO_CONDITIONAL_OWNER_ONE_TX_GO_PENDING
Source https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7045840567
Technical Solidity direct review: ReserveVault.sol acceptTermination(agreementId,proposalId), _checkTerminationBudget, _settleTermination; requires other party Merchant when Buyer proposed state PROPOSED, liveClaims0, refund budget<=unallocated; agreement may terminate and refundAuthorized increase, but no ERC20 transfer in TX2.
Exact candidate Fuji43113 FROM Merchant 0xA337FCeC5f9508C3Ab5E10aE571610E167548878, TO Vault 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad, selector reported 0x1f187aa3, calldata 0x1f187aa300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001, nonce5, gasLimit109919, maxFeePerGas180wei, maxPriorityFee150wei, nativeValue0, cap19785420wei.
Owner WSL cast snapshot at block 61388056/hash 0x021fb6385c3591e7aebb707977b793367bf7d759dd9db5e6b5d442d16c06a20f: OPEN PER_SESSION #1, termination PROPOSED Buyer amount903, activeTerminationId1, liveClaims0, getBalances(1)=(903,0,0,0,903), Merchant latest/pending5/5, eth_call void success0x, gas estimate76861, gas fees+native cap passes. CTO structurally decoded calldata (1,1), did NOT direct live RPC.
CTO technical GO is NOT signing permission. Require fresh exact Owner ONE_TX_GO TX2 and immediate new read-only check of chain/Core Merchant EIP1193, source/call, signer, transaction nonce+fees, budget, termination state and eth_call; drift HOLD/re-candidate/re-GO. After real receipt status1 expected termination ACCEPTED, agreement TERMINATED, refundAuthorized903 and refundable903 BEFORE Buyer claim; expectation only, not actual. TX3 Buyer claimRefund separate CTO candidate/Owner ONE_TX_GO. D18-06 overall IN_PROGRESS.

[2026-11-21 ICT] TASK=D20-LOCAL-DEMO-WAIVER STATUS=OWNER_SCOPE_DECISION_ACCEPTED_WITH_MENTOR_PROVENANCE_LIMIT
Source https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7045841754
Owner reports UniHack mentor directly confirmed local presentation allowed and public hosting not mandatory. This is OWNER_REPORTED_MENTOR_CONFIRMATION, not independently verified organizer written rule. CTO accepts revised Owner demo scope: D20_PUBLIC_HTTPS_DEPLOYMENT=WAIVED_FOR_THIS_UNIHACK_PER_OWNER_MENTOR_REPORT, NOT PASS/DEPLOYED. D20_PUBLIC_URL=NOT_DEPLOYED; THREE_INDEPENDENT_HOSTED_WEBSITES=NOT_VERIFIED.
Architecture truthful: /customer, /gym, /operations role paths in same React SPA; 3 independent Fastify microservices accepted by Compose CI, NOT verified all local services actually running. Replacement mandatory D20_LOCAL_DEMO_READINESS: Owner machine code SHA/cwd/port, proper Core roles/Fuji43113, live pinned PT/TIME Vault states and claim views, truthful Catalog/Indexer degraded labels, local deep-link refresh, presentation rehearsal and recorded proof fallback. Local Fuji still network RPC-dependent; no offline guarantee.
D19-06 full desktop negatives and same-block cross-role; D19-07 mobile 390x844 remain NOT_VERIFIED unless genuine evidence. Submission receipt and any organizer form constraint NOT_VERIFIED. No public hosting/tunnel/cloud spending/key access authorized, no fabricated URLs or independent website claims. No production/legal VNĐ custody/PMF/security pentest claims.


[2026-11-21 ICT] TASK=D18-06-TX2 STATUS=ONCHAIN_SUCCESS_PER_WALLET2_OWNER_RPC_REPORT
Source: https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7046703177
CTO technical GO for exact Merchant acceptTermination(1,1) was issue #27 comment 7046004856; distinct Owner ONE_TX_GO was reported in issue comment 7046124102. Owner fresh read-only pre-sign PASS reported issue comment 7046254688. Wallet2 reviewed actual Owner Python/WSl RPC receipts and state; CTO has NOT independently queried Fuji RPC. TX2 success under this bounded provenance only.
Fuji chainId43113, TX 0xeb65d83fb2dfd5ea6535c7dd6c39bd26b1d2692b043324d3a8ccd9fba2ae220e, block61389180, blockhash 0xf2d69344f0b4d88ef2ad7767a092671ca6fdb69687f685d6c12757745f8ed8e2, reported receipt.status1, Merchant 0xA337FCeC5f9508C3Ab5E10aE571610E167548878 nonce5 to Vault 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad with exact acceptTermination(1,1) calldata, EIP1559 gasUsed75810 price160 wei; 11/11 exact candidate checks reportedly PASS.
Owner RPC reported AgreementTerminated(agreement1,proposal1,Merchant,viaResolver=false,refundAmount903,decisionHash=zero), termination#1 state ACCEPTED=3, agreement #1 state TERMINATED=2, activeTerminationId0, refundAuthorized903,buyerRefunded0. getBalances(1)=(remainingLocked903,withdrawable0,refundable903,disputedLocked0,unallocated0). This is refund authorization only; no ERC20 Buyer payout or token transfer from TX2. TX2 DO NOT RETRY. Real-world provider assent and commercial/legal entitlement NOT VERIFIED: DEMO_ONLY_NO_REAL_PROVIDER_AGREEMENT.

[2026-11-21 ICT] TASK=D18-06-TX3 STATUS=CTO_TECHNICAL_GO_CONDITIONAL_OWNER_ONE_TX_GO_PENDING
Source: https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7046749319
CTO review/decision: https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7046942950
Source review directly from current ReserveVault.sol claimRefund: only Buyer, nonReentrant, withdrawable refund amount refundAuthorized-buyerRefunded>0, increments buyerRefunded before ERC20 safeTransfer to Buyer, event RefundClaimed. Method selector 0x5b7baf64 reported Wallet2; exact calldata 0x5b7baf640000000000000000000000000000000000000000000000000000000000000001 (CTO independently decoded ABI arg1=1; selector keccak not independently recomputed).
Exact proposed candidate Fuji43113 FROM Buyer 0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B TO Vault 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad, claimRefund(1), Buyer nonce9, gasLimit132996, estimated gas94613, maxFeePerGas180wei priority150wei, value0, maximum gas cap23939280wei.
Owner WSL guarded read-only Fuji snapshot reported block61389757/hash0x5e7fde5621ffae854021d471cec75d03da0b7b9080a3a504b4d0bc24c9b74777, PT agreement#1 TERMINATED, refundAuthorized903,buyerRefunded0, liveClaims0, termination#1 ACCEPTED, activeTerminationId0, getBalances(1)=(903,0,903,0,0), Buyer token balance0, Vault token balance903, Buyer nonce latest/pending9/9, eth_call from Buyer return903 and gas estimate94613 + fee/balance gates PASS. All amounts 18-decimal MRES token BASE UNITS, not whole token amounts or VNĐ.
CTO_TECHNICAL_GO_CONDITIONAL authorizes candidate presentation for Owner approval only. No Owner ONE_TX_GO TX3 received as of review; no TX3 signature/broadcast/receipt verified. Fresh Core Buyer chain and wallet signer/nonce/fees/contract/token status/eth_call required after Owner explicitly grants ONE_TX_GO. Any mismatch HOLD and return exact new candidate. Actual expected success events RefundClaimed(1,Buyer,903) and ERC20 Transfer(Vault,Buyer,903); zero vault/getBalances expected only after real status1 receipt and fresh checks. D18-06 overall IN_PROGRESS. Never repeat TX1/TX2.


[2026-11-21 ICT] TASK=D20_INTERNAL_RELEASE_DEADLINE_EXTENSION STATUS=OWNER_APPROVED_2026_11_21_15_00_ICT
Authority: Owner explicitly instructed CTO 2 chat "tôi nâng hạn release sản phẩm lên 15h hôm nay" on Saturday 2026-11-21 Asia/Ho_Chi_Minh. This changes the OpenReserve INTERNAL PRODUCT RELEASE / LOCAL DEMO milestone from the previously managed 07:00 ICT 2026-11-21 target to exactly 2026-11-21 15:00 ICT. Append-only schedule override, NOT a retroactive change to frozen original Execution Lock document dates.
External UniHack organizer SUBMISSION deadline, form/rules, and original submission receipt are NOT independently verified and are NOT automatically extended by the Owner internal release decision. If externally due earlier, prioritize actual external organizer cutoff.
Mentor allowance is OWNER_REPORTED_MENTOR_CONFIRMATION for local demo; public hosting WAIVED for this prototype only, PUBLIC_URL=NOT_DEPLOYED, no production readiness. Actual demo rehearsal/recorded fallback and evidence remain required.
Release still demands demonstrable D20_LOCAL_DEMO_READINESS on Owner machine; live browser role/Fuji current getter proof, truthful indexer/catalog degraded state, demo video/fallback, pitch/proof manifest and Owner submission evidence, with failures/NOT_RUN clearly labeled. Desktop negatives and 390x844 mobile remain NOT_VERIFIED unless separately captured. Zod targeted security patch is accepted with CI and Owner-reported zero npm audits, not a pentest. Three role routes share one React SPA; no proof of three independently hosted websites. Three backend microservices independently tested with real Compose CI, not necessarily active on Owner local presentation machine.
Wallet D18-06 TX1/TX2 Owner Fuji RPC + Wallet2-reported receipts accepted with provenance. TX3 Buyer claimRefund(1) only CTO conditional technical GO; no separate Owner ONE_TX_GO or onchain TX3 receipt as of latest CTO checkpoint. Deadline change does NOT authorize any transaction or change separate Owner signing/fresh pre-sign gates; no worker or CTO signing/broadcast/retry.
Recommended execution checkpoints, not independently binding deadlines: by 09:00 ICT wallet status and local smoke/rehearsal preparation; by 12:00 ICT real role walkthrough and recorded fallback/QA status; by 14:00 ICT evidence/video/pitch and external form checks; at 15:00 ICT Owner internal GO/HOLD release decision grounded by actual evidence. Reaching 15:00 never itself proves release complete.


[2026-11-21 ICT] TASK=D20-DESKTOP-EIGHT-ROUTE STATUS=BOUNDED_VISUAL_ACCEPTED_WITH_OWNER_SCREENSHOT_LIMITS
Worker4 evidence issue #27 comments 7053606855 and 7053745566: Owner supplied total 20+3 original Chrome 1440x900 screenshot crops, covering 8/8 known Buyer PT/TIME, Gym PT/TIME, Operations PT/TIME, Resolver PT/TIME claim routes according to Worker4 inspection. Image bytes and original SHA256 manifest ZIP remain in Owner-Worker4 chat; CTO did not directly inspect image pixels or independently compute hashes; this is WORKER4_REVIEWED_OWNER_IMAGES, not CTO_VERIFIED_SCREENSHOT_BYTES. Different pinned Fuji blocks across screenshots mean SAME_BLOCK_THREE_ROLE_NOT_VERIFIED. Local Indexer DOWN/HTTP500 and Catalog unavailable status honestly labeled. Source frontend at accepted QA ref 460eec44...; merger later Zod package patch does not establish old Vite 5175 runs patched Fastify runtime.
CTO direct source inspection Customer.tsx lines 355-357 and customer-chain.ts lines153-157: enabled Buyer claimRefund CTA can issue actual wallet.writeContract after simulateContract. This is real Fuji signing path, not safe read-only. P1 presentation safety risk: no Customer transaction/write CTA clicks during demo; Owner separately manages each wallet tx with exact ONE_TX_GO. Interactive signing/release remains HOLD; no new patch approved without reproduced active blocker and targeted CI/CTO review. Ops useLiveData mount refresh(false) but wallet events clear snapshot without auto-read retry; manually click read-only Connect/Refresh with correct Core Resolver address/Fuji43113; P2_DEMO_UX_FRICTION documented, code fix HOLD pending post-release. Resolver write action stays disabled.
Screenshots PT #1 show refundable903 prior to Buyer TX3. Wallet2 latest report issue comment 7053821341 states Buyer TX3 claimRefund(1) status1 at Fuji block61401275, Buyer refunded903 and getBalances(1) zero based on Owner Fuji RPC + Wallet2 review; CTO did not independently query RPC. Historic screenshots must not be shown as CURRENT balance, and any future demo must use fresh pinned Vault read. This note does not substitute for separate CTO formal D18-06 chain acceptance.
Decision: D20_DESKTOP_8_ROUTE_BOUNDED=ACCEPTED_WITH_LIMITATIONS; D19_06_FULL_BROWSER_E2E=HOLD until negative/account/network/reject/disconnect and same-block evidence; D19_07_MOBILE_390x844=NOT_RUN; D20_LOCAL_REHEARSAL=NOT_VERIFIED; D20_OWNER_SUBMISSION_RECEIPT=NOT_VERIFIED. D20 public hosting waived per Owner-reported mentor confirmation, no public URL. Owner internal deadline 2026-11-21 15:00 ICT and original external organizer submission deadline NOT independently reverified. Worker4 instruction https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053840606.


[2026-11-21 ICT] TASK=D18-06-REFUND-HAPPY-PATH STATUS=ACCEPTED_PER_OWNER_RPC_WALLET2_REVIEW
CTO2 formal scope acceptance of Wallet2 final report: https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7053821341
Fuji testnet chainId43113; Mock MRES ERC20 base units ONLY, NOT whole 18-decimal tokens, VND, real custody or customer payment. Vault: 0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad. Token: 0x13562Ac0Ff647Bae830e1179FF1Fc976aBCe66A9. PT Agreement #1 originally deposited1003, Merchant earned+withdrew100, remaining903 subject to contract termination agreement.
TX1 Buyer proposeTermination(1,903,evidenceHash): 0x9af4e6884900c97234b2cc583f34ed02add58fbe69e9c260ba425d40313e965b, Fuji block61387585, Owner RPC reported status1, event TerminationProposed #1/#1/903 Buyer, proposal PROPOSED. Demo evidenceHash=0xcc5b89e994155b1fd3e44997f2e1a10c6630fc076cda00dae55754bca29a64ee was intentionally labeled DEMO_ONLY_NO_REAL_PROVIDER_AGREEMENT.
TX2 Merchant acceptTermination(1,1): 0xeb65d83fb2dfd5ea6535c7dd6c39bd26b1d2692b043324d3a8ccd9fba2ae220e, Fuji block61389180, Owner RPC reported status1, exact Merchant nonce5, AgreementTerminated(#1,#1,Merchant,viaResolver=false,refundAmount903), agreement TERMINATED, termination ACCEPTED, refundAuthorized903, buyerRefunded0; refundable903 before buyer claim.
TX3 Buyer claimRefund(1): 0xc378c67bd40cb1795dda3b4049c78d7ff0ce3645a3bef2c90c6878f342cc6b3c; Fuji block61401275, canonical blockHash reported 0x315cc4ed2eecda746b4565d59efe2402f4fa249c49911d9d73ab854b2d59cd8b. Owner WSL Python Fuji RPC transaction/receipt/ledger check reported 20/20 PASS, receipt.status1, FROM Buyer 0x124C7DE92Df945477cAEbdC6745756C4B29e7b7B nonce9, TO Vault above, exact approved calldata claimRefund(1) selector 0x5b7baf64 + agreementId1, value0, EIP1559 gasLimit132996 maxFee180wei maxPriority150wei, gasUsed92454 effectiveGasPrice160wei actualFee14792640wei. Exactly one matching Vault RefundClaimed(agreement1,Buyer,903) log and ERC20 Transfer(Vault,Buyer,903) log reported in receipt. At TX3 block: agreement TERMINATED, termination ACCEPTED, refundAuthorized903, buyerRefunded903, getBalances(1)=(remainingLocked0,withdrawable0,refundable0,disputedLocked0,unallocated0), token.balanceOf(Buyer)=903 and balanceOf(Vault)=0 base units. Do not imply other token holders or other Agreements have zero without specific scope; these are exact reported balances at TX3 block.
Source cross-check directly reviewed on current unihack-final: ReserveVault.sol acceptTermination lines319–329, claimRefund lines356–365, getBalances lines386–405. Asset accounting consistent (deposited1003 = gymWithdrawn100 + buyerRefunded903). Original Owner distinct exact ONE_TX_GO for TX1/TX2/TX3 recorded on issue #27 respectively; Owner signed, no assistant/worker signing.
Evidence provenance: USER_PROVIDED_WSL_RAW_FUJI_RPC_OUTPUT + WALLET2_REVIEW. CTO did NOT independently re-query live Fuji RPC or inspect original raw proof bytes, and Explorer TX page could not be accessed through this review tool. Prior Owner explorer screenshot visual check supports TX3, not substituted for raw receipt analysis. Formal CTO acceptance is of TESTNET PROTOCOL DEMO happy path, NOT formal production contract security audit, regulatory/legal VNĐ custody, actual provider consent, validated financial viability, pilot, real insurance, or PMF.
DECISION: D18-06_REFUND_HAPPY_PATH=ACCEPTED_WITH_PROVENANCE_LIMITS; WALLET2_D18-06_CHAIN_LANE=CLOSED; NO RETRY TX1/TX2/TX3 and NO additional chain write expected for this lane. D18-04 PT earned path and D18-05 TIME_ACCESS payout path remain separate previously accepted. Update Worker4 demo chronology: any pre-TX3 screenshot showing PT #1 refundable903 or green claimRefund CTA is HISTORICAL; current post-TX3 pinned getter should show zero refundable, Buyer already received 903. No browser write buttons during demo; no invented public deployment. Local demo/recorded backup and Owner submission receipt still unverified, internal release target 2026-11-21 15:00 ICT.


[2026-11-21 ICT] TASK=D19-07-MOBILE-EIGHT-ROUTE STATUS=BOUNDED_VISUAL_PASS_PER_OWNER_IMAGES_WORKER4_REVIEW
Worker4 final proof handoff https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7054232445 after successive Customer, Gym, Operations reports. Owner supplied 36 original screenshots of Chrome Responsive 390x844 across exactly 8 known routes: Customer /customer/passes/{1,2}, Gym /gym/agreements/{1,2}, Operations /operations/agreements/{1,2} and /operations/disputes/{1,2}?claimId=1. Worker4 visually inspected originals and created archive openreserve_d19_07_mobile_all_8routes_36screens_evidence.zip (4,660,107 bytes) with SHA256 19272fe9c3257e88947d673ce973e6bbbe72a2bcaffe067008dd756be41c8ba0, plus manifest; archive only in Owner/Worker4 chat, NOT attached GitHub, CTO did NOT independently inspect image bytes or recompute SHA256. Mobile emulator, NOT physical phone. Latest Operations PT screenshots at pinned Fuji blocks61402146/61402179 show Resolver account matched READ_ONLY; post-refund PT Agreement#1 deposited1003, earned100, withdrawn100, refundAuthorized903, buyerRefunded903, refundable0 and locked0; claim#1 FINALIZED amount100 to Gym, resolver write disabled; Indexer DOWN HTTP500 honestly disclosed. Operations TIME#2 and Customer/Gym previous screenshots at different blocks; no same-block cross-role proof. No screenshot-proven P0/P1 rendering loss, but no DOM scrollWidth measurement, hard-refresh/permitted EIP1193 negative tests or full presentation rehearsal.
CTO DECISION=ACCEPT_D19_07_MOBILE_VISUAL_8_OF_8_WITH_LIMITATIONS; NOT equivalent to D19_07_FULL_E2E, external device compatibility, wallet-control negative QA, multi-service readiness, or all-originals independently audited. D20_DESKTOP_8_OF_8 previously bounded accepted. D19_06_NEGATIVE_WALLET_CHAIN=NOT_VERIFIED; D20_LOCAL_FULL_REHEARSAL=NOT_VERIFIED; D20_SUBMISSION_RECEIPT=NOT_VERIFIED.

[2026-11-21 ICT] TASK=D20-THREE-WORKER-COORDINATION STATUS=CTO_GO
Owner authorizes onboarding of two additional ChatGPT lanes for 15:00 ICT 2026-11-21 internal release goal: Worker 4 remains sole Codex Implementation/Integration code owner, Worker 5 is independent read-only UI/UX Release QA reviewer, Worker 6 is docs-only Demo/Pitch/Release Evidence writer. Formal scoped handoff issues: W5 https://github.com/remjphong/Open-Reserve/issues/35, W6 https://github.com/remjphong/Open-Reserve/issues/36. Root synchronization remains Issue #27, CTO 2 has final GO/FIX/HOLD authority; Worker5/W6 must NOT patch source/create PR/merge, use wallet write methods, deploy publicly or invent evidence. No new role expands current smart-contract/WALLET2 lane; D18-06 closed per Owner Fuji RPC + Wallet2 review, no further tx. Worker 4 can modify code only after separate CTO GO for evidenced P0/P1 and must provide exact-head PR CI for controlled merge.
No duplicate route screenshot collection: 8/8 desktop and 8/8 mobile visual already documented with provenance constraints. Worker5 exclusively prioritizes missing negative wallet/chain/EIP1193 tests, stale snapshots and responsive overflow with actual evidence; Worker6 exclusively produces timed pitch, local read-only demo guide, recorded fallback and truthful release proof/Owner form checklist. Worker4 owns stable Owner local Vite integration, genuine full rehearsal/fix and source/build evidence. If unavailable evidence mark NOT_RUN, not PASS. Operations P2 manual reconnect acceptable for demo, do not weaken fail-closed. Customer CTA can use wallet.writeContract; no interactive write actions in read-only demo. Zero public URL per Owner mentor-report waiver, one React SPA 3 routes, 3 independent Fastify services demonstrated in CI, local API readiness not proven. All 903/900/100/1003 values mock 18-decimal ERC20 BASE UNITS, not VND.
The 15:00 ICT release milestone is INTERNAL; no claim of extension to any separate UniHack organizer submission deadline. Final release decision based on authentic owner-machine rehearsal, evidence archive, honest P0/P1/NOT_RUN classifications and Owner submission receipt if required, not on passage of time or fake URL.


[2026-11-21 ICT] TASK=D20-W5-W6-REVIEW STATUS=CTO_ACCEPTED_WITH_LIMITATIONS
W5 source/QA review https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7054416424; CTO decision https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7054488921. W5 directly reviewed source at unihack-final HEAD 3927d01ed2e5f762d6374da258fbcad5e49ff377, no independent runtime Owner Chrome/Core/WSL/Fuji or original screenshot ZIP access. Q00–Q15 QA memo accepted; no reproduced P0. Wrong account/network, Core permission rejection, disconnect/reconnect, pending async stale identity and 390px real DOM overflow NOT_RUN. Full release QA HOLD.
CTO re-opened direct source Customer.tsx, customer-pt-proof.ts, shared-ledger.ts, Gym.tsx, customer-chain.ts. CustomerFinancialLedger displays money even if classifyPtBalances.valid=false with LEDGER_MISMATCH warning, and outer Customer balance panel also renders; claim CTA disabled on mismatch. Gym Ledger hides money when its validation fails. SOURCE_LEVEL_FAIL_CLOSED_DISPLAY_GAP CONFIRMED, ACTUAL_FUJI_LEDGER_MISMATCH NOT_OBSERVED. No speculative patch/PR before isolated deterministic proof or reproduced demo P0/P1 and explicit CTO GO; preserve Owner localhost demo process. Source-level buyer write CTA can really invoke wallet.writeContract, so prohibit all demo signing. W5 wrong Gym account test expectations corrected: public Vault data may remain readable by read-only nonmerchant viewer; deny write capability and label actual role, do not falsely require blank money solely from nonmerchant account. W5_QA_REPORT ACCEPTED_WITH_LIMITATIONS; LOCAL_READ_ONLY_DEMO GO_CONDITIONAL_ON_OWNER_REHEARSAL.
W6 docs handoff https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7054404022; CTO decision https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7054489651. Six required parts delivered: 3m40s Vietnamese read-only live demo, ~3min pitch, 75–85sec backup narration/storyboard, 8-route Owner runbook, evidence provenance manifest, release/submission checklist. W6 content ACCEPTED_WITH_TWO_EDITORIAL_FIXES: judged timed demo prioritize six core screen visits plus two optional Operations agreement screens to allow manual Resolver read-only connect; describe three Fastify services tested as independent in accepted Compose CI but DO NOT claim all running on Owner localhost without fresh PID/health/readiness evidence. Backup video script is NOT an actual exported playable video. The economic -420,000 VND provider-contribution example is explicitly MINH_HOA hypothetical research, not data from real gym or proof of profit neutrality. Other risks: no validated pilot/VND legal custody/insurance/PMF.
Worker4 acknowledged both W5/W6 at https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7054439186 and requested fresh Owner read-only WSL local :5175 PID/CWD/sourceSHA/network and eight HTTP deep-link checks, plus 3001/3002/3003 service process status; as of review actual full Owner rehearsal and backup video not proven. W4 sole Codex code owner only after CTO P0/P1 GO; W5 read-only reviewer, W6 documentation-only. No smart contract new writes, D18-06 wallet lane CLOSED. Desktop 8/8 and Chrome Responsive390x844 mobile8/8 bounded visual Owner/W4 reviewed, not full E2E/physical device/same-block. Local demo requires live Fuji Internet; Indexer/Catalog degraded where reported. Public HTTPS waived per OWNER_REPORTED_MENTOR_CONFIRMATION, no public URL.
Internal Owner release target 2026-11-21 15:00 ICT; official organizer cutoff not independently verified extended. Real demo readiness gate: Owner fresh process check, role-correct fully read-only 6–8 route rehearsal after TX3, post-TX3 Buyer refundable0, no write buttons clicked, honest degraded services, usable real fallback artifact or explicitly historical screenshots, QA limitations, actual submission receipt if needed. No false released or submitted claim.


[2026-11-21 ICT] TASK=D20-W4-PREFLIGHT-W6-EDIT-W4-LAYOUT STATUS=CTO_SCOPED_DECISIONS
Worker4 Owner raw WSL preflight source https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7054505726 at 2026-11-21 07:48:42 ICT: Vite localhost127.0.0.1:5175 PID1024 CWD /home/phong/openreserve-d19-06-postmerge/apps/web, clean checkout HEAD460eec44fa208184a4737048db9071b7673de3f3, VITE_VAULT_CHAIN_ID43113, Vault0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad, merchant0xA337FCeC5f9508C3Ab5E10aE571610E167548878, deployment block61240386. All eight direct route curl HTTP200 (Vite SPA transport ONLY). Local backend ports3001 Catalog/3002 Indexer/3003 Economics NO LISTENER and /health HTTP000, NOT HTTP500 from backends and NOT successful local 3-service E2E. Frontend was source equivalent to integrated apps/web accepted source, but backend local patch Zod presence NOT demonstrated. Owner WSL output reviewed by Worker4, CTO DID NOT independently access Owner machine. Full role-correct Chrome read-only rehearsal still NOT_VERIFIED, actual playable video NOT_VERIFIED, submission receipt NOT_VERIFIED. Local frontend readiness PASS_WITH_BACKEND_LIMITATIONS, product release still HOLD.
Worker6 editorial revision https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7054529681: finished one-page six-main-screen read-only judged 3:40 cue sheet, clarified 3 Fastify services independently runnable in accepted Compose CI but not active on current Owner localhost, 3:40 speaking time target not runtime tested, fallback voiceover/script not an actual video. CTO formal docs acceptance https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7054794257: W6_EDITORIAL_CORRECTIONS=ACCEPTED, W6_DOCS_LANE=CLOSED. No source changes, no real video/rehearsal/submission claim.
Worker5 Issue #35 had no new independent browser/negative QA evidence after original accepted report. CTO follow-up https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7054794775: W5 report accepted limited, full negative QA HOLD, source Customer ledger mismatch display gap remains source-confirmed but runtime mismatch NOT_OBSERVED. Wrong wallet/chain/reject/disconnect/stale async, DOM390 scrollWidth NOT_RUN; W5 independent patch review only after actual W4 PR, no W5 source writes. Worker6 forwarded safety brief to W5; this does not add QA PASS.
Worker4 Owner screenshot PT customer layout report https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7054687392 and isolated off-repo diff candidate https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7054748011. CTO directly reopened apps/web/src/portals/Customer.tsx (session Card, taller ledger Card, then conditional PtProofPanel in 2-col grid) and style.css, confirms plausible grid-row visual gap. Owner visually reported urgent P1 demo problem, Worker4 privately reviewed 3 Owner screenshots, CTO DID NOT inspect original pixels or patch bytes. Off-repo patch SHA256 bd68f922f5c2ec09cf1e8046e2a06b5fbcfd1895757314a8dcf70f1f5369e9b1 size5459 bytes, NOT code accepted; synthetic fixture git apply check, structural 2/2, CSS-only mock Chromium5/5 are preliminary and NOT actual checkout, build, React browser or CI proof.
CTO separate directive https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7054790283: GO_D20_CUSTOMER_PT_LAYOUT_P1_IMPLEMENTATION_SCOPED for isolated branch and one reviewable PR only, MAX THREE paths apps/web/src/portals/Customer.tsx, apps/web/src/style.css, apps/web/test/customer-pt-responsive-layout.test.mjs. Fix ONLY desktop receipt/proof gap by independent columns and mobile ordering entitlement→ledger→proof, no changed fintech amounts, wallet signing, ABI/contract, global grid, other portal/services, no W5 ledger mismatch guard mixed. Must verify real isolated checkout current HEAD, actual patch SHA and git apply check, typecheck/build tests, actual React Chrome screenshots PT1/TIME2 desktop1440/mobile390 and route smoke, exact-HEAD CI. MERGE=HOLD pending CTO review; DO NOT TOUCH Owner live QA PID1024/port5175 or deploy without separate permission. If impacts actual Owner rehearsal, keep stable known demo and HOLD PR. No open PR at CTO review checkpoint.
Release remains internal target 2026-11-21 15:00 ICT; official UniHack external deadline not independently extended. Blockchain D18-04/05/06 testnet flows accepted per Owner RPC+wallet reviewer provenance, wallet lane closed, no additional TX or signature. Mobile/desktop8/8 bounded visual Owner/Worker4 accepted not full E2E; local process proof newly bounded PASS, local backends down, Owner live full rehearsal and backup video still NOT_VERIFIED. Public deployment waived per Owner mentor report, public URL NOT_DEPLOYED. Production readiness not accepted.


[2026-11-21 ICT] TASK=D20-PR37-SOURCE-CI-QA STATUS=CTO_PREMERGE_PASS_WITH_LIMITS
CTO source/CI review recorded on PR#37 https://github.com/remjphong/Open-Reserve/pull/37#issuecomment-7055137510; Worker5 independent reviewer requested https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7055138292. D20 Owner urgent Customer PT proof layout P1 authorized separately on Issue #27 comment 7054790283. Worker4 created draft PR#37 https://github.com/remjphong/Open-Reserve/pull/37; base unihack-final HEAD426ed3be0f40933ef30683c9f93b1a75c930ee75, head d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780 one commit, mergeable true, open draft unmerged. CTO directly fetched complete PR diff and file list: exactly apps/web/src/portals/Customer.tsx, apps/web/src/style.css, NEW apps/web/test/customer-pt-responsive-layout.test.mjs, 63 additions/4 deletions. JSX nested session+conditional PT proof in left column and Vault financial in separate right column; at mobile <=820 flex/display:contents orders entitlement->finance->proof; global grid, wallet signing/CTA, money getters, SDK, ABI, services, Gym, Operations and checkout source untouched. SOURCE_SCOPED_REVIEW PASS. New two regression tests are structural source/CSS assertions, not full browser E2E.
CTO checked actual PR exact-head Actions run44848508341: workflow Scaffold completed SUCCESS; jobs contracts/workspaces/compose 3/3 SUCCESS; workspaces includes npm ci, typecheck, build, existing tests, isolation; new responsive test file is NOT explicitly run as standalone CI step. Worker4 reports Owner actual isolated WSL checkout /home/phong/openreserve-d20-pt-layout-qa clean at exact head, npm ci zero vulnerabilities, typecheck/build PASS, customer PT journey 6/6 and responsive layout new 2/2 PASS; provenance OWNER_TERMINAL_RECEIVED_WORKER4_REVIEW, not CTO independent WSL. Prior SDK dist missing due test-before-build sequencing resolved by root typecheck prebuild, not code defect.
Worker4 reports Owner 7 actual Chrome screenshot PNGs from separate QA port localhost:5176, Worker4 visually reviewed and hashed originals still in Worker4 chat NOT GitHub-attached/independently inspected CTO. Desktop PT#1 proof now ~16px below left entitlement independent of tall right ledger; Chrome Responsive mobile390 PT#1 order entitlement->financial->proof; TIME#2 desktop/mobile no erroneous PT proof. Fuij43113 UI screenshot PT post-TX3 shows BuyerRefunded903, refundable0; TIME#2 gym earnings/withdrawn900, all mock MRES ERC20 base units NOT VND. Screenshot-derived values only browser display, no independent fresh CTO Fuji RPC. Worker4 Owner DOM read-only DevTools at 390 viewport reports document.clientWidth390 and scrollWidth390, horizontalOverflow false at specific route/instant, no guarantee every viewport or child scrollbox. Owner visual report source Issue #27 comment 7055040103 and DOM proof 7055109791. Browser evidence PASS_WITH_LIMITATIONS; no verified new actual checkout/Gym/Operations Chrome regression or independent original screenshot bytes. PRE-MERGE CI+source PASS, real browser bounded PASS.
Release governance: MERGE=HOLD until Worker5 independently reviews exact PR#37 source/diff, returns verdict GO_WITH_LIMITS or FIX/HOLD and CTO separately grants controlled merge. W5 separate Customer LEDGER_MISMATCH financial fail-closed display issue preexists and not in this patch; Owner Fuji mismatch not observed. Do not merge now, do not restart or change Owner live approved QA localhost:5175 PID1024; only isolated port5176 for PR QA. No new wallet contracts, chain transaction, public hosting or backend deployment. Owner local 3001/3002/3003 last recorded no listeners HTTP000, real 6-screen role-switched browser full rehearsal/video and external submission receipt remain NOT_VERIFIED; internal target 15:00 ICT Nov21.


[2026-11-21 ICT] TASK=D20-PR37-CONTROLLED-MERGE STATUS=ACCEPTED
Independent Worker5 review https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7055181219 at exact immutable PR#37 head d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780: PASS_WITH_LIMITATIONS; NO_NEW_P0_P1_REGRESSION_FOUND_IN_DIFF. Worker5 directly reviewed all 3-file patch, source and exact-head CI. Source-level new P2 accessibility note: mobile CSS visual order entitlement->financial ledger->PT proof differs from DOM/keyboard/screen-reader traversal entitlement->PT proof->financial ledger; assistive technology runtime NOT_RUN. This P2 is documented and not silently called accessibility PASS; separate future scoped correction only if prioritized. Preexisting Customer LEDGER_MISMATCH fail-closed display gap persists, NOT fixed by this layout-only patch and live Fuji mismatch NOT_OBSERVED.
CTO reviewed source, exact 3 changed paths, and GitHub Actions Scaffold run44848508341 exact-head contracts/workspaces/compose jobs 3/3 SUCCESS. Worker4 reported Owner isolated WSL clean worktree typecheck/build and Customer 6/6 + responsive 2/2 PASS (OWNER_TERMINAL + WORKER4_REVIEW; new responsive tests not explicitly named in CI steps). Worker4 directly inspected Owner seven isolated localhost5176 real Chrome PNGs and reported PT desktop receipt 16px below left entitlement, mobile390 visual entitlement->ledger->PT proof and TIME#2 no PT proof; original PNG bytes NOT attached GitHub and NOT independently inspected CTO/Worker5. Owner Chrome DevTools DOM test reported PT390 clientWidth390=scrollWidth390 at one viewport/time, not comprehensive accessibility or browser cross-role QA.
Formal CTO exact-head controlled merge authorization: https://github.com/remjphong/Open-Reserve/pull/37#issuecomment-7055209699. CTO transitioned draft PR#37 to Ready For Review, then merged using GitHub merge method merge and expected_head_sha guard d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780. GitHub merge result merged=true, SHA 33c8591e4cb85e4903fd25d56cf98700e6332b5a, independently rechecked PR state closed merged=true and unihack-final HEAD exactly same SHA immediately after merge. Compare old integration 5bb1e3692f45ccce95e63dfd06ff27e3eb9c6a66 vs merge integration showed only three approved app paths apps/web/src/portals/Customer.tsx, apps/web/src/style.css, and added apps/web/test/customer-pt-responsive-layout.test.mjs; no ABI, wallet writes, backend, lockfile or global CSS grid changes. This State Log entry is append-only and subsequently advances integration HEAD by docs-only commit.
Decision PR37_SOURCE_INTEGRATION=ACCEPTED_MERGED. Owner local browser/runtime rollout remains HOLD: previously Owner WSL reported standalone Vite at 127.0.0.1:5175 PID1024 from QA SHA460eec44fa208184a4737048db9071b7673de3f3; GitHub merge DOES NOT patch or restart that process. Do NOT pull into or restart live demo checkout/port5175, public deploy, change contracts or sign/broadcast Fuji without independent explicit Owner/CTO appropriate authorization. Isolated localhost5176 used for proof only. Worker4 to coordinate safe Owner read-only 6-screen Core Buyer/Merchant/Resolver rehearsal with pinned Fuji43113 post-TX3 state; capture real playable backup or clearly labeled historical screenshot fallback. At last Owner read-only preflight local service ports 3001/3002/3003 had NO LISTENER / health HTTP000; Compose CI PASS does not mean local services are active. Negative wallet/chain/rejection/disconnect QA, full local role-switched rehearsal, video export and official organizer submission receipt remain NOT_VERIFIED; FULL_RELEASE_QA and D20_PRODUCT_RELEASE still HOLD pending actual evidence. Internal release target 2026-11-21 15:00 ICT is not an independently confirmed extension of official external UniHack cutoff.


[2026-11-21 ICT] TASK=D20-LOCAL-5175-CONTROLLED-ROLLOUT STATUS=CTO_CONDITIONAL_GO
Worker4 Owner request source https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055418659 and live PID/worktree read-only preflight https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055433088. Owner reported :5175 OLD Customer PT layout on WSL frontend PID1024 CWD /home/phong/openreserve-d19-06-postmerge/apps/web SHA460eec44fa208184a4737048db9071b7673de3f3, and separate :5176 new fixed layout PID3242 CWD /home/phong/openreserve-d20-pt-layout-qa/apps/web SHA d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780, both returning customer PT HTTP200. Worker4 and Owner confirmed no process changed yet; CTO did not independently inspect Owner machine.
CTO directly checked GitHub unihack-final at exact 26bdcc45715830553b78e3fb6fc3707c9a8bd8da, PR37 merged true merge SHA33c8591e4cb85e4903fd25d56cf98700e6332b5a; compare exact PR37 QA candidate d1f865b9cf15ac6343cb4c285ab5e3cf6c9bd780..current integration differs ONLY root append-only State Log, no web/services/contract. Hence target exact integration SHA26bdcc45715830553b78e3fb6fc3707c9a8bd8da approved for isolated release staging. This approval note itself appends docs-only State Log and will move remote integration SHA; do not reinterpret staged candidate as silently changed without checking source equivalence again.
Formal CTO directive https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7055448103: GO_LOCAL_5175_CONTROLLED_ROLLOUT_CONDITIONAL. GO first for isolated NEW worktree pinned to SHA26bdcc..., npm ci/typecheck/build, Customer6+responsive2 tests, clean worktree, brand-new free staging port e.g. 5177 (not existing :5176), exact PID/CWD/SHA/environment checks and real Chrome desktop/mobile Buyer PT/TIME + Gym/Ops render/source/role smoke with strictly read-only Vault Fuji43113. Existing :5175 PID1024 and :5176 PID3242 not touched during staging. Stage PASS must include rollback method for old 5175 server and note services ports3001,3002,3003 previously no listeners / health HTTP000, not local full backend integration. No new wallet writes or public deployment.
Cutover from old 5175 remains gated on actual Owner explicit GO_CUTOVER_NOW after Worker4 presents successful staged checks + rollback. Immediately before any process action reverify exact verified old PID, CWD/launch identity and ownership. Only exact process targeted graceful SIGTERM, never generic pkill/killall or other Vite/dev/backend processes; start proven release worktree with identical non-secret Fuji VITE public config and strictPort on5175. Post-switch verify new listener PID/CWD/source, actual browser PT proof gap fixed, post-TX3 Buyer refundable0/buyerRefunded903 mock base units, TIME gym earned/withdrawn900, role-correct Buyer/Merchant/Resolver, honest Indexer/Catalog degradation. Any startup/render/financial/role blocker -> stop only verified NEW process, rollback old known checkout and report HOLD. Worker4 must not claim cutover PASS until real Owner results; CTO has not executed stop/start.
Status STAGING=GO_NOT_YET_RUN, CUTOVER=CONDITIONAL_OWNER_FINAL_GO_NOT_YET_GIVEN, LOCAL_5175_ROLLOUT=HOLD_UNTIL_REAL_CUTOVER_EVIDENCE, FULL_6_SCREEN_REHEARSAL=NOT_VERIFIED, BACKUP_VIDEO_PLAYABLE=NOT_VERIFIED, OFFICIAL_SUBMISSION_RECEIPT=NOT_VERIFIED, FULL_RELEASE=HOLD. This is source/frontend deployment decision only, not authorization for Fuji transaction, wallet signing, real VND custody, third party deployment or organizer deadline extension. Internal Owner goal 15:00 ICT Nov21 2026.


[2026-11-21 ICT] TASK=D20-LOCAL-CUTOVER-SIX-SCREEN STATUS=CTO_BOUNDED_ACCEPTANCE
Worker4 Owner actual staging report Issue#27 7055521447: separate release checkout SHA26bdcc45715830553b78e3fb6fc3707c9a8bd8da Vite :5177 PID4000, 8/8 URL HTTP200, npm ci/typecheck/build Customer6+responsive2 tests PASS per Owner WSL terminal reviewed Worker4; transport only, no full browser/rpc at staging check. Existing :5175 PID1024 and :5176 PID3242 unchanged then.
Owner explicitly approved GO_CUTOVER_NOW in Worker4 chat after prior CTO conditional authorization Issue#27 7055448103. Worker4 report Issue#27 7055627425: Owner guarded WSL script verified old :5175 PID1024 SHA460eec44fa208184a4737048db9071b7673de3f3 and exact CWD before targeted SIGTERM; started new :5175 PID4180 from /home/phong/openreserve-d20-local-release/apps/web SHA26bdcc45715830553b78e3fb6fc3707c9a8bd8da, same Fuji43113 Vault public env, 6 judged direct URLs HTTP200; :5176 PID3242 and :5177 PID4000 intact, rollback not triggered. Owner new Chrome screenshot :5175 Customer PT desktop now displays PtProofPanel beneath left entitlement next to financial Vault card, at reported Fuji block61405001; original screenshot bytes reviewed Worker4 only, not CTO independently. Decision D20_LOCAL_5175_CUTOVER=ACCEPTED_WITH_OWNER_WSL_WORKER4_REVIEW_LIMITS. HTTP200 is only transport; screenshot shows bounded real React UI visible.
Worker4 6-screen report Issue#27 7055700455,7055749176,7055773950: Buyer PT#1/TIME#2 bounded Owner screenshot evidence, Merchant PT#1 three original Owner Chrome screenshots at block61405008 correct Merchant address chain43113, PT deposited1003 earned/withdrawn100 Buyer refund903 refundable0 VAULT_LEDGER_CONSISTENT; Merchant TIME#2 Owner COPIED visible page text block61405008 deposited/earned/withdrawn900; Resolver PT Claim#1 Owner COPIED visible page text block61405349 correct Resolver account/READ_ONLY, FINALIZED gym100 buyer0, PT refund903 and ledger conservation; Resolver TIME Claim#1 copied UI text block61405352 finalized gym900 buyer0, TIME earnings900 and consistency. Every amount mock MRES ERC20 18-decimal BASE UNITS NOT VND or whole MRES. Screen evidence mix screenshot and Owner-copied UI text, CTO did not independently inspect raw PNG or Fuji RPC, blocks DIFFER across roles, no same-block proof. D20_SIX_JUDGED_SCREEN_CONTENT=ACCEPTED_WITH_LIMITATIONS, not continuous timed end-to-end rehearsal.
Indexer DOWN/HTTP500 on proxy UI, Catalog evidence result unverified; previous Owner localhost backend ports3001 Catalog/3002 Indexer/3003 Economics NO LISTENER, /health HTTP000, no claim local microservices running. CI Compose independence passes only at CI. Merchant CURRENT_PT_STATE_DIFFERS_FROM_REPORTED_SNAPSHOT is older Wallet record difference, not VAULT_LEDGER_MISMATCH. Buyer source-level invalid ledger display issue remains but actual Fuji mismatch not seen. Wrong wallet/chain/reconnect/4001 negative tests, real physical mobile, timed continuous role-switched rehearsal, playable backup video, Owner official submission receipt are NOT_VERIFIED. No new TX/signature/custody/public hosted deployment.
CTO decision posted Issue#27 7055805314: GO_D20_FINAL_TIMED_READ_ONLY_OWNER_REHEARSAL_AND_RELEASE_PACKET. Worker4 to coordinate ONE actual time-measured continuous six-screen Buyer→Merchant→Resolver browser read-only demo on new :5175, record exact accounts/Fuji pinned blocks and errors; use only safe wallet connection/refresh, never claim/approve/withdraw/write. Capture genuine timing/screenshots; produce playable video only if actually exported and playback tested, otherwise dated historical screenshot fallback labeled honestly. Owner alone authorizes actual submission. D20_FINAL_RELEASE=HOLD until actual rehearsal and submission evidence/Owner GO; internal 15:00 ICT Nov21 deadline not assumed external UniHack deadline extension.

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
