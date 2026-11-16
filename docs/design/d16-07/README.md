# OpenReserve · Ba mẫu giao diện D16-07

**Trạng thái AWAITING_REVIEW.** Mở `customer.html`, `gym.html` và `operations.html` trong trình duyệt hoặc dùng ảnh trong [proofs/ui/d16-07](../../../proofs/ui/d16-07). Ba tệp mở độc lập, dùng chung CSS, bộ icon và dữ liệu minh họa. Điều hướng trong mỗi mẫu đi đến phần tương ứng trên cùng màn hình. Nút gửi giao dịch bị vô hiệu hóa, kèm lý do ngay dưới nút.

## Cùng một hợp đồng mẫu

| Giá trị | MRES | Cách trình bày |
| --- | ---: | --- |
| Đã nạp | 1.000 | Biên nhận mẫu của OR-024 |
| Đã chốt cho gym | 300 | Ba buổi được xác nhận |
| Gym đã rút | 200 | Từ khoản đã chốt |
| Gym có thể rút | 100 | Đã chốt và chưa rút |
| Đang được Vault giữ | 800 | 1.000 đã nạp trừ 200 đã rút |
| Đã được duyệt hoàn | 0 | Chưa có quyết định hoàn |
| Đang tranh chấp | 100 | Thuộc 800 đang khóa, gắn với PT-04 |

PT-04 là một đề nghị đã bị phản đối, ngoài ba buổi đã chốt. Bản mẫu minh họa cách giải thích trạng thái và giới hạn quyền. MRES là token thử nghiệm, tất cả số liệu trên là fixture. Ảnh không chứa hash giao dịch, địa chỉ ví, số block hoặc chứng cứ Fuji giả.

## Design tokens

Nguồn CSS nằm trong [reference.css](reference.css). Các token chính giữ giá trị của UX annex. Màu nền phụ dành cho trạng thái và màu chữ có độ tương phản cao hơn được ghi rõ dưới đây.

| Nhóm | Token và quy tắc |
| --- | --- |
| Bề mặt | Canvas `#F7F8F6`, panel `#FFFFFF`, viền `#DDE5DE` |
| Chữ | Chính `#172820`, phụ `#617269` |
| Hành động | `#176B52` trên nền sáng hoặc chữ trắng trên nền nút, nền phụ `#EAF4EF` |
| Cảnh báo, lỗi | `#9A671C` và `#B44242`. Ghép chữ và icon với màu. Pill cảnh báo dùng chữ `#795115` trên nền `#FBF3E3`. Panel lỗi dùng nền `#FBEFED`. |
| Typography | Be Vietnam Pro 400, 600, 700. Arial và sans-serif là fallback. Tiêu đề 32 px desktop, 27 px mobile. Nội dung 14 px, metadata 12–13 px. Số dùng tabular figures; đơn vị MRES phụ thuộc ngữ cảnh hiển thị. |
| Spacing và hình dạng | Thang 4/8/12/16/24/32 px, card 12 px, button 8 px, vùng bấm từ 44 px. Viền mảnh, không dùng shadow nặng. |
| Icon | Lucide nét 1,8 px, đi kèm nhãn. Be Vietnam Pro và icon được kèm license trong `assets/`; không tải tài nguyên ngoài khi mở mẫu. |

## Đặc tả component dùng lại

| Component | Dữ liệu vào và hành vi |
| --- | --- |
| AppShell | Role label, navigation, WalletIdentity, notice và vùng nội dung. Khách hàng có top nav nhẹ. Gym và Vận hành dùng sidebar desktop, nav ngang ở mobile. Thứ tự đọc và focus theo ưu tiên của từng màn hình. |
| RoleNavigation | Nhãn và đích đến có sẵn, đánh dấu mục hiện tại, focus thấy rõ. Mẫu dùng anchor nội trang. Route thật và kiểm tra quyền ở các bước triển khai. |
| WalletIdentity | Hiện vai trò mong đợi và trạng thái kết nối. Khi có kết nối thật, hiện địa chỉ rút gọn và mạng, kèm tên vai trò. Wallet và quyền contract quyết định thao tác ghi, không suy ra từ URL. |
| MoneyFigure và MoneyBreakdown | Nhãn, giá trị, đơn vị, nguồn và thời điểm. Số tabular, căn phải trong bảng. Giá trị huỷ/không đọc được dùng “Chưa có dữ liệu”. Dùng 0 chỉ khi nguồn có số 0. Số khóa, có thể rút và được duyệt hoàn là ba dòng riêng. |
| StatusPill | Văn bản + icon + màu. Dùng “Bị phản đối”, “Đã chốt”, “Đã rút” cho trạng thái khác nhau. Không chỉ đổi màu để báo trạng thái. |
| EntityTable | Cột và tiêu đề có scope. Trạng thái vừa đủ ngắn, số căn phải. Mobile giữ cột buổi, trạng thái, giá trị; đơn vị MRES hiện trong chú thích bảng. Nếu thêm cột dài ở D16-08, chuyển chi tiết sang disclosure hoặc cuộn trong vùng bảng riêng. |
| AgreementReceipt | Agreement ID, loại giao dịch, lượng token, phiên bản điều khoản, trạng thái, chain/block/tx khi có. Chỉ hiện link explorer khi có hash thực. Mẫu dùng “Chưa có trong bản xem trước”. |
| AgreementStatusTimeline | Tiêu đề, mô tả, thứ tự sự kiện và nguồn. Mỗi mốc phân biệt đề nghị, phản đối, chốt và chuyển token. Trạng thái phân xử mô phỏng không chứng minh dịch vụ đã diễn ra. |
| EmptyState, LoadingSkeleton, ErrorState | Empty nêu đối tượng chưa có. Loading gồm chữ và skeleton tĩnh. Error nêu nguồn lỗi và thao tác khôi phục; trạng thái thực dùng thông báo phù hợp cho trình đọc màn hình. Mở “Xem mẫu trạng thái giao diện” ở dưới mỗi màn để xem. |
| TransactionAction | Nút chính kèm trạng thái và lý do khóa. Khi nối chain, tách “Chờ bạn ký”, “Đang chờ biên nhận”, “Đã xác nhận”, “Giao dịch thất bại”. Chỉ lên “Đã xác nhận” sau biên nhận hợp lệ. |

## Microcopy cần giữ nghĩa

- **Khách hàng:** “Đang được Vault giữ” và “Đã được duyệt hoàn”. “Nếu bạn xác nhận buổi này, phần token của buổi sẽ được chốt cho gym.”
- **Gym:** “Gym có thể rút” kèm “Phần đã chốt và chưa rút”. “Chỉ ví chủ gym của hợp đồng được ký.”
- **Vận hành:** “Vai trò phân xử mô phỏng”. “Chỉ xử lý claim được giao. Ví phân xử không có quyền tự rút token.”
- **Nguồn dữ liệu:** mẫu có nhãn “Dữ liệu minh họa · Bản xem trước, chưa kết nối Fuji.” Khi tích hợp, lịch sử indexer cần số block và cảnh báo trễ. Số liệu tiền và quyền rút/hoàn lấy trực tiếp từ Vault. Mô tả và bằng chứng qua Catalog/Evidence. Giá trị giả định của Business Lab cần nhãn minh họa riêng.

## Desktop và mobile

- **1440×900:** Customer ưu tiên thẻ gói và tiến độ trước chi tiết số dư. Gym đặt sổ đề nghị cạnh phần giải ngân. Vận hành dành cột rộng cho sổ cái và bằng chứng, cột phụ cho quyền phân xử và biên nhận.
- **390×844:** Giữ ngữ cảnh vai trò, trạng thái ví, nhãn fixture và nút chính trong màn hình đầu. Các phần lịch sử, bằng chứng và biên nhận tiếp tục theo cuộn dọc. Body, bảng và số liệu không cần cuộn ngang toàn trang.
- Các cảnh ví sai mạng, từ chối chữ ký, thiếu gas và indexer chậm được mô tả ở UX annex. Mẫu chỉ trình bày ví chưa kết nối và thư viện trạng thái. Chưa kiểm tra luồng giao dịch, thiết bị vật lý hay tính tương thích Safari.

[Ảnh chụp và rubric](../../../proofs/ui/d16-07/review.md)
