# Product chung cho Shop, WIM và bán chéo

Mọi sản phẩm dùng collection `shop-products`, ID nội bộ của Studio, catalog,
giỏ `hs_shop_cart`, checkout `/api/plugins/shop/checkout` và mã đơn `SO-…`.
Trường `source` phân biệt `shop`, `wim`, `cross-sell`; `wimId` và listing NCC
giữ ID nguồn. Không ghép sản phẩm chỉ vì trùng SKU hoặc ID giữa hai nguồn.

- WIM đồng bộ vào catalog khi đọc danh sách, chi tiết hoặc tìm kiếm; lần đồng
  bộ thành công được nhớ 30 giây. Các block WIM cũ dùng catalog và renderer Shop.
  Bộ lọc xe WIM và tra cứu mã đơn WIM cũ vẫn được hỗ trợ.
- API `/api/plugins/wim/checkout` nhận ID WIM cũ và chuyển qua checkout chung;
  trả mã SO và token tra cứu riêng. Client cần dùng `lookupToken`, không dùng
  `phone4`. Lệnh `pnpm test:product-pool` kiểm tra cả hai API bằng DB tạm.
- Giỏ WIM cũ `hs_cart` được chuyển sang giỏ chung sau khi ghi giỏ mới thành
  công. ID cũ có tiền tố `wim:` để tránh đụng ID nội bộ, được resolve khi checkout.
- Checkout đọc lại giá/tồn kho WIM trực tiếp; hàng NCC vẫn kiểm tra giá, tồn,
  trạng thái listing và quyền đối tác trước khi lưu. Giá trình duyệt không được dùng.
- Một đơn khách có thể chứa sản phẩm của nhiều NCC. Mỗi NCC có purchase/transfer
  riêng; transfer chỉ chứa hàng của NCC đó và thông tin doanh nghiệp mua hàng.
  Quy trình duyệt/gửi đơn NCC và hạn chế giảm giá trên hàng NCC vẫn áp dụng.
- Đơn và snapshot checkout được lưu trước khi gọi WIM. Khi mất phản hồi, checkout
  trả trạng thái chờ; thử lại cùng giỏ dùng snapshot và cùng idempotency key.
  Chỉ phát sự kiện thành công/thanh toán sau khi WIM xác nhận đúng hàng và tiền.
  Mỗi đơn mới có UUID cố định làm khóa nguồn, tránh trùng SO giữa các website.
- Tạo đơn và giữ kho nằm trong cùng transaction bắt buộc. Revision sản phẩm
  được claim có điều kiện ở DB; lỗi một dòng hàng rollback toàn bộ đơn/kho.
  Đồng bộ tồn NCC dùng cùng khóa trước khi tính lại các reservation còn mở.
- WIM từ chối chắc chắn sẽ hủy đơn và hoàn kho một lần. Timeout/mất phản hồi
  giữ trạng thái chờ để thử lại cùng khóa; không hiện QR trước khi xác nhận nguồn.
- Payment phải được tạo thành công trước khi hoàn tất checkout. Mỗi plugin có
  biên nhận sự kiện riêng, lưu cùng transaction với thay đổi DB của plugin.
  Job `shop-order-recovery` chạy mỗi phút để tiếp tục checkout và sự kiện bị lỗi.
  Các plugin ghi DB trong hook cần truyền `event.request` xuống Payload API.
- Tra cứu SO cần token riêng 64 ký tự ngẫu nhiên, không dùng 4 số điện thoại.
  Trang checkout lưu token trong trình duyệt và thư xác nhận có link tra cứu.
  Phản hồi tra cứu không cache; người có token được xem đơn nên cần giữ kín link.
- Hủy đơn đã xác nhận sẽ yêu cầu hủy đơn WIM trước khi hoàn kho nội bộ. Đơn WIM
  chưa rõ kết quả phải được đối soát trước khi hủy. Hoàn tiền NCC vẫn theo quy
  trình đối soát hiện có; không tự gửi lại một purchase chưa rõ kết quả.
- Xuất/nhập gói site và CSV giữ `source`/`wimId`. Hàng NCC nhập mới ở trạng thái
  ngừng bán cho tới khi thiết lập lại listing và đồng bộ với NCC.

## Nâng cấp dữ liệu

SQLite local (tự tạo backup nhất quán trước khi đổi schema):

```powershell
node scripts/migrate-sqlite-product-pool.mjs apps/studio/data/studio.db
```

PostgreSQL: chạy `pnpm migrate`; migration
`20261031_160000_shared_product_pool` bổ sung trường, backfill nguồn và đổi
unique transfer từ một đơn sang cặp đơn/NCC. Migration
`20261031_170000_order_reliability` bổ sung trạng thái checkout, khóa nguồn,
token tra cứu, biên nhận sự kiện và task phục hồi. Không xóa sản phẩm hoặc đơn cũ.
WIM ID trùng phải được đối soát trước khi tạo unique index; migration không tự
gộp/xóa bản ghi. Rollback bị chặn nếu một đơn đã có nhiều transfer NCC.
Đơn đang dở từ phiên bản cũ được đánh dấu `legacy_review`: quản trị viên cần
đối soát nguồn hàng và tồn kho trước khi tiếp tục. Đơn hoàn tất cũ không tự phát
lại email/sự kiện. Token đơn cũ có trong quản trị; link phone4 cũ hết quyền tra cứu.

## Kiểm thử

```powershell
pnpm test:product-pool
pnpm test:order-reliability
node scripts/test-product-pool-migration.mjs
pnpm --filter @hosso/plugin-cross-sell test
pnpm --filter @hosso/plugin-cross-sell exec node --experimental-transform-types --import ./test/register.mjs --test test/product-pool.acceptance.mjs
pnpm test:editor-preview
```

Các test đơn hàng dùng DB SQLite tạm và HTTP mock WIM/NCC; không đặt đơn lên
WIM/NCC thật. Test PostgreSQL kiểm tra schema sinh từ Payload, không kết nối DB.
Email và tác vụ mạng ngoài DB có thể gửi lại nếu tiến trình dừng sau khi gửi
nhưng trước khi lưu biên nhận. Không đảm bảo đúng một lần với dịch vụ ngoài.
SQLite nhiều tiến trình có thể gặp khóa ghi và trả lỗi thử lại; DB vẫn chặn bán
quá tồn. PostgreSQL chưa được kiểm thử transaction/concurrency với DB thật.
Package cross-sell bị ignore theo cấu hình local và cần phát hành riêng.
