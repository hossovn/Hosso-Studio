# Hosso Studio

Trình dựng website mã nguồn mở (Apache-2.0), tự cài, tự chạy, xây trên Payload CMS. Một cài đặt = một website.

## Chạy thử

Yêu cầu: Node ≥ 22.15 (khuyến nghị 24 LTS), pnpm ≥ 10.

```bash
pnpm install
pnpm dev
```

Lần chạy đầu tự tạo `apps/studio/.env` (khóa ngẫu nhiên, tài khoản admin) và nạp dữ liệu mẫu.

- Site: http://localhost:3000
- Quản trị: http://localhost:3000/admin (email và mật khẩu nằm trong `apps/studio/.env`)

Biến môi trường: xem `.env.example`. Cấu hình thương hiệu, theme, plugin: `apps/studio/hosso.config.ts`.

Tài liệu: `docs/INSTALL.md` (cài đặt, WIM, Docker, export/import), `docs/ARCHITECTURE.md`, `docs/PLAN.md` (kế hoạch), `docs/GATE2-REPORT.md` (Puck + Payload), `docs/LICENSES.md`, `docs/ACCEPTANCE.md` (nghiệm thu).

## Plugin

Bản công khai này không kèm plugin thương mại nào. Plugin kết nối Hosso WIM (`@hosso/plugin-wim`) là mã nguồn đóng, phân phối riêng; cơ chế plugin (`HossoPlugin`) và cách gỡ/cài xem `docs/ARCHITECTURE.md` và `docs/PLUGIN-WIM.md`. Một số script trong repo (`check:order-flow`, trang mẫu thương mại) cần plugin này mới chạy trọn vẹn.
