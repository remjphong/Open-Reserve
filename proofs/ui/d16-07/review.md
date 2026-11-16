# D16-07 · Visual review

**AWAITING_REVIEW.** Các ảnh là ảnh chụp trình duyệt từ mẫu tĩnh, không phải giao dịch hay dữ liệu Fuji. Nguồn mẫu và [design tokens / component specs](../../../docs/design/d16-07/README.md) nằm trong `docs/design/d16-07/`.

## Ảnh chụp

| Portal | Desktop 1440×900 | Mobile 390×844 | Mục tiêu của màn |
| --- | --- | --- | --- |
| Khách hàng | [Customer · desktop](customer-1440x900.jpg) | [Customer · mobile](customer-390x844.jpg) | Xem tiến độ gói PT, phân biệt tiền đang khóa và tiền đã được duyệt hoàn, đọc ngữ cảnh trước khi xác nhận. |
| Phòng gym | [Gym · desktop](gym-1440x900.jpg) | [Gym · mobile](gym-390x844.jpg) | Đối chiếu các buổi đã chốt và đang bị phản đối, xác định phần có thể rút. |
| Vận hành | [Operations · desktop](operations-1440x900.jpg) | [Operations · mobile](operations-390x844.jpg) | Tra sổ cái và bằng chứng mẫu của PT-04, thấy giới hạn của vai trò phân xử. |

## Rubric UX annex

Điểm tự đánh giá dùng thang 0–2 cho từng tiêu chí. Chủ dự án duyệt mỗi portal riêng.

| Tiêu chí | Khách hàng | Phòng gym | Vận hành |
| --- | ---: | ---: | ---: |
| Rõ mục tiêu và điều hướng | 2 | 2 | 2 |
| Phân cấp thị giác và tính nhất quán | 2 | 2 | 2 |
| Thuật ngữ, nguồn và nhãn minh họa | 2 | 2 | 2 |
| Mức đầy đủ của tương tác và trạng thái | 1 | 1 | 1 |
| Responsive và khả năng đọc | 2 | 2 | 1 |
| **Tổng** | **9/10** | **9/10** | **8/10** |

- **Khách hàng:** Tiến độ bằng số và các đoạn màu là điểm đọc đầu tiên. Trên mobile, lịch sử nằm dưới màn hình đầu. Link “Xem đề nghị PT-04” đi đến lịch sử ngay trong mẫu.
- **Gym:** Khoản đã chốt, phần có thể rút và phần tranh chấp nằm cạnh nhau trên desktop. Mobile ưu tiên số liệu và hành động; cần cuộn để xem đủ bốn hàng claim.
- **Vận hành:** Cảnh báo quyền nằm cạnh thao tác phân xử, tách khỏi sổ cái và biên nhận. Mobile cần cuộn nhiều hơn để đối chiếu số dư với lịch sử bằng chứng. Đó là lý do responsive được chấm 1/2.
- **Cả ba:** Điểm tương tác 1/2 ghi nhận anchor và các cảnh trạng thái nhìn được. Mẫu chưa có kết nối ví, chuyển mạng, ký, thử lại RPC hoặc xác nhận biên nhận thật. Nút cần chữ ký có lý do khóa. Không có kết luận về hành vi chain hoặc browser khác.

## Kiểm chứng

Chromium + Playwright mở ba HTML cục bộ ở viewport cố định với device scale 1. Chụp sáu ảnh viewport đúng kích thước. Browser checks xác nhận không tràn ngang trang, nút chính nằm trong màn hình đầu, font Be Vietnam Pro tải thành công, không lỗi console/asset, không có request ngoài, anchor hợp lệ và mục trạng thái mở được. [Log chụp ảnh](capture.log)

D16-08 chỉ bắt đầu khi chủ dự án duyệt rõ cả ba mẫu. D16-07 ghi nhận hướng thị giác và microcopy.
