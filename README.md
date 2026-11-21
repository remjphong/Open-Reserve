# OpenReserve

OpenReserve là bản mẫu quản lý khoản trả trước cho phòng tập. Hợp đồng thông minh `ReserveVault` trên Avalanche Fuji giữ token thử nghiệm và kiểm tra quyền rút của phòng tập, quyền nhận hoàn của khách. Khách, phòng tập và bên phân xử có thể đối chiếu cùng một hợp đồng và các biên nhận giao dịch.

## Chạy demo trên máy

Cần Git, Node.js 24.x và npm 11.x. Các lệnh dưới đây dùng Bash (Linux, macOS hoặc WSL). Luồng xem demo này chạy bằng frontend và đọc Vault trực tiếp trên Fuji, nên có thể bắt đầu mà chưa cần Docker hay PostgreSQL.

```bash
git clone --branch unihack-final https://github.com/remjphong/Open-Reserve.git
cd Open-Reserve
npm ci --include=dev
npm run prebuild

VITE_VAULT_CHAIN_ID=43113 \
VITE_VAULT_ADDRESS=0x20D55E7Fc137a5924f6Bf76608eFaf99002474ad \
VITE_VAULT_DEPLOYMENT_BLOCK=61240386 \
VITE_MERCHANT_ADDRESS=0xA337FCeC5f9508C3Ab5E10aE571610E167548878 \
npm run dev --workspace @openreserve/web -- --host 127.0.0.1 --port 5175 --strictPort
```

Mở [trang khách hàng](http://localhost:5175/customer) để xem hai loại gói. Để đọc dữ liệu Fuji, dùng trình duyệt có ví tương thích như Core và chọn **Avalanche Fuji C-Chain (43113)**. Các trang có kiểm tra vai trò theo địa chỉ ví của hợp đồng. Với ví cá nhân, có thể xem giao diện và tra cứu biên nhận công khai mà không cần quyền truy cập ví của nhóm. Demo dành cho giám khảo ở chế độ chỉ đọc. Có thể kết nối ví và làm mới dữ liệu mà không cần ký hoặc gửi giao dịch.

| Vai trò | Gói PT 10 buổi | Gói theo thời gian |
| --- | --- | --- |
| Khách hàng | [Gói #1](http://localhost:5175/customer/passes/1) | [Gói #2](http://localhost:5175/customer/passes/2) |
| Phòng tập | [Hợp đồng #1](http://localhost:5175/gym/agreements/1) | [Hợp đồng #2](http://localhost:5175/gym/agreements/2) |
| Phân xử | [Hồ sơ PT](http://localhost:5175/operations/disputes/1?claimId=1) | [Hồ sơ theo thời gian](http://localhost:5175/operations/disputes/2?claimId=1) |

Trong hồ sơ thử nghiệm **PT #1**, khách nạp **1.003**, phòng tập đã rút **100** cho buổi đã chốt và khách đã nhận hoàn **903** sau khi phòng tập đồng ý kết thúc gói. Với **gói #2**, phòng tập đã chốt và rút **900** theo khoảng thời gian đủ điều kiện. Các số này là đơn vị nhỏ nhất của token thử nghiệm MRES.

Nếu danh sách hoặc nhật ký chưa tải đủ do Indexer đang đồng bộ hoặc RPC giới hạn truy vấn, mở đường dẫn theo ID trong bảng để đọc Vault trực tiếp. Nếu RPC vẫn lỗi hoặc ví không khớp vai trò, xem [biên nhận và kết quả demo đã ghi nhận](proofs/RELEASE_EVIDENCE_INDEX.md).

## Chạy đầy đủ bằng Docker Compose

Cần Docker và Compose. Sao chép cấu hình mẫu, đặt mật khẩu phát triển riêng trong `.env`, rồi chạy:

```bash
cp .env.example .env
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Mở [web tại cổng 4173](http://localhost:4173/customer). Compose chạy thêm Catalog & Evidence (3001), Chain Indexer (3002), Economics (3003) và PostgreSQL. Để bật đọc Vault Fuji trong web Compose, điền bốn biến `VITE_*` theo lệnh ở trên vào `.env` trước khi build. Để Indexer đọc Fuji, cấu hình `FUJI_RPC_URL`. Có thể kiểm tra tiến độ tại [trạng thái đồng bộ](http://localhost:4173/api/chain/v1/sync).

## Mã nguồn

- [Hợp đồng Solidity](contracts/src/ReserveVault.sol) và [kiểm thử Foundry](contracts/test)
- [Ba giao diện React/TypeScript](apps/web/src/portals) và [ba dịch vụ Fastify](services)
