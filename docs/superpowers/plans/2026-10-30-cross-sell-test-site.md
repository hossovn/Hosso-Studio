# Kế Hoạch Thực Thi: Dựng Web Studio Test Bán Chéo (Hosso Studio + WordPress WooCommerce)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng một website Hosso Studio test hoàn chỉnh (chạy local port 3001 và sẵn sàng deploy Portainer) kích hoạt sẵn plugin `@hosso/plugin-cross-sell` để kiểm thử bán chéo với web chính TCAP và web WordPress WooCommerce.

**Architecture:** Sử dụng kiến trúc plugin có sẵn của Hosso Studio (`@hosso/plugin-cross-sell`), cấu hình môi trường độc lập (database SQLite/Postgres riêng, port riêng 3001) và tạo stack Docker Compose cho Portainer.

**Tech Stack:** Next.js 15/16, Payload CMS 3.91, TypeScript, SQLite/PostgreSQL 17, Docker Compose, WooCommerce REST API v3.

## Global Constraints

- Không xóa hoặc ghi đè dữ liệu của web chính đã deploy hay database chính (`apps/studio/.env`, `data/studio.db`).
- Web test phải dùng cổng riêng (3001) và database riêng (`data/studio-test.db`).
- Khóa bí mật và token đối tác phải được đặt trong biến môi trường theo quy tắc `HOSSO_CROSS_SELL_*`.

---

### Task 1: Kích hoạt `@hosso/plugin-cross-sell` trong Hosso Studio

**Files:**
- Modify: `apps/studio/package.json`
- Modify: `apps/studio/hosso.config.ts`

**Interfaces:**
- Consumes: `@hosso/plugin-cross-sell` từ `packages/plugin-cross-sell`
- Produces: Import map mới của Payload chứa các collection/globals của Cross-sell (`cross-sell-partners`, `cross-sell-listings`, `cross-sell-offers`, `cross-sell-transfers`, `cross-sell-settings`)

- [ ] **Step 1: Khai báo dependency `@hosso/plugin-cross-sell`**

Thêm `"@hosso/plugin-cross-sell": "workspace:*"` vào `dependencies` trong `apps/studio/package.json`.

- [ ] **Step 2: Đăng ký plugin trong `apps/studio/hosso.config.ts`**

Import `crossSell from '@hosso/plugin-cross-sell'` và thêm vào mảng `plugins` trong `defineHossoConfig`.

- [ ] **Step 3: Chạy generate:importmap và kiểm tra typecheck**

Chạy:
```bash
pnpm --filter @hosso/studio generate:importmap
```
Expected: Lệnh chạy thành công, import map được cập nhật.

- [ ] **Step 4: Chạy test kiểm thử của plugin-cross-sell**

Chạy:
```bash
node --test packages/plugin-cross-sell/test/cross-sell.test.mjs
```
Expected: PASS các test case cross-sell.

- [ ] **Step 5: Commit**

```bash
git add apps/studio/package.json apps/studio/hosso.config.ts
git commit -m "feat(studio): activate @hosso/plugin-cross-sell in hosso.config"
```

---

### Task 2: Cấu hình Môi Trường Web Test Chạy Local (Port 3001)

**Files:**
- Create: `apps/studio/.env.test`
- Modify: `package.json` (root)
- Modify: `apps/studio/package.json`

**Interfaces:**
- Consumes: Next.js dev server, SQLite db driver
- Produces: Script `pnpm dev:test` khởi chạy web test tại `http://localhost:3001`

- [ ] **Step 1: Tạo file cấu hình `apps/studio/.env.test`**

Tạo file `apps/studio/.env.test` với các giá trị:
- `PORT=3001`
- `HOSSO_DATABASE_URL=file:./data/studio-test.db`
- `HOSSO_SECRET=9f8c4be36e3a040d8d4a1084b2a4aad2909d6c4a2ca411b8d2f9008ab462758a`
- `HOSSO_ENCRYPTION_KEY=4cfa61b3d78a79d3a706dc2fe5291b02c54d965649faf948844480e6a96b7711`
- `HOSSO_PUBLIC_URL=http://localhost:3001`
- `HOSSO_ADMIN_EMAIL=admin@test.local`
- `HOSSO_ADMIN_PASSWORD=admin123456`
- `HOSSO_SEED=true`
- `HOSSO_CROSS_SELL_TCAP_TOKEN=tcap_shared_cross_sell_secret_key_2026`
- `HOSSO_CROSS_SELL_WP_KEY=ck_mock_wordpress_key`
- `HOSSO_CROSS_SELL_WP_SECRET=cs_mock_wordpress_secret`

- [ ] **Step 2: Thêm script `dev:test` trong `apps/studio/package.json` và root `package.json`**

Thêm:
`"dev:test": "dotenv -e .env.test -- cross-env PORT=3001 next dev -p 3001"` (hoặc dùng cross-env nạp env file phù hợp với pnpm script).

- [ ] **Step 3: Chạy thử nghiệm web test khởi động**

Chạy thử `pnpm dev:test` và kiểm tra web test phản hồi HTTP 200 tại `http://localhost:3001`.

- [ ] **Step 4: Commit**

```bash
git add apps/studio/.env.test.example package.json apps/studio/package.json
git commit -m "feat: add local dev:test environment for cross-sell testing"
```

---

### Task 3: Chuẩn Bị Cấu Hình Triển Khai Portainer Cho Web Test

**Files:**
- Create: `deploy/tenants/studio-test/stack.yml`
- Create: `deploy/tenants/studio-test/stack.env.example`

**Interfaces:**
- Consumes: Image `ghcr.io/hossovn/hosso-tcap:latest` (hoặc image Studio build), Docker Compose
- Produces: Bản khai báo Portainer Stack hoàn chỉnh sẵn sàng nạp biến và deploy

- [ ] **Step 1: Tạo `deploy/tenants/studio-test/stack.yml`**

Khai báo 2 services:
- `postgres-test` (PostgreSQL 17 Alpine)
- `studio-test` (cổng 3001, nối DB `postgres-test`, cấu hình biến môi trường)

- [ ] **Step 2: Tạo `deploy/tenants/studio-test/stack.env.example`**

Mẫu biến môi trường đầy đủ: URL, Admin, Secret, và các biến đối tác bán chéo `HOSSO_CROSS_SELL_*`.

- [ ] **Step 3: Kiểm tra tính hợp lệ của stack yaml**

Kiểm tra cú pháp cấu trúc compose yaml.

- [ ] **Step 4: Commit**

```bash
git add deploy/tenants/studio-test/
git commit -m "feat(deploy): add Portainer stack configuration for studio-test"
```

---

### Task 4: Hướng Dẫn Vận Hành & Kịch Bản Kiểm Thử Kết Nối (TCAP & WordPress)

**Files:**
- Create: `docs/CROSS-SELL-TEST-GUIDE.md`

- [ ] **Step 1: Viết tài liệu hướng dẫn từng bước**
Chi tiết cách cấu hình:
1. Cách khởi động web test local.
2. Cách thiết lập kết nối WordPress WooCommerce (Consumer Key/Secret).
3. Cách thiết lập kết nối Web chính TCAP (Shared Token).
4. Cách duyệt danh mục sản phẩm đối tác, import sản phẩm, và kiểm thử đặt hàng.
5. Cách deploy lên Portainer bằng stack đã tạo.

- [ ] **Step 2: Commit và hoàn tất**

```bash
git add docs/CROSS-SELL-TEST-GUIDE.md
git commit -m "docs: add comprehensive cross-sell test guide"
```
