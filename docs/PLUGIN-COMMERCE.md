# Bộ plugin bán hàng
**Tiếng Việt** | [English](en/PLUGIN-COMMERCE.md)

Web bán hàng độc lập (không cần WIM) được ghép từ các plugin nhỏ. **`shop` và `affiliate` là plugin mở**. **Các plugin còn lại là plugin thương mại, mã nguồn đóng, bán theo giấy phép** (xem mục 4). Package có mặt trong bản cài đặt phụ thuộc kênh phân phối; `cross-sell` được cài riêng và không nằm trong image công khai. Mỗi plugin nói chuyện với nhau qua **sự kiện của lõi** (xem mục 3), nên bật hoặc tắt từng cái tùy nhu cầu. Chọn plugin bật bằng `NEXT_PUBLIC_HOSSO_PLUGINS` (id cách nhau bằng dấu phẩy, lúc build) hoặc sửa `plugins` trong `apps/studio/hosso.config.ts`.

## 1. Các plugin

| Id | Giấy phép | Làm gì | Xem thêm |
|---|---|---|---|
| `shop` | Mở | Sản phẩm, danh mục, biến thể, tồn kho, giỏ hàng, đặt hàng, đơn hàng, đánh giá, CSV, in đơn | [PLUGIN-SHOP.md](PLUGIN-SHOP.md) |
| `promotions` | Thương mại | Mã giảm giá (phần trăm, số tiền, miễn phí ship), điều kiện đơn tối thiểu, hạn dùng, số lần dùng | Admin → Khuyến mãi |
| `shipping` | Thương mại | Phí ship ở bước thanh toán (cố định, miễn phí từ X đồng, hoặc theo GHN), vận đơn, tạo đơn GHN, tra cứu vận đơn | Admin → Giao vận |
| `payment` | Thương mại | Mã QR VietQR và tự xác nhận khi tiền về qua webhook SePay (hoặc xác nhận tay) | Admin → Thanh toán |
| `notify` | Thương mại | Email báo chủ shop có đơn mới, báo khách đặt hàng, đổi trạng thái, đã thanh toán | Admin → Thông báo |
| `affiliate` | Mở | Cộng tác viên tự đăng ký, link giới thiệu, hoa hồng theo đơn | Admin → Tiếp thị liên kết |
| `analytics` | Thương mại | Consent, phễu/UTM, A/B, GA4/Meta Pixel và conversion xác nhận phía server | `/admin/analytics` |
| `reports` | Thương mại | Trang báo cáo: doanh thu theo ngày, bán chạy, trạng thái đơn, hàng sắp hết | `/admin/shop-reports` |
| `accounts` | Thương mại | Tài khoản khách: đăng nhập, lịch sử đơn, địa chỉ đã lưu, tự điền khi thanh toán | Block "Tài khoản khách hàng" |

**Thứ tự trong `plugins` có ý nghĩa.** Hook `beforeOrder` chạy theo thứ tự này: đặt `shipping` TRƯỚC `promotions` để mã miễn phí ship thấy được phí ship. Thứ tự đang dùng: `shop, affiliate, shipping, promotions, payment, notify, analytics, reports, accounts`.

## 2. Biến môi trường

| Biến | Plugin | Ý nghĩa |
|---|---|---|
| `HOSSO_GHN_TOKEN`, `HOSSO_GHN_WEBHOOK_KEY` | shipping | Token API GHN; khóa cho webhook trạng thái |
| `HOSSO_SEPAY_KEY` | payment | Khóa API của webhook SePay (`Authorization: Apikey <khóa>`). Đăng ký URL `https://<site>/api/plugins/payment/sepay/webhook` với SePay |
| `HOSSO_SMTP_URL`, `HOSSO_MAIL_FROM` | notify | Gửi email qua queue; thiếu SMTP làm job lỗi để xử lý/gửi lại |
| `HOSSO_PRIVATE_DIR`, `HOSSO_RETURN_EVIDENCE_DAYS` | shop | Nơi lưu bằng chứng đổi trả và thời hạn giữ hồ sơ đóng/từ chối |

## 3. Sự kiện của lõi (cho người viết plugin)

Plugin khai báo trong `hooks` của đối tượng plugin (xem `packages/blocks/src/types.ts`):

- `beforeOrder({ draft })`: điều chỉnh đơn đang soạn bằng cách thêm vào `draft.adjustments` (số dương là phí, số âm là giảm giá); có thể từ chối bằng `{ reject: { code, message } }`. `draft.meta` mang dữ liệu thô từ trình duyệt (ví dụ `meta.voucher`, `meta.locale`).
- `onOrderPlaced(event)`: đơn đã lưu. Có thể trả `{ redirectUrl }` để chuyển khách sang cổng thanh toán.
- `onOrderStatusChanged(event)`: trạng thái đơn đổi.
- `onOrderPaid(event)`: plugin thanh toán báo đã nhận tiền; plugin bán hàng đánh dấu đơn đã thanh toán.
- `describeOrder(event)`: bổ sung thông tin hiển thị cho khách khi tra cứu đơn (mã QR chuyển khoản).
- `sitemap(payload)`: đường dẫn đưa vào `sitemap.xml`.

`beforeOrder` chạy trước khi chấp nhận đơn; `onOrderReceived` lưu intent cùng transaction. Các sự kiện thay đổi trạng thái/thanh toán dùng commerce outbox với lease, retry và idempotency; worker báo lỗi còn tồn tại để quản trị xử lý. Không coi ghi log là đã gửi email hoặc đã giao hàng. Đăng nhập khách dùng `sessionOf(tên-cookie)`, tách khỏi người dùng admin.

`accounts` lưu thông tin tự điền vào `hs_customer`, thông báo thay đổi phiên qua event/storage. `shop` đồng bộ giỏ theo identity đã xác minh và revision, bỏ qua phản hồi của phiên cũ. Analytics chỉ nhận sự kiện client được phép; purchase phải đến từ trạng thái thanh toán server.

Bộ commerce trong `seed/sites` nối catalog → chi tiết → giỏ → checkout → trạng thái đơn → tài khoản, kèm chính sách/liên hệ. Gallery có lightbox/swipe, thanh mua mobile và phản hồi thêm giỏ. Portal đổi trả dùng token đơn; admin duyệt/nhận/hoàn tiền qua ledger. Nhập kho chỉ áp dụng hàng local đủ điều kiện; giao hàng đổi mới và chuyển tiền thực cần quy trình vận hành. Xem [vận hành nền tảng](studio-platform-operations.md).

## 4. Giấy phép cho plugin thương mại

Plugin thương mại (`promotions`, `shipping`, `payment`, `notify`, `analytics`, `reports`, `accounts`) được cài vào bản build của khách riêng, kèm một **key giấy phép** đặt trong biến môi trường `HOSSO_LICENSE_KEY`.

- Key là chuỗi `HLK1.<payload>.<chữ ký>` ký Ed25519, kiểm tra offline bằng khóa công khai nằm trong `packages/blocks/src/license.ts`. Payload gồm khách (`tenant`), danh sách plugin (hoặc `*`), hạn dùng và (tùy chọn) tên miền.
- Production (hoặc `HOSSO_LICENSE_ENFORCE=1`) mà không có key hợp lệ: hook, endpoint (trả 402), loader của plugin bị vô hiệu; site và các plugin mở vẫn chạy. Chạy dev thì cho dùng thử.
- Tùy chọn `HOSSO_LICENSE_SERVER=<máy chủ cấp phát>`: Studio hỏi online (kết quả nhớ 5 phút) xem key có bị thu hồi chưa; máy chủ không trả lời thì vẫn chạy.
- Admin → Quản lý plugin hiện tình trạng giấy phép; dashboard có bước "Giấy phép plugin ...".
- Muốn mua giấy phép hoặc plugin: liên hệ Hosso. Người viết plugin thương mại bọc plugin bằng `withLicense(plugin)` từ `@hosso/studio-blocks`.

## 5. Giới hạn đã biết

- Tồn kho local, voucher và workflow dùng transaction/CAS; tính đúng đắn của kho WIM/nhà cung cấp vẫn phụ thuộc adapter và đối soát nguồn.
- Chưa có cổng thanh toán chuyển hướng (VNPay, MoMo); `payment` hiện hỗ trợ chuyển khoản tự xác nhận qua SePay.
- Phí GHN dựa trên địa chỉ nhập tay được so khớp với danh mục tỉnh/quận/phường của GHN; không nhận ra thì dùng phí cố định.
- CSV chưa hỗ trợ biến thể.
- Chưa thử với GHN và SePay thật (chỉ mock/ mô phỏng).
