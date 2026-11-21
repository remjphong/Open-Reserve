# OpenReserve — Tầm nhìn đa ngành & lộ trình mở rộng
## Cross-industry vision and evidence-gated scaling roadmap

**Ngày tổng hợp:** 21/11/2026 (UTC+7)  
**Loại tài liệu:** D21 research synthesis / product strategy — **KHÔNG phải chức năng đã triển khai, kế hoạch tài trợ đã ký hoặc cam kết thương mại.**  
**Mức độ kiểm chứng:** Dựa vào source/CI, các báo cáo Owner/Wallet reviewer, khảo sát nhỏ và nguồn công khai được gắn nhãn dưới đây. Round A bốn bên đã hoàn thành; CTO, Worker 5 và Worker 6 có báo cáo Round B. Worker 4 tạm dừng trước báo cáo Round B; **không có đồng thuận đầy đủ bốn vòng B, không có nghiên cứu định lượng đại diện**.

**Đọc cùng:** [README](../README.md) · [Judge review guide](JUDGE_REVIEW_GUIDE.md) · [Evidence index](../proofs/RELEASE_EVIDENCE_INDEX.md) · [Vault source](../contracts/src/ReserveVault.sol) · [CTO D21 Round B](https://github.com/remjphong/Open-Reserve/issues/40#issuecomment-7057230725).

---

## 1. Tuyên bố giá trị và ranh giới sự thật

**Tầm nhìn [GIẢ THUYẾT CHIẾN LƯỢC]:** OpenReserve hướng đến một **lớp ghi nhận quyền lợi và quyết toán có điều kiện cho dịch vụ trả trước** (*conditional settlement of prepaid-service obligations*), nơi giá trị đã kiếm được, đang bị giữ, được phép nhận lại và đã chuyển đi có thể được các bên đối chiếu theo quy tắc công khai. Gym chỉ là **ngành dùng để thử nghiệm prototype ban đầu**.

**Năng lực hiện tại [SOURCE_VERIFIED / OWNER_REVIEWED]:** Prototype trên **Avalanche Fuji, chain 43113**, gồm một ứng dụng React/TypeScript có ba portal Customer/Gym/Operations, một hợp đồng ReserveVault, mock ERC-20 MRES và ba dịch vụ Fastify độc lập (Catalog & Evidence, Chain Indexer, Economics). Hai chính sách hợp đồng thực sự có là **PER_SESSION / PT10** (10 suất) và **TIME_ACCESS** (điều kiện theo thời gian trôi qua). Luồng PT Buyer–Merchant hợp tác đã hoàn tất quyết toán và hoàn mock token theo bằng chứng Owner/Wallet reviewer; TIME_ACCESS đã có luồng phân bổ theo thời gian. [Source](../contracts/src/ReserveVault.sol) · [CI](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341) · [Fuji evidence](../proofs/RELEASE_EVIDENCE_INDEX.md).

**Điều KHÔNG được diễn giải từ prototype:** không có sẵn lưu ký VNĐ, bảo hiểm, giấy phép tài chính, sản phẩm thương mại, các gym ký hợp tác, doanh thu, bảo đảm không giảm lợi nhuận doanh nghiệp, nghĩa vụ hoàn tự động khi khách bỏ tập, hoặc xác minh độc lập rằng buổi tập/cơ sở ngoài đời hoạt động đúng. Các số 1003/100/903/900 trên demo là **integer base units của mock MRES 18 decimals**, không phải MRES nguyên token hoặc VNĐ.

> **English summary:** OpenReserve explores an auditable, rule-based settlement layer for prepaid services. The implemented Avalanche Fuji prototype supports a ten-session allocation policy and an elapsed-time access policy for a gym proof of concept. A narrow cooperative merchant-approved refund and time-based settlements have Owner/Wallet-reviewed testnet evidence. Extending to boutique classes, wellness or education is a **research roadmap, not shipped functionality or validated commercial demand**. Evidence of actual offline service delivery, silent-merchant remedies, merchant liquidity, Vietnamese legal custody, and independent security assurance remains incomplete.

### Phân loại mọi claim trong tài liệu

| Nhãn | Ý nghĩa được phép sử dụng |
| --- | --- |
| **SOURCE_VERIFIED** | Đọc được từ mã nguồn/đặc tả thực có trên GitHub; không đồng nghĩa chức năng đã chạy ngoài đời |
| **CI_VERIFIED** | Job/commit GitHub Actions có kết quả kiểm tra; không tự suy diễn toàn bộ E2E hay bảo mật |
| **OWNER_REPORTED / WALLET_REVIEWED** | Bằng chứng RPC/trình duyệt do Owner cung cấp và đã được reviewer xem trong phạm vi được công bố |
| **EXTERNAL_FIRST_PARTY** | Chính nhà cung cấp mô tả gói sản phẩm/chính sách; chỉ xác nhận **sự tồn tại và điều khoản họ công bố** |
| **PRESS_CASE** | Báo chí mô tả một sự cố cụ thể; **không phải** tỷ lệ tổn thất toàn ngành, TAM hoặc khả năng mua giải pháp |
| **MINH_HỌA** | Phép tính trên giả định, không phải số liệu doanh nghiệp thực tế |
| **GIẢ THUYẾT / NOT_VERIFIED** | Ý tưởng cần thử nghiệm / chưa có bằng chứng để tuyên bố khả thi |

## 2. Cơ chế thị trường: tại sao vấn đề có thật nhưng giải pháp vẫn khó

Một số loại dịch vụ có đặc điểm chung: **khách trả trước, doanh nghiệp cần vốn vận hành ngay, nhưng quyền lợi được cung cấp nhiều lần hoặc theo thời gian**. Khi cơ sở ngừng hoạt động hoặc hợp đồng bị chấm dứt, bên mua cần biết quyền lợi nào đã phát sinh và phần nào **theo điều khoản hợp lệ** được hoàn; bên bán cần được công nhận chi phí, công suất giữ chỗ và phần dịch vụ thật sự đủ điều kiện ghi nhận.

- **PRESS_CASE — gym:** Tuổi Trẻ (16/11/2026) đưa tin California Fitness đóng thêm cơ sở, gây bất định cho hội viên đã trả trước. Đây là **một sự kiện được ghi nhận**, không phải ước lượng xác suất mọi gym đóng cửa. [Nguồn](https://news.tuoitre.vn/california-fitness-closes-another-gym-in-vietnam-deepening-members-uncertainty-103261116085150896.htm).
- **PRESS_CASE — giáo dục:** VnExpress (2024) dẫn số liệu cơ quan giáo dục về gần **94 tỷ VNĐ** nghĩa vụ hoàn học phí Apax tại TP.HCM, **4.400 yêu cầu hoàn**. Cho thấy mức độ nghiêm trọng có thể lớn nhưng không chứng minh hợp đồng PT10 phù hợp lớp học hoặc OpenReserve có thị trường có thể thu phí. [Nguồn](https://e.vnexpress.net/news/news/education/language-school-apax-leaders-owes-hcmc-students-3-8m-in-tuition-fees-4721743.html).
- **OWNER_REPORTED — khảo sát:** 21 phản hồi người dùng; 14 từng mua trả trước; 8/14 tự báo cáo mất giá trị chưa sử dụng. **Mẫu thuận tiện và có lỗi skip logic**, không đại diện dân số, không tự chứng minh quyền hoàn tiền. Ba phản hồi vai trò nhà cung cấp **không được xác nhận là ba doanh nghiệp riêng**, đều coi dòng tiền trả trước là lợi ích; 2/3 ưu tiên nhận đủ ngay trong ví dụ khảo sát. [Tổng hợp & hạn chế](../research/primary-surveys.md).

**Nguyên tắc cốt lõi:** *Khách vắng mặt ≠ bên cung cấp không thực hiện nghĩa vụ ≠ tự động đủ điều kiện hoàn tiền.* Điều khoản hủy muộn, giữ chỗ, hết hạn và tình trạng đóng cửa phải được giải quyết riêng. Ví dụ ClassPass công bố chính sách thanh toán cho đối tác trong các trường hợp hủy muộn/no-show đủ điều kiện; đó là **bằng chứng tồn tại chi phí giữ công suất**, không phải chứng minh OpenReserve đã có chính sách này. [ClassPass first-party FAQ](https://classpass.com/partners/faqs).

## 3. Ba thị trường ưu tiên — không phải ba thị trường đã đạt product-market fit

| Ưu tiên nghiên cứu | Nguồn gốc sản phẩm trả trước | Phù hợp với source v1 | Khoảng trống phải giải quyết | Phán quyết |
| --- | --- | --- | --- | --- |
| **1. Gym PT10** — beachhead | Gói 10 buổi, phân bổ từng buổi; có báo cáo thực tế về khách chịu rủi ro khi cơ sở đóng | **CÓ** về số suất/giá trị và claim đã được các bên xác lập; mock Fuji có chứng cứ quyết toán **hợp tác** | Tiền doanh nghiệp bị giữ, attendance thật, điều khoản trả/không trả, nhà cung cấp im lặng, pháp lý VNĐ | **TECHNICAL PROTOTYPE ACCEPTED_WITH_LIMITS; BUSINESS PILOT HOLD** |
| **2. Boutique yoga/Pilates/lớp thể thao 10 buổi đồng giá** — kế cận cần phỏng vấn | Top Pilates có các gói 10 buổi thật, **nhưng từng SKU có điều khoản khác nhau** | **MỘT PHẦN:** số 10 suất tương tự PT10; **KHÔNG** có sẵn hết hạn/hủy trước giờ/no-show/giữ chỗ hoặc chuyển nhượng | Booking/điểm danh có chứng thực, cost of reserved capacity, quy tắc hủy, vòng đời quyền lợi, thử nghiệm willingness-to-pay | **DISCOVERY CANDIDATE ONLY; NO ROLLOUT GO** |
| **3. Spa/massage/wellness phi y tế — đúng 10 buổi dịch vụ đồng nhất** — thử nghiệm ngoài fitness | Fresha công bố gói dịch vụ mua trước, sử dụng dần | **CÓ ĐIỀU KIỆN** khi từng suất có cùng quyền lợi/giá trị; **KHÔNG** thể dùng v1 nguyên trạng cho combo dịch vụ + sản phẩm + ưu đãi | Xác minh hoàn tất buổi, chất lượng, hủy lịch, quyền riêng tư, chính sách kiện toàn gói hỗn hợp và tài chính bên bán | **LATER RESEARCH; MIXED-BUNDLE POLICY NOT BUILT** |

**Nguồn gốc chính sách boutique — tuyệt đối không trộn SKU:** [Top Pilates gói 10 buổi A](https://pilates.com.vn/goi-tap/goi-tap-lop-nhom-10-buoi-80.html) ghi **hạn hai tháng, hủy trước ít nhất hai giờ**; [Top Pilates danh mục gói khác](https://pilates.com.vn/packages) ghi **gói 10 buổi 45 ngày, hủy trước bốn giờ**. Đây là **hai chào bán riêng**, không phải một gói vừa 2 tháng vừa 4 giờ. Tại [ReserveVault.openAgreement](../contracts/src/ReserveVault.sol), policy PT yêu cầu **startAt=endAt=challengeWindow=0**, nên **không có thực thi trực tiếp** điều khoản hết hạn/hủy lịch này. **“10 buổi giống nhau” chỉ chứng minh tương đồng số đếm, không phải tương thích đầy đủ hợp đồng.**

**Nguồn gốc spa:** [Fresha Packages overview](https://www.fresha.com/help-center/knowledge-base/memberships-packages-and-gift-cards/100670-packages-overview) đưa ví dụ combo nhiều buổi massage + hai tuần sử dụng + vật phẩm + giảm giá. Đây là **bằng chứng của loại SKU phức tạp cần adapter và policy khác**, không phải chứng nhận OpenReserve hiện có thể quyết toán combo đó.

**Các ngành không chọn làm bước thương mại tiếp theo:** coworking có gói theo ngày/tháng nhưng nhu cầu bảo vệ độc lập chưa chứng minh; giáo dục/trung tâm ngoại ngữ có các trường hợp thiệt hại thật nhưng gồm tiến độ, lịch học, quyền người chưa thành niên, trách nhiệm hoàn học phí phức tạp — **cần chính sách mới**; dịch vụ có yếu tố y tế cần quy trình an toàn, luật và bảo vệ dữ liệu chuyên biệt — **để sau / HOLD**. Không gán TAM, CAGR, doanh thu, xác suất thành công hay điểm /100 chủ quan cho các lựa chọn này.

## 4. Độ sâu của sản phẩm hiện có — và hai lỗ hổng quyết định

| Trường hợp | SOURCE_VERIFIED trong v1 | KHÔNG được suy diễn |
| --- | --- | --- |
| **PER_SESSION PT10** | Số suất cố định 10; đề nghị/confirm/finalize theo quyền, chống lặp sessionId; phân bổ theo giá trị; refund khi đúng luồng quyền | Không có oracle xác minh buổi tập thật, booking capacity, chính sách no-show hay ngày hết hạn gói PT |
| **TIME_ACCESS** | Merchant đề xuất khoảng thời gian hợp lệ đã qua với nonzero evidenceHash; giá trị tính theo thời gian; hết challenge window, claim không bị phản đối có thể finalize | **Elapsed time không chứng minh gym thật sự mở cửa**; hash chỉ neo tuyên bố, không xác minh sự thật ngoài đời. Fuji **270 giây / 60 giây** là cấu hình demo, không phải gói thời gian thương mại |
| **Termination / refund** | Hai bên có thể đề nghị và chấp thuận hoặc chuyển sang tranh chấp; Buyer claim token đã được cho phép. Fuji PT đã demo trường hợp Merchant **hợp tác chấp thuận** | **Merchant mất liên lạc/không phản hồi:** proposal ở PROPOSED không tự hết hạn hay tự chuyển Resolver. Resolver chỉ giải quyết khi đã DISPUTED. V1 **không bảo đảm thu hồi tiền khi gym phá sản/im lặng** |
| **Indexer và bằng chứng** | Vault lưu token/quyền trạng thái; các backend và hash hỗ trợ kiểm tra | Hash không chứng minh chất lượng dịch vụ; Indexer full historical Fuji sync **NOT_VERIFIED**; local 3 backend **không có listener** tại lần đo Owner được ghi nhận, CI Compose không đồng nghĩa production/local ready |

**Đường dẫn kiểm tra lỗ hổng Merchant im lặng:** [Source lines 277–343](https://github.com/remjphong/Open-Reserve/blob/unihack-final/contracts/src/ReserveVault.sol#L277-L343). Buyer tạo đề nghị nhưng **đối phương** phải accept hoặc dispute; Resolver chỉ xử lý **DISPUTED**. Phân loại: **source-proven business/liveness limitation**, **KHÔNG** phải một exploit đã được thực nghiệm và **KHÔNG** loại trừ các quyền khởi kiện ngoài blockchain.

**Đường dẫn kiểm tra TIME_ACCESS:** [proposeTime lines 158–188](https://github.com/remjphong/Open-Reserve/blob/unihack-final/contracts/src/ReserveVault.sol#L158-L188) và [finalize lines 487–499](https://github.com/remjphong/Open-Reserve/blob/unihack-final/contracts/src/ReserveVault.sol#L487-L499). Quy tắc thời gian có thể đúng toán học khi cơ sở đóng cửa; cần cơ chế dữ liệu mở cửa, thông báo và khiếu nại độc lập trước khi đưa ra tuyên bố bảo vệ thực tế.

## 5. Điều kiện khả thi kinh tế: không được lấy sổ cái thay cho tiền thật

[MINH_HỌA, KHÔNG PHẢI DỮ LIỆU GYM] Mô hình gốc giả định gói **1.000.000 VNĐ**, 6/10 buổi được cung cấp, 4/10 buổi **được phép hoàn theo hợp đồng**, chi phí phục vụ mỗi buổi 50.000 VNĐ và chi phí vận hành thêm 20.000 VNĐ. Nếu hợp đồng cũ **hợp pháp giữ toàn bộ 1.000.000 VNĐ**, lợi nhuận đóng góp trước định phí từ 700.000 xuống 280.000 VNĐ, **chênh -420.000 VNĐ**. Nếu toàn bộ tiền bị giữ trong Vault tại ngày 0, so với nhận đủ từ đầu, **cash gap ngày 0 là 1.000.000 VNĐ**. [Toàn bộ giả định & phép tính](../research/unit-economics.md).

**Phản biện cần giữ khi tính lại:** nếu hợp đồng cũ cũng hợp pháp phải hoàn một phần, chênh lợi nhuận khác; không thể suy ra tất cả gym thiệt 420.000 VNĐ. **Thanh khoản và contribution margin là hai biến tách biệt.** Cùng một khoản tiền của Buyer không thể vừa được giữ **100% dự phòng** vừa cho gym tự do rút **100% ngay ngày 0**, trừ khi có vốn tín dụng/trợ cấp/bảo lãnh bên ngoài hoặc thay đổi mức bảo vệ/điều khoản.

**Những mô hình chưa được chứng minh:** phụ phí Buyer, chia sẻ khoản dự trữ, ứng vốn đối tác, bảo lãnh, bảo hiểm, tài trợ ngân hàng, doanh thu tăng nhờ niềm tin. **Không có đơn vị tài trợ vốn, phí, điều kiện credit hoặc gym đồng ý được xác minh.** Một khoản vay ứng trước phải hoàn trả và có rủi ro nợ; **không được tính thành lợi nhuận trợ cấp**.

## 6. Roadmap theo CỔNG BẰNG CHỨNG, không theo ngày hay lời hứa

| Giai đoạn | Phạm vi có thể làm | Cần kiểm chứng trước khi tuyên bố GO | Trạng thái |
| --- | --- | --- | --- |
| **P0 — Bản mẫu hiện có** | PT10, TIME_ACCESS minh họa, 3 portal, Vault Fuji/mock MRES, 3 Fastify boundaries | Reproduce source, CI, Owner/Wallet RPC receipts và giới hạn; không tuyên bố public deploy/fiat | **BUILT / BOUNDED PROOF** |
| **P1 — Tin cậy & pilot-readiness (ưu tiên trước scale)** | Khắc phục luồng Merchant im lặng, cảnh báo thời gian không chứng minh dịch vụ, phân biệt hoàn đã nhận/còn nhận, cải tiến UX đọc quyền lợi, mô hình bằng chứng vật lý, thông báo/kháng nghị | Spec và Foundry test mới; audit threat model; thử người dùng với màn hình thật; provider terms và quyết toán; pháp lý hợp đồng; **không được tự deploy/sửa ABI khi chưa duyệt** | **RESEARCH / NOT_BUILT** |
| **P2 — Kiểm tra beachhead gym thật** | Thử nghiệm có quyền riêng tư với gym đồng ý, đo số buổi/chênh dòng tiền/dispute, so sánh Web2 và Vault | Nhà cung cấp **có thật và được xác thực**, signed pilot, P&L/cash runway, hợp đồng hợp pháp, người dùng hiểu quyền hoàn, nguồn vốn và cách xử lý Merchant bất hợp tác | **NO VERIFIED PILOT** |
| **P3 — Adapters cho lớp 10 buổi đồng giá** | Lớp yoga/Pilates/thể thao, mapping chính sách đặt/hủy/chuyển buổi/hết hạn thành quyền lợi, bằng chứng song phương | Bản đồ từng SKU thật, quyết định xử lý hủy/no-show/công suất, versioned terms, test contract/policy mới khi cần | **HYPOTHESIS** |
| **P4 — Spa/wellness chuẩn hóa / nhiều loại nghĩa vụ** | Bắt đầu từ buổi đồng nhất, rồi nghiên cứu gói nhiều loại buổi/quà/giảm giá và chính sách phân bổ nhiều dòng | Mô hình dòng nghĩa vụ, oracle/attestation, quyền riêng tư, hoàn từng loại, đơn vị thanh toán/pháp lý, economics & security test | **FUTURE POLICY — NOT IN ABI V1** |
| **P5 — Nền tảng đa ngành có thể scale** | Entitlement/policy registry phiên bản hóa, chuẩn kết nối nhà cung cấp, index/reconciliation, audit/export, settlement qua đối tác thanh toán hợp pháp nếu được chấp thuận | Mỗi ngành qua cùng bảy cổng bên dưới; giám sát chuỗi, disaster recovery, independence của resolver, chi phí/công suất, bảo mật, consent, privacy/legal; **đo thực tế, không tự gán throughput** | **LONG-TERM VISION ONLY** |

**Bảy cổng quyết định trước MỖI ngành mới:** (1) điều khoản quyền lợi thực tế phù hợp policy và căn cứ pháp lý; (2) nguồn dữ liệu độc lập/bên mua xác nhận việc cung cấp dịch vụ; (3) trigger chấm dứt/tranh chấp và liveness khi bên cung cấp im lặng; (4) nhu cầu người mua và phân biệt no-show với provider default; (5) **contribution margin** doanh nghiệp so với điều khoản cũ hợp pháp; (6) **cash gap ngày/tuần** và người cấp vốn chịu rủi ro; (7) kênh phân phối, chi phí vận hành và thử nghiệm có đối tác tự nguyện. Mỗi cổng cần tài liệu có thể đối chiếu và quyền của người tham gia, **không được suy diễn từ case báo chí hay bán 10 buổi**.

### Giả thuyết kiến trúc scale (NOT IMPLEMENTED)

- **Bên ngoài chain:** chuẩn hóa một hồ sơ gói dịch vụ gồm loại quyền lợi, lịch/hạn sử dụng, bằng chứng buổi/giờ, chính sách hủy/đổi/đến muộn, người có quyền phê duyệt, cách kháng nghị và vùng pháp lý. Các **vertical adapters** kết nối gym booking, studio classes hoặc spa appointments; cần thiết kế quyền truy cập và dữ liệu tối thiểu. **Chưa có adapters như vậy trong repo.**
- **Trên chain:** settlement policies phiên bản hóa cho những quyền được chứng minh, có guard số dư và liveness/timeout, kiểm thử các trạng thái merchant mất liên lạc. **V1 KHÔNG có registry hoặc generic milestone policy.** Thay ABI cần freeze mới, audit, Foundry regression và quyết định riêng của Owner.
- **Read model & vận hành:** Indexer có cursor/replay/finality, đối chiếu Vault như source of truth; quan sát health/ready/sync, rollback, quyền truy cập theo vai trò và lỗi/race. Hiện tại ba service đã có boundaries và Compose CI, **không có benchmark throughput hoặc full historical sync** để khẳng định quy mô.
- **Tài chính/pháp lý:** nếu có hỗ trợ tiền thật, cần chủ thể được phép lưu ký/xử lý tiền và cơ chế bảo vệ người tiêu dùng theo luật; **không hứa token Fuji đổi ra VNĐ, không tuyên bố bảo hiểm**.

## 7. Vì sao Avalanche — và khi nào Web2 có thể tốt hơn?

**Giá trị kỹ thuật SOURCE_VERIFIED:** hợp đồng và event bất biến theo chain state cho phép Buyer, Merchant và Resolver kiểm tra cùng rule quyền phân bổ, claim, số dư và lịch sử giao dịch; frontend và DB không thể tự thay quyền rút/hoàn trong Vault. [Contract](../contracts/src/ReserveVault.sol) · [SDK](../packages/contracts-sdk) · [Owner/Wallet receipts](../proofs/RELEASE_EVIDENCE_INDEX.md).

**Phản biện bắt buộc:** một nền tảng SaaS Web2 đáng tin cậy cộng đơn vị thanh toán có giấy phép cũng có thể quản lý gói, hoàn tiền và xử lý tranh chấp; đôi khi chi phí, UX và pháp lý tốt hơn. Bản demo chưa chứng minh người mua/doanh nghiệp muốn trả thêm để có chain, chưa giải quyết bằng chứng ngoại chuỗi, biến động pháp lý/tiền thật hoặc vắng phản hồi của Merchant. **Không gọi “decentralized” đồng nghĩa “guaranteed consumer protection”.**

**Đề xuất bài kiểm tra Web2-vs-Fuji cho pilot [NOT_RUN]:** cùng một tình huống gym đóng cửa, so sánh ai có thể thay đổi quyền nhận tiền, người mua có tự xem bằng chứng độc lập hay không, thời gian/chi phí đối chiếu, thất bại ví/RPC, xử lý Merchant im lặng, dữ liệu cá nhân, chi phí vốn và đường hoàn tiền hợp pháp. Chỉ tiếp tục blockchain nếu **lợi ích kiểm chứng nhiều bên vượt phần phức tạp bổ sung**.

## 8. Hướng giao diện phục vụ scale (RESEARCH ONLY)

Một **design system thống nhất**, nhưng ba luồng đọc khác nhau; không biến ba portal thành ba dashboard KPI giống nhau:

- **Customer — Service entitlement:** quyền gói, trạng thái thực hiện, **đã nhận hoàn** vs **còn đủ điều kiện nhận**, bước tiếp theo. Tách hoàn theo từng phiên và hoàn do kết thúc agreement; không để số “0 suất hoàn” phủ nhận lịch sử nhận token 903. Hiển thị rõ Vault money đã đối chiếu **khác** bằng chứng gym hoạt động thực.
- **Gym — Cash & obligations:** **có thể rút ngay**, **đã rút**, **đang bị giữ**, nghĩa vụ cần đối chiếu. Không cộng earned vào withdrawn như hai khoản riêng; không quảng cáo hoàn toàn bảo toàn dòng tiền.
- **Operations — Evidence case file:** agreement/claim, FINALIZED khác RESOLVED, ai được làm gì, source và mức độ xác thực bằng chứng, lịch sử, quyết định/giới hạn ngân sách. **Hash != chứng nhận buổi tập**.

Cần kiểm tra trực tiếp ảnh thật 1440×900 và 390×844, accessibility DOM/visual order, 10-second comprehension và trường hợp Indexer DOWN/ledger invalid; **đây là đề xuất từ Round A/B, CHƯA ĐƯỢC CODE, CHƯA ĐƯỢC NGƯỜI DÙNG NGHIỆM THU**. [W4 UI research](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7056947524) · [W5 UX/finance rebuttal](https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7057233329).

## 9. Thư mục kiểm chứng dành cho AI và giám khảo

| Claim cần kiểm tra | Nguồn gốc/đường dẫn | Kết luận có thể đưa ra |
| --- | --- | --- |
| Solidity thực sự hỗ trợ chính sách nào? | [ReserveVault.sol](../contracts/src/ReserveVault.sol), [Foundry tests](../contracts/test), [Contract SDK](../packages/contracts-sdk) | **PT10/TIME_ACCESS SOURCE_VERIFIED; những vertical policies khác NOT_BUILT** |
| Contract có xử lý Merchant biến mất? | [Source lines 277–343](https://github.com/remjphong/Open-Reserve/blob/unihack-final/contracts/src/ReserveVault.sol#L277-L343) | **NO autonomous escalation for silent Merchant in v1** |
| Chain và CI đã chứng minh gì? | [CI run](https://github.com/remjphong/Open-Reserve/actions/runs/44848508341), [Evidence Index](../proofs/RELEASE_EVIDENCE_INDEX.md), [Judge Guide](JUDGE_REVIEW_GUIDE.md) | Build/Compose và Owner+Wallet-reviewed Fuji; **không chứng minh commercial production, real money, formal audit** |
| Người tiêu dùng có vấn đề thật? | [Tuổi Trẻ 16/11/2026](https://news.tuoitre.vn/california-fitness-closes-another-gym-in-vietnam-deepening-members-uncertainty-103261116085150896.htm); [VnExpress Apax 2024](https://e.vnexpress.net/news/news/education/language-school-apax-leaders-owes-hcmc-students-3-8m-in-tuition-fees-4721743.html) | Một số **case** thật; không có tỷ lệ quốc gia/TAM/SAM |
| Người dùng/provider phản hồi thế nào? | [Owner aggregate survey](../research/primary-surveys.md) | Mẫu nhỏ có giới hạn, **không đại diện** |
| Có sản phẩm studio và spa trả trước thật? | [Top Pilates A](https://pilates.com.vn/goi-tap/goi-tap-lop-nhom-10-buoi-80.html); [Top Pilates B](https://pilates.com.vn/packages); [Fresha](https://www.fresha.com/help-center/knowledge-base/memberships-packages-and-gift-cards/100670-packages-overview) | **EXTERNAL_FIRST_PARTY** category/SKU exists; **không chứng minh khách hàng sẽ mua OpenReserve** |
| Cơ hội kinh tế và vốn có chắc? | [Unit economics](../research/unit-economics.md); [W6 counterexample](https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7057235128) | **MINH_HỌA / NOT_VERIFIED** |
| Nghiên cứu đã qua phản biện? | [CTO D21 Round A](https://github.com/remjphong/Open-Reserve/issues/40#issuecomment-7056919857), [CTO Round B](https://github.com/remjphong/Open-Reserve/issues/40#issuecomment-7057230725), [W5 Round B](https://github.com/remjphong/Open-Reserve/issues/35#issuecomment-7057233329), [W6 Round B](https://github.com/remjphong/Open-Reserve/issues/36#issuecomment-7057235128), [W4 Round A](https://github.com/remjphong/Open-Reserve/issues/27#issuecomment-7056947524) | Có phản biện thực; **W4 Round B chưa hoàn thành**, không khẳng định bốn bên đã nhất trí toàn bộ |

**AI-evaluation note:** Không lấy bảng ưu tiên ngành thành dự báo doanh thu hay xác suất thành công, không diễn giải tính năng FUTURE thành SOURCE_VERIFIED, không tính testnet base units thành tiền VNĐ, không biến một sự cố báo chí thành tỷ lệ thị trường, không gộp một trường hợp Merchant hợp tác thành bảo đảm hoàn khi vắng hợp tác. Một roadmap trung thực bao gồm **điều kiện bác bỏ** và sản phẩm **có thể không phù hợp** với một ngành nếu cash flow, luật hoặc bằng chứng dịch vụ không qua thử nghiệm.
