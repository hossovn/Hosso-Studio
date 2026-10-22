# Plugin Cửa hàng (`@hosso/plugin-shop`)
**Tiếng Việt** | [English](en/PLUGIN-SHOP.md)

Web bán hàng chạy độc lập, không cần WIM. Dùng khi khách muốn tự quản lý sản phẩm ngay trong Studio. Có thể bật cùng WIM nhưng thường chỉ chọn một (hai plugin cùng chèn liên kết giỏ hàng lên header).

## Dữ liệu (Admin → Cửa hàng)

- **Danh mục sản phẩm**: tên, đường dẫn (tự tạo), danh mục cha, ảnh, thứ tự.
- **Sản phẩm**: tên, mã (SKU), giá, giá khuyến mãi, tồn kho, thương hiệu, hãng xe tương thích (`makes`, viết thường không dấu), ảnh, mô tả, đang bán.
- **Đơn hàng**: chỉ tạo qua trang thanh toán; admin xem và đổi trạng thái (Mới, Đã xác nhận, Đang giao, Hoàn tất, Đã hủy). Hủy đơn hoàn lại tồn kho một lần.
- **Cài đặt cửa hàng**: thông tin chuyển khoản (để trống thì chỉ có COD).
- **Nhập/xuất CSV** (`/admin/shop-import`): cột `code, name, category, brand, price, salePrice, stock, makes, description, image, active`. Cập nhật theo `code`, chưa có thì tạo; danh mục chưa có được tạo; `image` là tên tệp đã có trong Media; `makes` cách nhau bằng `;`.

## Block (trình dựng)

`ShopProductGrid` (lọc theo `?q=`, `?category=`, `?make=`, `?brand=`, phân trang khi bật "Hiện phân trang và bộ lọc từ URL"), `ShopProductDetail` (`?p=<đường dẫn sản phẩm>`), `ShopCategories` (tự lấy từ danh mục), `ShopCart`, `ShopCheckout`, `ShopOrderStatus`. Trang mẫu: `/san-pham`, `/chi-tiet`, `/gio-hang`, `/thanh-toan`, `/trang-thai-don`.

## Đặt hàng

Giỏ hàng lưu ở trình duyệt. Máy chủ lấy giá và kiểm tra tồn kho lúc đặt (không tin giá từ trình duyệt), trừ tồn kho, tạo đơn `SO-000001`, rồi phát sự kiện `onOrderPlaced` nên plugin Tiếp thị liên kết và Giao vận hoạt động ngay. Thử lại cùng giỏ không tạo đơn thứ hai.

Giới hạn: tồn kho không nằm trong một giao dịch DB (hai đơn cùng lúc cho món cuối có thể cùng qua); chưa có phí ship, mã giảm giá, thanh toán online.

Postgres: sau khi thêm plugin, sinh migration `HOSSO_DATABASE_URL=postgres://... pnpm --filter @hosso/studio payload migrate:create shop`.
