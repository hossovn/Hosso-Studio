# Thiết Kế: Hệ Thống Web Studio Test Bán Chéo (Hosso Studio + WordPress WooCommerce)

**Ngày:** 30/10/2026  
**Trạng thái:** Chờ duyệt / Sẵn sàng lập kế hoạch thực thi  

---

## 1. Mục tiêu & Bối cảnh

- **Mục tiêu:** Dựng một website Hosso Studio độc lập (Web Test) để kiểm thử luồng bán chéo (Cross-Sell / Cross-Catalog) với 2 nguồn đối tác:
  1. **Web Hosso Studio chính:** Website TCAP đã triển khai (`thanhcuongauto.com` hoặc instance production trên Portainer).
  2. **Web WordPress:** Website WordPress bên ngoài đang quản lý sản phẩm qua WooCommerce REST API.
- **Mô hình bán chéo:** Chia sẻ danh mục & sản phẩm chéo (Cross-Catalog).
  - Khách mua hàng tại web nào sẽ thanh toán tại web đó.
  - Web hiển thị sản phẩm liên kết từ các web đối tác qua API.
  - Quản trị viên duyệt danh mục của đối tác và chọn sản phẩm đưa vào bán chéo với tỷ lệ chiết khấu (commission) thống nhất.
  - Khi có đơn hàng phát sinh, hệ thống tạo bản ghi chuyển đơn (Transfer Purchase Order) tới đối tác.

---

## 2. Kiến trúc & Thành phần

Hệ thống tận dụng gói plugin thương mại có sẵn trong codebase: `@hosso/plugin-cross-sell` (nằm tại `packages/plugin-cross-sell`), tích hợp vào lõi Hosso Studio.

```
┌─────────────────────────────────┐
│     WordPress + WooCommerce     │ (Nguồn ngoài)
│  - REST API /wp-json/wc/v3      │
│  - Consumer Key & Secret        │
└───────────────▲─────────────────┘
                │
                │ WooCommerce REST API
                ▼
┌─────────────────────────────────┐           Hosso Partner API          ┌─────────────────────────────────┐
│     Hosso Studio Test Site      │ ◄──────────────────────────────────► │     Hosso Studio Main (TCAP)    │
│  - Port: 3001 (Local) / Docker  │        (Shared Secret Token)         │  - Đã deploy Portainer          │
│  - DB: SQLite / Postgres test   │                                      │  - Cung cấp sản phẩm bán chéo   │
│  - Plugin Cross-Sell activated  │                                      │  - Nhận đơn đặt hàng đối tác    │
└─────────────────────────────────┘                                      └─────────────────────────────────┘
```

### 2.1. Plugin Cross-Sell (`@hosso/plugin-cross-sell`)
- **Quản lý Đối tác (`Partners`):**
  - Đối tác 1 (Hosso - TCAP): Kết nối qua HTTPS root URL + Shared Token bí mật (`HOSSO_CROSS_SELL_TCAP_TOKEN`).
  - Đối tác 2 (WooCommerce): Kết nối qua HTTPS root URL + Consumer Key (`HOSSO_CROSS_SELL_WP_KEY`) & Consumer Secret (`HOSSO_CROSS_SELL_WP_SECRET`).
- **Quản lý Danh mục & Sản phẩm (`Listings` & `Offers`):**
  - Duyệt danh mục sản phẩm từ đối tác từ xa (remote catalog).
  - Chọn sản phẩm để import vào danh sách bán chéo của Web Test kèm tỷ lệ hoa hồng (`commissionPct`).
  - Tạo quyền xuất sản phẩm nội bộ (`Offers`) cho phép web TCAP lấy sản phẩm từ Web Test nếu cần.
- **Xử lý Chuyển đơn (`Transfers`):**
  - Ghi nhận đơn hàng bán lẻ chứa sản phẩm đối tác.
  - Tạo đơn đặt hàng bán sỉ (purchase order) tương ứng sang nhà cung cấp (TCAP hoặc WooCommerce) mà không chia sẻ thông tin nhạy cảm của khách hàng cuối.

---

## 3. Kế hoạch Triển khai (Local & Portainer)

### 3.1. Kích hoạt Plugin trong Codebase
1. Khai báo dependency `@hosso/plugin-cross-sell: "workspace:*"` trong `apps/studio/package.json`.
2. Khai báo import và bổ sung plugin vào `plugins` trong `apps/studio/hosso.config.ts`.
3. Sinh lại Payload import map: `pnpm --filter @hosso/studio generate:importmap`.

### 3.2. Cấu hình Môi trường Web Test Chạy Local (Port 3001)
- Tạo profile / file cấu hình môi trường `.env.test` cho Web Test:
  - `PORT=3001`
  - `HOSSO_PUBLIC_URL=http://localhost:3001`
  - `HOSSO_DATABASE_URL=file:./data/studio-test.db` (SQLite độc lập)
  - `HOSSO_SECRET`: Chuỗi khóa ngẫu nhiên mới
  - `HOSSO_ADMIN_EMAIL=admin@test.local`, `HOSSO_ADMIN_PASSWORD=...`
  - `HOSSO_CROSS_SELL_TCAP_TOKEN`: Token dùng chung với TCAP
  - `HOSSO_CROSS_SELL_WP_KEY`: Consumer Key của WordPress WooCommerce
  - `HOSSO_CROSS_SELL_WP_SECRET`: Consumer Secret của WordPress WooCommerce
- Thêm script khởi chạy: `pnpm dev:test` (chạy trên port 3001, nạp `.env.test`).

### 3.3. Cấu hình Triển khai Lên Portainer
- Chuẩn bị thư mục cấu hình tenant trong `deploy/tenants/studio-test/`:
  - `stack.yml`: Cấu hình Docker Compose cho Portainer gồm 2 service:
    1. `postgres-test`: Database PostgreSQL 17 độc lập.
    2. `studio-test`: Image Studio (ghcr.io/hossovn/hosso-tcap hoặc image build riêng) nối với database trên, expose cổng tùy chọn (ví dụ 3001 hoặc qua Traefik / reverse proxy).
  - `stack.env.example`: Mẫu biến môi trường đầy đủ cho Portainer (bao gồm các biến `HOSSO_CROSS_SELL_*`).

---

## 4. Kịch bản Kiểm Thử (Verification & Testing)

1. **Khởi động Web Test:** Khởi chạy `pnpm dev:test` và truy cập `http://localhost:3001/admin`.
2. **Kiểm tra Giao diện Admin Cross-Sell:** Xác nhận xuất hiện nhóm menu **Bán chéo đối tác** (`Nguồn bán chéo`, `Cross-sell partners`, `Cross-sell listings`, `Partner product permissions`, `Cross-sell transfers`).
3. **Cấu hình Đối tác WooCommerce:**
   - Tạo bản ghi Partner loại `WooCommerce`.
   - Nhập URL trang WordPress và tên biến môi trường credentials.
   - Thử tải danh mục sản phẩm từ WooCommerce và import 1 sản phẩm mẫu.
4. **Cấu hình Đối tác Hosso (TCAP):**
   - Tạo bản ghi Partner loại `Hosso Studio`.
   - Kết nối với web TCAP qua token bí mật.
5. **Kiểm tra đặt hàng & Chuyển đơn (Transfer):** Thử đặt hàng sản phẩm bán chéo và kiểm tra bản ghi trong bảng `Transfers`.
