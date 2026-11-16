# OpenReserve · Điều khoản demo v1.0.1

## Thanh toán và quyền đối với token

Buyer khóa toàn bộ giá gói vào ReserveVault khi mở agreement (Full Reserve). Vault giữ Mock ERC-20 trên Avalanche Fuji. Phí trích từ tiền gói bằng 0. Buyer có thể cần AVAX testnet để trả gas. Token mô phỏng không có giá trị tiền thật.

Gói, chính sách, giá gói, thời hạn áp dụng, địa chỉ buyer/gym và `termsHash` được xác định khi mở agreement. Gym chỉ rút được giá trị dịch vụ đã chốt và chưa rút. Buyer chỉ nhận được khoản hoàn đã được quyết định hợp lệ và chưa nhận. Vault là nguồn xác thực hai quyền này.

- `remainingLocked` là tiền nạp trừ token gym đã rút và buyer đã nhận hoàn. Khoản này có thể chứa giá trị chưa chốt, đang tranh chấp, gym được rút hoặc buyer được nhận.
- `refundable` là số token buyer đã được quyền nhận theo quyết định có hiệu lực và còn chưa nhận. Điều khoản này không coi toàn bộ `remainingLocked` là `refundable`.
- Mỗi đơn vị token chỉ có thể được dùng một lần cho payout hoặc refund. Khoản đã chốt vẫn có thể được ví có quyền nhận gọi trực tiếp qua Vault nếu giao diện ngừng hoạt động.

## PT 10 buổi · PER_SESSION

1. Gym đề xuất từng buổi đã thực hiện, kèm ID duy nhất trong agreement và hash bằng chứng. Không đề xuất trước buổi, ghi trùng ID hoặc vượt 10 buổi, kể cả các đề xuất còn hiệu lực đang chờ xử lý.
2. Buyer kiểm tra và xác nhận. Gym chỉ được chốt phần của buổi sau khi buyer xác nhận. Check-in riêng lẻ và im lặng của buyer không thay được xác nhận. Khi có bất đồng, xử lý theo đồng thuận hoặc phân xử trong phạm vi ghi ở dưới.
3. Với giá gói `P` tính theo đơn vị token nhỏ nhất, phần của buổi chốt thứ `n` là `floor(P*n/10) - floor(P*(n-1)/10)`. Tính theo thứ tự **chốt** và không tăng bộ đếm khi chỉ đề xuất. Mười buổi chốt đủ phân bổ đúng `P`.

Ví dụ với `P = 1003` đơn vị, buổi đầu ghi nhận 100, buổi cuối ghi nhận 101 và tổng sau 10 buổi là 1003.

Khi một claim PT bị phản đối, quyết định hoàn dương phải gắn với agreement, claim và đúng ID buổi đã được đề xuất. Quyết định đó khép lại quyền sử dụng của **một buổi**, kể cả khi chỉ hoàn một phần. Gym không thể chốt lại ID buổi đó và tổng số buổi còn có thể chốt giảm một. Buyer cần được thông báo rõ số token hoàn được duyệt và số buổi còn quyền sử dụng.

Đánh số mười suất giá trị từ 1 đến 10. Buổi đã chốt cho gym dùng suất từ đầu theo thứ tự chốt. Khoản hoàn PT dương đóng suất còn trống từ cuối, tối đa bằng giá trị của suất đó tính theo cùng công thức. Quyết định hoàn bằng 0 kết thúc claim và giữ ID buổi ở trạng thái đã dùng, nhưng giữ nguyên số suất còn quyền sử dụng. Một buổi khác với ID mới có thể sử dụng suất đó khi đủ điều kiện. Buổi hợp lệ đã chốt vẫn chiếm một suất khi giá trị làm tròn bằng 0.

Nếu hoàn một phần giá trị của suất đã đóng, phần còn lại tiếp tục khóa và không tự cấp quyền rút hoặc quyền hoàn. Phần này chỉ có thể được xử lý qua quyết định hoàn hợp lệ khi kết thúc agreement hoặc quyết định hoàn bổ sung sau khi kết thúc, với đồng thuận của hai bên hoặc phán quyết có phạm vi của resolver demo. Tổng số suất đã chốt, đã đóng do hoàn dương và đang có claim còn hiệu lực không vượt 10.

## Gym unlimited 90 ngày · TIME_ACCESS

1. Gym cung cấp quyền truy cập trong `[startAt,endAt)`. Quyền được cung cấp trong một đoạn hợp lệ có cùng giá trị dù buyer đến 0 lần hay 15 lần.
2. Gym chỉ đề xuất interval nửa mở `[from,to)` đã trôi qua với `startAt <= from < to <= endAt` và `to <= now`. Dùng thời gian block. Hai đoạn liền kề có thể cùng hợp lệ. Cấm giao nhau hoặc dùng lại đoạn đã được phân bổ hay còn trong claim có hiệu lực.
3. Buyer có thể phản đối trước mốc `proposedAt + challengeWindow`. Tại mốc đó hoặc sau đó, claim chưa bị phản đối có thể chốt bằng giao dịch. Claim bị phản đối giữ nguyên phần tiền liên quan đến khi có quyết định hợp lệ. Cơ chế này dựa vào đề xuất và cửa sổ phản đối, còn tình trạng mở cửa cần bằng chứng khi có tranh chấp.
4. Với `T = endAt - startAt`, giá trị interval là `floor(P*(to-startAt)/T) - floor(P*(from-startAt)/T)`. Tính bằng đơn vị token nhỏ nhất, làm tròn xuống ở hai mốc. Các đoạn liền kề phủ đủ thời hạn và không có tranh chấp phân bổ đúng `P`. Thời gian bị gián đoạn không được tính như thời gian đã cung cấp.

| Cấu hình | Thời hạn truy cập | Cửa sổ phản đối |
| --- | --- | --- |
| Mô hình 90 ngày và kiểm thử local | 90 ngày × 86.400 giây | 24 giờ |
| Demo Fuji tăng tốc | 270 giây thực theo block | 60 giây thực theo block |

Giao diện Fuji hiển thị **Demo tăng tốc · 270 giây** và mốc phản đối thực. Ví dụ 90 giây Fuji bằng một phần ba thời hạn mô phỏng. Kiểm thử local dùng Foundry `vm.warp` cho mốc 30/90 ngày. Trên Fuji, phải đợi thời gian block thật.

## Gián đoạn, đóng cửa, kết thúc và hoàn

- Tạm đóng hoặc gián đoạn do gym làm mất quyền truy cập thì đoạn bị gián đoạn không đủ điều kiện tính doanh thu. Tách các đoạn hợp lệ trước và sau gián đoạn. Nếu gym đã đề xuất cả đoạn, buyer phản đối trong cửa sổ và đưa bằng chứng để xử lý phần tranh chấp. Phiên bản này giữ nguyên hạn cuối của agreement khi tạm dừng.
- Khi gym đóng cửa hẳn hoặc ngừng cung cấp dịch vụ, các buổi chưa cung cấp và thời gian tương lai chưa phục vụ không phát sinh quyền rút mới. Việc buyer không đi tập trong khi gym vẫn cung cấp quyền truy cập không tự phát sinh quyền hoàn.
- Hai bên có thể thống nhất phương án kết thúc/hoàn. Khi có tranh chấp, ví resolver demo chỉ được quyết định trong phạm vi claim/agreement được giao, dựa vào điều khoản và bằng chứng. Khoản đã chốt cho gym hoặc đã cấp quyền cho buyer không bị cấp lại trong quyết định mới. Nếu quyết định chỉ phân bổ một phần, phần chưa được quyết định tiếp tục khóa. Khoanh vùng tranh chấp theo agreement và phần liên quan.
- Khoản hoàn hợp lệ chỉ chuyển về buyer của agreement. Resolver không có quyền sweep, chuyển cho bên thứ ba hoặc rút về ví của mình. Quyết định kết thúc phải xử lý rõ claim còn hiệu lực trong phạm vi quyết định để phần giá trị đã hoàn không thể được chốt lại cho gym.

## Phiên bản và dấu vân tay điều khoản

`termsVersion = "1.0.1"` áp dụng cho tài liệu điều khoản này, gồm cả hai policy. Catalog định danh riêng package và cấu hình thời gian. `termsHash = keccak256(bytes)` với `bytes` là toàn bộ byte của đúng tệp Markdown đã chốt, mã hóa UTF-8, không BOM, LF và một newline cuối tệp. Dùng Keccak-256 của EVM. Lưu nguyên bản có thể tải và kiểm tra cùng version trong catalog. Trước khi ký, UI hiển thị loại gói, giá, cấu hình thời gian áp dụng và terms hash. Tính hash lại từ nguồn chuẩn và đối chiếu hash trong receipt khi kiểm chứng agreement. Nội dung hoặc tham số công bố thay đổi cần phiên bản mới. Agreement cũ tiếp tục dùng version/hash đã chốt.

## Sáu tình huống demo và kiểm thử

| # | Tình huống | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Buyer mua gói bằng 900 đơn vị token thử nghiệm | Buyer giảm 900, Vault tăng 900, agreement khóa 900, khoản gym rút được và khoản buyer nhận hoàn đều bằng 0. |
| 2 | PT 10 buổi, giá 1003. Gym đề xuất sau buổi, buyer xác nhận, gym chốt và rút | Sau 1/10 buổi gym được rút 100. Sau 10/10 tổng là 1003. ID lặp, buổi thứ 11 và chốt khi thiếu xác nhận đều bị từ chối. |
| 3 | Gói 90 ngày giá 900, claim 30 ngày đầu. So sánh 0 và 15 check-in | Cùng ghi nhận 300 sau khi hết cửa sổ, nếu không bị phản đối. Chốt sớm, interval tương lai và interval giao nhau bị từ chối. Fuji có thể dùng 90 giây thật cho cùng tỷ lệ. |
| 4 | Gym gián đoạn trong một interval, buyer phản đối trước hạn | Giữ phần claim tranh chấp, không chốt khi đã hết cửa sổ. Đoạn gián đoạn không được ghi nhận là đã cung cấp. Agreement khác vẫn xử lý được. |
| 5 | Gym đóng cửa sau 30 ngày đã chốt và rút 300 trên 900. Quyết định hợp lệ hoàn 600 chưa phục vụ | Trước quyết định, còn khóa 600 và được hoàn 0. Sau quyết định, buyer được nhận 600. Sau khi nhận, Vault còn 0 cho agreement, tổng đã rút và đã hoàn bằng 900. |
| 6 | Ví sai thử chốt/rút/ra quyết định; ví hợp lệ thử rút hoặc hoàn lần hai | Giao dịch trái quyền hoặc chi trùng bị từ chối. Khoản đã chốt vẫn gọi trực tiếp được bằng đúng ví kể cả khi web ngừng hoạt động. |
