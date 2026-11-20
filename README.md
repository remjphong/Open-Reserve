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
