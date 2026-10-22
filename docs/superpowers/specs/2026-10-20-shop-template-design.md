# Template web bán hàng dựng bằng kéo thả

## Mục tiêu
Thay giao diện bán hàng cố định (`theme-shop`) bằng một **mẫu site bán phụ tùng ô tô, bố cục giống thanhcuongauto.com** (đen và cam).
Mọi thứ người dùng thấy (header, footer, trang chủ, các trang phụ) là nội dung dựng bằng trình kéo thả Canvas, nên sửa được trong editor.

## Không làm
- Không đụng editor, admin, `plugin-shop`.
- Không tạo theme code mới. Dùng `theme-auto` làm nền (font Chakra Petch, token đen cam); header và footer của theme bị thay bằng vùng `siteHeader` và `siteFooter`.
- Không sao chép chữ, logo, ảnh của site tham chiếu. Nội dung là mẫu tự viết, ảnh là SVG sinh bằng script.

## Thiết kế
- **Gói site** `seed/sites/shop-template.hosso-site.zip` (định dạng 2). Trang Công cụ trong admin liệt kê và cài một lệnh từ thư mục này; hoặc `pnpm studio:import`.
- **Script sinh gói** `scripts/build-shop-template.mjs`: toàn bộ nội dung nằm trong script.
- **Header** (`siteHeader`): thanh thông báo cam, thanh đen có logo chữ, menu (mục đang chọn màu cam, gạch chân) và nút tìm kiếm, thanh cam có nút "Danh mục sản phẩm" và 4 cam kết có icon.
- **Footer** (`siteFooter`): nền tối, cột chính sách và hỗ trợ, cột liên hệ có icon, dòng bản quyền.
- **Trang chủ**: Slider 3 banner, lưới 12 danh mục (6 cột, mỗi ô ảnh và nhãn, bấm vào lọc danh mục), "Sản phẩm hot" và "Sản phẩm bán chạy" (block `ShopProductGrid` 5 cột), "Về chúng tôi" (ảnh và 3 mục).
- **Trang khác**: `san-pham`, `chi-tiet`, `gio-hang`, `thanh-toan`, `trang-thai-don` (banner Canvas cộng block `Shop*`), `gioi-thieu`, `lien-he` (bản đồ và form), `chinh-sach-doi-tra`, `van-chuyen`.
- **Dữ liệu mẫu**: 12 danh mục, 12 sản phẩm (giá, giá khuyến mãi, tồn kho, hãng xe tương thích), 28 ảnh SVG.
- **Gỡ `theme-shop`**: xoá `packages/theme-shop`, bỏ import và mục trong `themes` ở `apps/studio/hosso.config.ts`, bỏ phụ thuộc ở `apps/studio/package.json`, cập nhật lockfile, sửa comment và 2 bảng trong `THEME-GUIDE`.
- **Sửa lỗi gặp trên đường**: `FreeCountdown`, `FreeTabs`, `FreeTable`, `FreeBreadcrumb`, `FreeFoldMenu` (client component) nhận hàm `u` từ server component làm trang công khai lỗi 500. Đổi sang truyền số `unit` và tạo `u` bên trong.

## Kiểm tra
1. Chạy script, tạo zip hợp lệ.
2. Cài vào DB thử riêng (`HOSSO_DATABASE_URL=file:./data/tpl-test.db`), không lỗi trong log.
3. Mọi trang trả 200; trang chủ hiển thị đúng; sửa một phần tử trong editor rồi lưu nháp ghi được vào DB.
4. `pnpm typecheck`, `pnpm check:boundaries`, `pnpm check:manifests` qua.

## Cập nhật: bản sao thanhcuongauto.com (v3)
Theo yêu cầu "clone y chang, dùng kéo thả, không dùng code", template là bản sao bố cục và nội dung của thanhcuongauto.com:
- Ảnh (logo, 4 banner, 19 danh mục, 20 sản phẩm) và catalog lấy một lần bằng `scripts/fetch-shop-template-assets.mjs` vào `seed/template-assets/shop/` (ảnh danh mục lấy bản 300x300 cho nhẹ). `build-shop-template.mjs` chỉ đọc thư mục này.
- Dữ liệu bán hàng là của plugin Cửa hàng (`shop-catalog`), không dùng WIM; WIM chỉ còn trong bản `tcap.hosso-site.zip`. Site gốc ẩn giá nên sản phẩm đặt `priceDisplay: hide`, cài đặt cửa hàng `showPrices: false` (hiện "Liên hệ để biết giá").
- Header: dải "Ship COD", thanh đen có logo ảnh và menu (mục đang chọn màu cam), thanh trắng có nút "Danh mục sản phẩm" và 4 cam kết. Footer: 3 cột (giới thiệu pháp lý, 5 liên kết chính sách, liên hệ) và khối "Đăng kí nhận tin" ở vùng `beforeFooter`.
- Trang chủ: Slider, 19 ô danh mục, "Sản phẩm hot", banner, "Sản phẩm bán chạy", "Về chúng tôi" (4 thẻ). 5 trang chính sách lấy nguyên văn từ gói tcap.
- Menu thả xuống: phần tử menu của Canvas nhận `children` (hiện khi rê chuột hoặc focus); trong inspector gõ dòng bắt đầu bằng `- ` để làm mục con. Header dùng 3 menu thả xuống (hãng xe, danh mục, thông tin) và nút "Danh mục sản phẩm".
- Nút liên hệ nổi (gọi, Zalo, email) do `ContactFloat` vẽ từ Cài đặt site khi site dùng footer tự dựng; Fanpage là phần tử `embed` (Facebook Page Plugin) ở footer.
