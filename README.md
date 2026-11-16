# OpenReserve

Prototype UniHack 2026 cho gói dịch vụ trả trước. Demo dùng token thử nghiệm trên Avalanche Fuji.

## Tài liệu sprint

1. [Execution Lock 1.2](OPENRESERVE_EXECUTION_LOCK_16-20_NOV_2026.md) chốt phạm vi, tiêu chí nghiệm thu và State Log.
2. [Three-Portal UX Spec 1.1](OPENRESERVE_THREE_PORTAL_UX_SPEC_2026-11-16.md) mô tả ba portal, giao diện và quyền người dùng.
3. [Microservices Architecture 1.0](OPENRESERVE_MICROSERVICES_ARCHITECTURE_2026-11-16.md) mô tả ranh giới service, API và chủ sở hữu dữ liệu.

`docs/` lưu đặc tả triển khai, `proofs/` lưu bằng chứng kiểm thử và `research/` lưu tài liệu nghiên cứu đã ẩn danh. Theo dõi kết quả từng task ở mục H của Execution Lock.

## Chạy scaffold

Cần Node.js 24, npm 11, Foundry và Docker Compose nếu dùng container.

```bash
npm ci
npm run typecheck
npm run build
(cd contracts && forge build)
docker compose --env-file .env.example config --quiet
```

Dùng `npm run dev --workspace @openreserve/web` để mở giao diện khung.
Sau khi build, có thể chạy từng service với `npm run start --workspace
@openreserve/catalog-evidence`, hoặc chọn workspace `@openreserve/chain-indexer`
hay `@openreserve/economics`. Các service hiện chỉ có entrypoint Fastify.
Endpoint `/health` và kiểm thử HTTP thuộc D16-09.
