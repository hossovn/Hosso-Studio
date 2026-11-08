# Hướng Dẫn Kiểm Thử Bán Chéo (Cross-Sell): Hosso Studio ↔ WordPress ↔ Web Chính TCAP

Tài liệu này hướng dẫn chi tiết cách chạy Web Test, cấu hình kết nối bán chéo với web WordPress WooCommerce và web chính TCAP, cũng như cách triển khai lên Portainer.

---

## 1. Khởi động Web Test trên máy Local

Web Test được cấu hình chạy trên cổng độc lập `3001` với cơ sở dữ liệu SQLite riêng biệt (`data/studio-test.db`), không ảnh hưởng tới dữ liệu hay cấu hình của web chính.

Chạy lệnh sau tại thư mục gốc của dự án:
```bash
pnpm dev:test
```

- **Giao diện trang chủ Web Test:** `http://localhost:3001`
- **Giao diện quản trị Admin:** `http://localhost:3001/admin`
  - **Email đăng nhập:** `admin@test.local`
  - **Mật khẩu đăng nhập:** `admin123456`

---

## 2. Kết nối Bán chéo với WordPress (WooCommerce)

Plugin `@hosso/plugin-cross-sell` kết nối trực tiếp với WooCommerce REST API v3 để đọc danh mục sản phẩm, giá, tồn kho và chuyển đơn hàng mua sỉ.

### Bước 2.1: Lấy API Key từ WordPress
1. Đăng nhập vào trang quản trị WordPress của bạn.
2. Vào **WooCommerce** → **Cài đặt (Settings)** → tab **Nâng cao (Advanced)** → chọn mục **REST API**.
3. Bấm **Thêm khóa (Add key)**:
   - **Mô tả:** `Hosso Studio Cross-sell`
   - **Người dùng:** Chọn tài khoản Admin
   - **Quyền hạn (Permissions):** Chọn **Đọc/Ghi (Read/Write)**
4. Sao chép 2 giá trị được cấp:
   - **Khóa người dùng (Consumer key):** có dạng `ck_...`
   - **Mật khẩu người dùng (Consumer secret):** có dạng `cs_...`

### Bước 2.2: Điền khóa vào biến môi trường Web Test
Mở file `apps/studio/.env.test` và điền:
```env
HOSSO_CROSS_SELL_WP_KEY=ck_dien_consumer_key_cua_ban_o_day
HOSSO_CROSS_SELL_WP_SECRET=cs_dien_consumer_secret_cua_ban_o_day
```
*(Nếu server đang chạy, hãy khởi động lại lệnh `pnpm dev:test` để nhận biến môi trường mới)*.

### Bước 2.3: Thêm đối tác WordPress trong Admin Hosso Studio
1. Truy cập `http://localhost:3001/admin`.
2. Trong menu bên trái, tìm nhóm **Bán chéo đối tác** → chọn **Cross-sell partners** → bấm **Tạo mới (Create New)**:
   - **Name:** Điền tên gợi nhớ (ví dụ: `Kho WordPress Đối Tác`)
   - **Kind:** Chọn **WooCommerce**
   - **Api url:** Điền địa chỉ website WordPress của bạn (ví dụ: `https://your-wordpress-site.com`, không cần đuôi `/wp-json`)
   - **Phương thức nhập khóa (Authentication method):** Chọn **Nhập trực tiếp trên Dashboard (Tiện lợi)**
   - **WooCommerce Consumer Key:** Dán trực tiếp key `ck_...` vừa tạo ở bước trên vào đây
   - **WooCommerce Consumer Secret:** Dán trực tiếp secret `cs_...` vừa tạo ở bước trên vào đây
   - *(Hoặc nếu muốn dùng file .env, chọn "Đọc từ biến môi trường .env" rồi điền tên biến)*
   - **Commission pct (%):** Tỷ lệ hoa hồng thỏa thuận (ví dụ: `15`)
   - **Our business name:** Tên doanh nghiệp của bạn (ví dụ: `Hosso Test Shop`)
   - **Our business phone:** Số điện thoại liên hệ (ví dụ: `0901234567`)
   - **Active:** Tích chọn **Bật (Active)**
3. Bấm **Lưu (Save)**.

### Bước 2.4: Duyệt và Import sản phẩm từ WordPress
1. Vào mục **Cross-sell listings** trong Admin hoặc truy cập dashboard đối tác.
2. Hệ thống sẽ kết nối qua API WooCommerce và hiển thị danh mục sản phẩm từ web WordPress của bạn.
3. Chọn các sản phẩm mong muốn và bấm **Import**:
   - Sản phẩm sẽ được đưa vào danh mục bán hàng của Web Test với giá bán lẻ và giá nhập tương ứng.
   - Khách hàng trên Web Test có thể đặt mua sản phẩm này như bình thường!

---

## 3. Mạng lưới Bán chéo Ngang hàng (P2P) giữa MỌI Web Hosso Studio

Mọi website dựng từ Hosso Studio (không chỉ riêng TCAP) đều có thể kết nối bán chéo cho nhau bằng token xuất/nhập. Mỗi cặp website nên cấp một token cho từng chiều (tối thiểu 32 ký tự): token xuất của Web A là token nhập trên Web B, và ngược lại.

### Bước 3.1: Cấp token cho từng chiều
Ví dụ, Web A cấp token xuất riêng cho Web B:
```text
hosso_a_export_to_b_1234567890_abcdef
```

### Bước 3.2: Thêm đối tác trên Dashboard của từng Web
Trên Web A (ví dụ: Web Test `http://localhost:3001/admin`):
1. Vào **Cross-sell partners** → **Tạo mới**:
   - **Name:** Tên gợi nhớ của Web đối tác (ví dụ: `Cửa hàng Ô tô B` hoặc `TCAP Main Site`)
   - **Kind:** Chọn **Hosso Studio (Shop / WIM)**
   - **Api url:** Điền URL của Web B (ví dụ: `https://web-b.com` hoặc `http://localhost:3000`)
   - **Phương thức nhập khóa:** Chọn **Nhập trực tiếp trên Dashboard (Tiện lợi)**
   - **Token nhập hàng:** Dán token xuất do Web B cấp
   - **Our business name & phone:** Thông tin doanh nghiệp của bạn
   - **Active:** Tích chọn **Active**
2. Bấm **Lưu**.

Trên Web B (Web đối tác), tạo hồ sơ trỏ về URL của Web A và dán **token xuất của Web A** vào phần xác thực chiều nhập. Nếu bật chiều xuất trên Web B, cấp token xuất riêng của Web B và gửi cho quản trị Web A.

### Bước 3.3: Cho phép xuất sản phẩm (Offers) và Bán hàng
- Web nào muốn cho web kia bán sản phẩm của mình thì vào mục **Partner product permissions (Offers)** → Chọn sản phẩm → Chọn đối tác được phép bán → Bật **Active**.
- Web bán lẻ chỉ cần vào **Cross-sell listings** → bấm Import các sản phẩm đã được đối tác cấp quyền về cửa hàng của mình!

---

## 4. Kiểm thử Luồng Đặt hàng & Chuyển đơn (Transfers)

1. Mở trang chủ Web Test (`http://localhost:3001`), tìm đến sản phẩm vừa import từ WordPress hoặc TCAP.
2. Thêm vào giỏ hàng và tiến hành đặt hàng (Checkout).
3. Sau khi đặt hàng thành công:
   - Vào Admin Web Test → **Cross-sell transfers**: bạn sẽ thấy một bản ghi chuyển đơn tương ứng.
   - Bản ghi ghi nhận trạng thái: Đã gửi đơn đặt hàng sỉ sang WordPress / TCAP thành công, kèm mã đơn hàng nhà cung cấp.

---

## 4A. Cấu hình cặp website đang chạy thật

Để bán chéo hai chiều giữa `https://thanhtrung.hosso.vn` và `https://tcap-web.hosso.vn`, tạo một hồ sơ đối tác trên **mỗi** website. Mỗi chiều dùng một token riêng; không đặt token trong URL.

Trước khi tạo hồ sơ, cả hai deployment phải có `HOSSO_LICENSE_KEY` hợp lệ cho plugin cross-sell. Nếu dashboard báo **Plugin chưa có giấy phép hợp lệ**, catalog và chuyển đơn sẽ bị khóa.

### Trên `thanhtrung.hosso.vn`

1. Mở **Bán chéo đối tác → Đối tác → Tạo mới**.
2. Chọn **Hosso Studio (Shop / WIM)**, URL đối tác `https://tcap-web.hosso.vn`.
3. Bật **Nhập hàng** để bán sản phẩm của TCAP. Dán **export token do TCAP cấp** vào phần xác thực chiều nhập.
4. Nếu muốn TCAP bán sản phẩm của Thanh Trung, bật **Xuất hàng**, tạo một export token riêng của Thanh Trung và gửi token đó cho quản trị TCAP.
5. Nhập tên doanh nghiệp và số điện thoại nhận đơn, bật **Active**, rồi lưu.

### Trên `tcap-web.hosso.vn`

1. Tạo hồ sơ Hosso tương tự, URL đối tác `https://thanhtrung.hosso.vn`.
2. Bật **Nhập hàng**, dùng export token do Thanh Trung cấp.
3. Bật **Xuất hàng**, cấp một export token riêng của TCAP nếu muốn Thanh Trung bán hàng TCAP.
4. Lưu hồ sơ, sau đó vào **Quyền bán sản phẩm (Offers)** để chọn từng sản phẩm và bật **Active**.

Sau khi hai hồ sơ hoạt động, website bán lẻ vào dashboard **Bán chéo đối tác**, tải danh mục và bấm **Nhập / đồng bộ sản phẩm**. Chỉ sản phẩm có Offer đang bật mới xuất hiện ở website đối tác. Trước đơn thật, kiểm tra một sản phẩm ở mỗi chiều, tạo đơn thử giá trị nhỏ, xác nhận bản ghi **Cross-sell transfers**, rồi thống nhất quy trình lấy hàng, COD, đổi trả và đối soát hoa hồng.

---

## 5. Triển khai Web Test lên Portainer

Sau khi test local mượt mà, bạn có thể đưa Web Test lên Portainer chạy song song với web chính:

1. Đăng nhập vào **Portainer**.
2. Vào **Stacks** → bấm **Add stack**:
   - **Name:** `studio-test`
   - **Build method:** Web editor
   - Sao chép toàn bộ nội dung từ file [stack.yml](file:///deploy/tenants/studio-test/stack.yml) dán vào ô soạn thảo.
3. Kéo xuống mục **Environment variables**:
   - Điền các biến theo mẫu trong [stack.env.example](file:///deploy/tenants/studio-test/stack.env.example):
     - `HOSSO_IMAGE`: Image bạn đã build (ví dụ `ghcr.io/hossovn/hosso-tcap:latest`)
     - `POSTGRES_PASSWORD`: Mật khẩu sinh ngẫu nhiên
     - `HOSSO_SECRET`: Khóa bí mật sinh ngẫu nhiên
     - `HOSSO_ENCRYPTION_KEY`: Chuỗi hex 64 ký tự
     - `HOSSO_PUBLIC_URL`: Tên miền của web test (ví dụ `https://test.thanhcuongauto.com`)
     - `HOSSO_PORT`: Cổng bạn muốn mở (mặc định `3001`)
     - `HOSSO_CROSS_SELL_TCAP_TOKEN`: Khóa token chung với TCAP
     - `HOSSO_CROSS_SELL_WP_KEY`: Consumer key WooCommerce
     - `HOSSO_CROSS_SELL_WP_SECRET`: Consumer secret WooCommerce
4. Bấm **Deploy the stack**.
