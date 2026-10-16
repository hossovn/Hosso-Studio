# Hosso Studio: kế hoạch PoC (đã duyệt)

Quyết định khi duyệt: tắt `sharp` (LGPL); Node 24 LTS cho Docker (máy dev có thể Node ≥ 22.15); NestJS 11.x; có Docker.

## Phiên bản ghim

Payload 3.91.0 (+ db-sqlite, db-postgres, next, ui, translations), Next 16.4.2, React/ReactDOM 19.3.1, @puckeditor/core 0.23.0, graphql 16.14.2, TypeScript 5.9.3, NestJS 11.x. Tất cả MIT trừ TypeScript và drizzle (Apache-2.0).

## Cấu trúc repo

```
apps/studio        Payload + site runtime Next.js + hosso.config.ts
packages/blocks    @hosso/studio-blocks  (kiểu hợp đồng, schema block lõi, chuỗi vi)
packages/theme-default, theme-alt   hai theme (theme.json + token + renderer)
packages/plugin-wim  @hosso/plugin-wim (UNLICENSED, private)
tools/mock-wim     NestJS 11 dựng từ openapi.yaml
seed/  docs/
```

## Thiết kế chính

- Trang: collection `pages` có `versions.drafts`; trường `content` kiểu json giữ JSON của Puck.
- Block = schema (blocks/plugin) tách khỏi renderer (theme). Cấu hình Puck dựng lúc chạy; đổi theme không đổi JSON.
- Block động lấy dữ liệu qua `load()` phía server, renderer thuần.
- Puck editor ở route `/editor/[id]` xác thực bằng cookie Payload (dự phòng: custom view).
- Vai trò admin/editor; editor không xuất bản. Không dùng tính năng Enterprise của Payload hay Puck Cloud/AI.
- Plugin WIM: global cấu hình mã hóa AES-256-GCM, env ưu tiên hơn DB, cache TTL trong bộ nhớ, webhook HMAC tùy chọn.
- DB chọn bằng `HOSSO_DATABASE_URL` (`file:` = SQLite, `postgres:` = Postgres). Chuyển máy bằng export/import, không copy DB.

## Năm lát

1. **Nền tảng**: repo, `pnpm dev`, hosso.config.ts, admin thương hiệu, pháp lý, trang từ block, seed. Xong khi: localhost có admin đỏ và trang mẫu; LICENSE nguyên văn; không GPL/AGPL/LGPL.
2. **Puck + theme**: editor, nháp/xuất bản, phân quyền, token, hai theme. Xong khi: đổi theme giữ JSON; editor không xuất bản được. Sau đó dừng ở Cổng 2.
3. **Plugin + WIM đọc**: openapi.yaml, mock, cơ chế plugin, cấu hình mã hóa, block catalog, cache, webhook.
4. **Giỏ hàng + đặt đơn**: Idempotency-Key, retry, hết hàng, timeout, trạng thái đơn.
5. **Deploy**: Docker + Postgres, health, migration, export/import, dựng site bằng admin, instance thứ hai, Lighthouse.

## Rủi ro chính (theo ảnh hưởng đến lựa chọn Payload + Puck)

1. Block động trong RSC với config server riêng. 2. Nhúng Puck editor vào Payload. 3. Đổi theme giữ JSON. 4. Giấy phép sharp (đã xử lý). 5. Migration SQLite ≠ Postgres. 6. Ánh xạ ID media khi import. 7. Lighthouse ≥ 90 mobile.

## Giả định

Theme thứ hai thêm bằng package + khai báo trong hosso.config.ts. `GET /orders/{id}` ở site yêu cầu thêm 4 số cuối điện thoại. Giỏ hàng ở trình duyệt. Tailwind không dùng.
