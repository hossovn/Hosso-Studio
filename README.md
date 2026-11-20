# Hosso Studio

**Tiếng Việt** | [English](README.en.md)

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

Admin và trình dựng song ngữ Việt / Anh (đổi ngôn ngữ trong tài khoản Payload).

Tài liệu (tiếng Việt; bản tiếng Anh trong `docs/en/`): `docs/INSTALL.md` (cài đặt, WIM, Docker, export/import), `docs/ADMIN-LOGIN.md` (đăng nhập quản trị), `docs/ARCHITECTURE.md`, `docs/THEME-GUIDE.md` (tạo theme), `docs/PLUGIN-GUIDE.md` (tạo block và plugin), `docs/LICENSES.md`.

## Plugin

Bản cài đặt đăng ký plugin trong `apps/studio/hosso.config.ts`; các plugin thương mại cần giấy phép hợp lệ khi chạy production. Plugin private được phân phối riêng và đăng ký bằng `scripts/prepare-installed-plugins.mjs`; source `plugin-cross-sell` không nằm trong image công khai. Xem [kiến trúc](docs/ARCHITECTURE.md) và [commerce](docs/PLUGIN-COMMERCE.md).

## Landing, CMS và cửa hàng

Thư viện `seed/sites` gồm năm bộ landing theo mục tiêu và một bộ cửa hàng 13 trang. Nhập từ quản trị → Bộ website để tạo **23 trang nháp** khi dùng cả sáu bộ; điền nội dung, catalog và chính sách của doanh nghiệp trước khi xuất bản. Các bộ mẫu không chứa sản phẩm hoặc đánh giá khách hàng giả.

Nền tảng hỗ trợ CMS tùy chỉnh với binding và trang chi tiết, lead inbox có hàng đợi gửi lại, consent/UTM và A/B, gallery sản phẩm, giỏ tài khoản, checkout và portal đổi trả. Mở `/admin/readiness` để xem phần cấu hình còn thiếu.

- [Triển khai, backup, migration và giới hạn tích hợp](docs/studio-platform-operations.md)
- [Tiến độ và bằng chứng kiểm chứng](docs/studio-platform-progress.md)

Kiểm tra local bằng `pnpm typecheck`, `pnpm test:platform`, `pnpm test:platform-browser` và `pnpm test:platform-production`; browser cần `pnpm exec playwright install chromium`. Fixture dùng database riêng. SMTP, GHN, SePay/WIM cần nghiệm thu thêm trên môi trường tích hợp thật.
