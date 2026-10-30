# Affiliate CPS

## Chính sách MVP

- Link `?ref=CODE` gọi endpoint cùng origin để tạo click phía server và cookie first-party HttpOnly 30 ngày. Click hợp lệ cuối cùng thắng; click sai không xóa attribution trước đó.
- Đối tác mới chờ duyệt. Tài khoản bị khóa hoặc chưa duyệt không nhận attribution mới.
- Shop đóng băng đối tác, mức phần trăm/cố định và thời gian giữ khi tạo đơn; giá trị tính hoa hồng là tiền hàng sau giảm giá, không gồm vận chuyển.
- Đơn phải thu đủ tiền và hoàn tất; mặc định giữ 14 ngày tính từ lần hoàn tất đầu tiên. Sau đó chủ shop duyệt chi tại **Admin → Tiếp thị liên kết** (`/admin/affiliate`).
- Hoa hồng cố định tính mỗi đơn, tối đa bằng tiền hàng; hoàn một phần giảm hoa hồng theo tỷ lệ tiền hàng còn lại. Tiền VND phải là số nguyên.
- Trường **Tiền hàng tính hoa hồng đã hoàn** trên đơn Shop là lũy kế, sau giảm giá và không gồm ship; không được giảm số đã ghi nhận. Hoàn/hủy trước chi làm giảm hoặc hủy hoa hồng. Sau chi, hệ thống tạo khoản điều chỉnh âm và giữ nguyên lịch sử đã trả.
- Khi ghi nhận chuyển khoản, phải chọn đủ khoản nợ hoàn tiền của đối tác, tổng dương, có mã ngân hàng duy nhất và chứng từ. Hệ thống lưu chứng từ; chủ shop thực hiện chuyển khoản bên ngoài.
- Chặn tự giới thiệu bằng email hoặc phiên affiliate đã đăng nhập. Đây là kiểm tra cơ bản; chưa có phân tích thiết bị hay mô hình gian lận.

## Tích hợp WIM

Checkout lưu receipt trước khi gửi yêu cầu WIM, dùng khóa idempotency hiện có. Retry giữ nguyên attribution ban đầu. Nếu WIM đã tạo đơn nhưng Studio chưa liên kết được, có thể liên kết mã đơn tại màn hình CPS; hệ thống xác minh số điện thoại và dòng hàng.

Webhook trạng thái có chữ ký kích hoạt đọc lại đơn từ WIM; có lỗi đồng bộ trả 503 để bên gửi retry. Với API WIM hiện tại thiếu trạng thái thanh toán/hoàn tiền, chủ shop phải xác nhận thu đủ tiền COD và ghi số tiền hàng đã hoàn kèm mã chứng từ. Giá trị tổng đơn thay đổi sẽ chặn đối soát để kiểm tra thủ công. Không tự suy ra đã thu tiền từ trạng thái hoàn tất.

## Nâng cấp và vận hành

1. Sao lưu database và triển khai đồng bộ Studio, blocks, Shop, affiliate cùng các plugin WIM/payment/promotions đã cập nhật.
2. Chi trả thật yêu cầu **PostgreSQL có transaction**. SQLite chỉ dùng preview/tracking; endpoint payout từ chối chi trả.
3. Chạy migration theo quy trình Studio (`pnpm --filter @hosso/studio migrate`), gồm `20261030_120000_affiliate_cps`. Migration không đổi lịch sử hoa hồng cũ; đối tác cũ đang active được đánh dấu approved.
4. Đơn/hoa hồng cũ thiếu policy không tự nhận chính sách mới và không được chi qua CPS. Đối soát riêng trước khi chuyển đổi sổ cũ. Nút **Đối soát toàn bộ đơn Shop** chỉ xử lý các đơn đã có snapshot CPS.
5. Người dùng và affiliate cần đăng nhập lại: chữ ký session được phân biệt theo loại cookie để ngăn dùng phiên khách hàng làm phiên affiliate.
6. Tạo một đơn thử, xác nhận thu tiền, hoàn tất, kiểm tra thời gian giữ, duyệt, ghi chứng từ chi và thử hoàn một phần. Kiểm tra webhook trên môi trường staging trước khi bật vận hành thật.

Migration down từ chối khi có lịch sử CPS để tránh mất sổ chi trả. Bản snapshot migration chỉ thêm schema liên quan CPS; không gộp thay đổi giao diện hoặc schema khác.

## Kiểm tra

Từ repo Studio, Node 22 và dependencies đã cài:

```powershell
node --experimental-strip-types --import ./packages/plugin-affiliate/test/register.mjs --test packages/plugin-affiliate/test/core.test.mjs
$env:AFFILIATE_TEST_DATABASE_URL='postgres://USER:PASSWORD@127.0.0.1:5432/affiliate_test'
node node_modules/tsx/dist/cli.mjs packages/plugin-affiliate/test/integration.ts
node node_modules/tsx/dist/cli.mjs packages/plugin-affiliate/test/migration.ts
```

Dùng database kiểm thử riêng: integration tạo/xóa schema riêng; migration test cần quyền tạo/xóa database và tự tạo database tạm. Không trỏ các test này vào database production.
