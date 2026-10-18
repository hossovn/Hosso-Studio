# Bộ plugin bán hàng
**Tiếng Việt** | [English](en/PLUGIN-COMMERCE.md)

Web bán hàng độc lập (không cần WIM) được ghép từ các plugin nhỏ. **`shop` và `affiliate` là plugin mở** (repo này). **Các plugin còn lại là plugin thương mại, mã nguồn đóng, bán theo giấy phép** (xem mục 5); repo này chỉ chứa phần lõi để chúng gắn vào. Mỗi plugin chỉ làm một việc và nói chuyện với nhau qua **sự kiện của lõi** (xem mục 3), nên bật hoặc tắt từng cái tùy nhu cầu. Chọn plugin bật bằng `NEXT_PUBLIC_HOSSO_PLUGINS` (id cách nhau bằng dấu phẩy, lúc build) hoặc sửa `plugins` trong `apps/studio/hosso.config.ts`.

## 1. Các plugin

| Id | Giấy phép | Làm gì | Xem thêm |
|---|---|---|---|
| `shop` | Mở | Sản phẩm, danh mục, biến thể, tồn kho, giỏ hàng, đặt hàng, đơn hàng, đánh giá, CSV, in đơn | [PLUGIN-SHOP.md](PLUGIN-SHOP.md) |
| `promotions` | Thương mại | Mã giảm giá (phần trăm, số tiền, miễn phí ship), điều kiện đơn tối thiểu, hạn dùng, số lần dùng | Admin → Khuyến mãi |
| `shipping` | Thương mại | Phí ship ở bước thanh toán (cố định, miễn phí từ X đồng, hoặc theo GHN), vận đơn, tạo đơn GHN, tra cứu vận đơn | Admin → Giao vận |
| `payment` | Thương mại | Mã QR VietQR và tự xác nhận khi tiền về qua webhook SePay (hoặc xác nhận tay) | Admin → Thanh toán |
| `notify` | Thương mại | Email báo chủ shop có đơn mới, báo khách đặt hàng, đổi trạng thái, đã thanh toán | Admin → Thông báo |
| `affiliate` | Mở | Cộng tác viên tự đăng ký, link giới thiệu, hoa hồng theo đơn | Admin → Tiếp thị liên kết |
| `analytics` | Thương mại | Google Analytics 4 và Meta Pixel (xem sản phẩm, thêm vào giỏ, mua hàng) | Admin → Tiếp thị |
| `reports` | Thương mại | Trang báo cáo: doanh thu theo ngày, bán chạy, trạng thái đơn, hàng sắp hết | `/admin/shop-reports` |
| `accounts` | Thương mại | Tài khoản khách: đăng nhập, lịch sử đơn, địa chỉ đã lưu, tự điền khi thanh toán | Block "Tài khoản khách hàng" |

**Thứ tự trong `plugins` có ý nghĩa.** Hook `beforeOrder` chạy theo thứ tự này: đặt `shipping` TRƯỚC `promotions` để mã miễn phí ship thấy được phí ship. Thứ tự đang dùng: `shop, affiliate, shipping, promotions, payment, notify, analytics, reports, accounts`.

## 2. Biến môi trường

| Biến | Plugin | Ý nghĩa |
|---|---|---|
| `HOSSO_GHN_TOKEN`, `HOSSO_GHN_WEBHOOK_KEY` | shipping | Token API GHN; khóa cho webhook trạng thái |
| `HOSSO_SEPAY_KEY` | payment | Khóa API của webhook SePay (`Authorization: Apikey <khóa>`). Đăng ký URL `https://<site>/api/plugins/payment/sepay/webhook` với SePay |
| `HOSSO_SMTP_URL`, `HOSSO_MAIL_FROM` | notify | Gửi email (không có thì email chỉ ghi ra nhật ký) |

## 3. Sự kiện của lõi (cho người viết plugin)

Plugin khai báo trong `hooks` của đối tượng plugin (xem `packages/blocks/src/types.ts`):

- `beforeOrder({ draft })`: điều chỉnh đơn đang soạn bằng cách thêm vào `draft.adjustments` (số dương là phí, số âm là giảm giá); có thể từ chối bằng `{ reject: { code, message } }`. `draft.meta` mang dữ liệu thô từ trình duyệt (ví dụ `meta.voucher`, `meta.locale`).
- `onOrderPlaced(event)`: đơn đã lưu. Có thể trả `{ redirectUrl }` để chuyển khách sang cổng thanh toán.
- `onOrderStatusChanged(event)`: trạng thái đơn đổi.
- `onOrderPaid(event)`: plugin thanh toán báo đã nhận tiền; plugin bán hàng đánh dấu đơn đã thanh toán.
- `describeOrder(event)`: bổ sung thông tin hiển thị cho khách khi tra cứu đơn (mã QR chuyển khoản).
- `sitemap(payload)`: đường dẫn đưa vào `sitemap.xml`.

Lỗi trong một hook chỉ được ghi log, không làm hỏng đơn hàng (trừ `reject` có chủ đích). Plugin bán hàng phát sự kiện bằng `emitBeforeOrder`, `emitOrderPlaced`, `emitOrderStatusChanged`, `emitOrderPaid` từ `@hosso/studio-blocks`. Đăng nhập riêng cho khách (cộng tác viên, tài khoản khách) dùng `sessionOf(tên-cookie)` của lõi, tách khỏi người dùng admin.

Hợp đồng ngầm giữa `accounts` và `shop`: `accounts` lưu thông tin khách vào `localStorage` khóa `hs_customer` để `shop` tự điền khi thanh toán; `shop` phát sự kiện trình duyệt `hs:view_item`, `hs:add_to_cart`, `hs:purchase` cho `analytics`.

## 5. Giấy phép cho plugin thương mại

Plugin thương mại (`promotions`, `shipping`, `payment`, `notify`, `analytics`, `reports`, `accounts`) được cài vào bản build của khách riêng, kèm một **key giấy phép** đặt trong biến môi trường `HOSSO_LICENSE_KEY`.

- Key là chuỗi `HLK1.<payload>.<chữ ký>` ký Ed25519, kiểm tra offline bằng khóa công khai nằm trong `packages/blocks/src/license.ts`. Payload gồm khách (`tenant`), danh sách plugin (hoặc `*`), hạn dùng và (tùy chọn) tên miền.
- Production (hoặc `HOSSO_LICENSE_ENFORCE=1`) mà không có key hợp lệ: hook, endpoint (trả 402), loader của plugin bị vô hiệu; site và các plugin mở vẫn chạy. Chạy dev thì cho dùng thử.
- Admin → Quản lý plugin hiện tình trạng giấy phép; dashboard có bước "Giấy phép plugin ...".
- Muốn mua giấy phép hoặc plugin: liên hệ Hosso. Người viết plugin thương mại bọc plugin bằng `withLicense(plugin)` từ `@hosso/studio-blocks`.

## 4. Giới hạn đã biết

- Tồn kho, số lần dùng mã và giới hạn tần suất gửi đánh giá chưa nằm trong giao dịch/khóa DB (ghi chú `ponytail:` trong mã).
- Chưa có cổng thanh toán chuyển hướng (VNPay, MoMo); `payment` hiện hỗ trợ chuyển khoản tự xác nhận qua SePay.
- Phí GHN dựa trên địa chỉ nhập tay được so khớp với danh mục tỉnh/quận/phường của GHN; không nhận ra thì dùng phí cố định.
- CSV chưa hỗ trợ biến thể.
- Chưa thử với GHN và SePay thật (chỉ mock/ mô phỏng).
