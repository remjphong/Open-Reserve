# OpenReserve

Prototype UniHack 2026 cho gói dịch vụ trả trước. Demo dùng token thử nghiệm trên Avalanche Fuji.

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

Healthcheck của container ứng dụng gọi `/ready`, vì vậy Indexer hiển thị
unhealthy trong checkpoint này dù `/health` tự báo liveness 200.
Mở UI tĩnh bằng `npm run dev --workspace @openreserve/web` hoặc cổng 4173
khi dùng Compose. API nghiệp vụ, proxy tích hợp và đồng bộ Fuji để ở các task sau.
