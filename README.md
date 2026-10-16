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

Kế hoạch và tiến độ: `docs/PLAN.md`. Giấy phép thư viện: `docs/LICENSES.md`.
