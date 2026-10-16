# Giấy phép các thư viện chính

Kiểm tra trực tiếp từ metadata của từng gói (npm registry / repo) và bằng `pnpm licenses list --prod` trên cây phụ thuộc đã cài (cập nhật ở lát 1; cập nhật lại mỗi lát thêm phụ thuộc).

| Thư viện | Phiên bản | Giấy phép |
|---|---|---|
| payload, @payloadcms/next, @payloadcms/ui, @payloadcms/db-sqlite, @payloadcms/db-postgres, @payloadcms/translations | 3.91.0 | MIT |
| next | 16.4.2 | MIT |
| react, react-dom | 19.3.1 | MIT |
| graphql | 16.14.2 | MIT |
| @puckeditor/core | 0.23.0 | MIT |
| @nestjs/common, core, platform-express (mock WIM) | 11.2.7 | MIT |
| class-validator, class-transformer (mock WIM) | 0.15.1 / 0.5.1 | MIT |
| reflect-metadata, rxjs (mock WIM) | 0.2.2 / 7.8.2 | Apache-2.0 |
| openapi-typescript (dev) | 7.13.0 | MIT |
| ajv, yaml (dev, contract test) | 8.20.0 / 2.9.1 | MIT / ISC |
| typescript | 5.9.3 | Apache-2.0 |
| drizzle-orm (qua Payload) | 0.45.2 | Apache-2.0 |

## Không phải MIT/ISC/BSD trong cây prod (đã xem xét)

| Gói | Giấy phép | Nhận xét |
|---|---|---|
| argparse 2.0.1 | Python-2.0 | Permissive, cho phép phân phối lại |
| caniuse-lite | CC-BY-4.0 | Dữ liệu duyệt web, cần ghi nguồn (build-time) |
| dompurify | MPL-2.0 OR Apache-2.0 | Chọn Apache-2.0 |
| sanitize-filename, truncate-utf8-bytes, utf8-byte-length | WTFPL (hoặc ISC/MIT) | Permissive; hai gói sau chỉ WTFPL, cần luật sư xác nhận |
| sax | BlueOak-1.0.0 | Permissive |
| tslib | 0BSD | Permissive |

Kết quả: không có GPL, AGPL hay LGPL trong cây phụ thuộc prod.

## sharp / libvips

Binary libvips đi kèm `sharp` là LGPL-3.0. Quyết định: **không dùng sharp**. `pnpm.overrides` đặt `"sharp": "-"` để gỡ khỏi cây (Next và Payload coi nó là tùy chọn); ảnh upload không được resize, Next tắt tối ưu ảnh (`images.unoptimized`). Đã xác nhận `node_modules/.pnpm` không chứa sharp hay libvips.
