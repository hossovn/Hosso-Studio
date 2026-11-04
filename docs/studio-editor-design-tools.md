# Công cụ thiết kế trong Studio

## Chia và sắp xếp ô

- Chọn khung trong canvas hoặc bảng cấu trúc. Thanh công cụ có **Chia ngang**, **Chia dọc** và **Gộp các ô con**. Nội dung cũ được giữ trong ô đầu khi chia; gộp giữ toàn bộ nội dung.
- Với lưới nhiều cột, kéo vách xanh giữa hai cột để đổi tỷ lệ. Có thể chọn vách rồi dùng phím mũi tên; Shift tăng bước. Esc hủy thao tác đang kéo.
- Trong khung tự động, kéo một phần tử qua các phần tử cùng khung để đổi thứ tự. Vạch xanh báo vị trí chèn. Giữ Alt để kéo ra khỏi luồng và chuyển khung như trước.
- Thuộc tính → vị trí/kích thước → **Kích thước theo nội dung**: cố định, vừa nội dung, hoặc lấp đầy ô. Chữ tự tính chiều cao theo nội dung và chiều rộng; khung tự động phân phối phần còn lại cho các phần tử lấp đầy.
- **Chỉ chỉnh khung này** làm mờ và khóa tương tác bên ngoài. Dùng **Thoát · Esc** để quay lại trang.

## Ảnh trong khung

Nhấp đúp ảnh để kéo điểm nhìn, cuộn để phóng 1–5 lần hoặc dùng phím mũi tên. Nút Đặt lại đưa ảnh về tâm. Chuyển thiết bị trước khi chỉnh để lưu điểm nhìn riêng cho mobile/tablet. Alt + nhấp đúp ảnh đã tải lên mở công cụ cắt/xoay và lưu thành ảnh mới.

## Báo giá

Trong **Nhập liệu**, tạo hoặc sửa biểu mẫu rồi mở **Báo giá tự động**. Bật tổng, đặt tiền tệ, phí cơ bản, đơn giá cho trường chọn/số/đánh dấu và trường số lượng. Danh sách chọn có đơn giá riêng từng lựa chọn. Khách thấy tổng ngay khi nhập; máy chủ kiểm tra dữ liệu và tự tính lại trước khi lưu/gửi email hoặc webhook. Trường ẩn không được tính. Các cột lưu thêm: `_quoteTotal`, `_quoteCurrency`, `_quoteBase`, `_quoteItems`.

## Danh sách dữ liệu

Mở **Chia ô → Danh sách dữ liệu** để chèn mẫu hoặc dùng khung đang chọn làm mẫu. Thuộc tính của danh sách chọn nguồn thủ công, bài viết đã xuất bản hoặc sản phẩm đang bán, số mục và số cột. Nguồn sản phẩm dùng loader của plugin Shop, bao gồm quy tắc ẩn giá.

Chọn danh sách và **Mở ô mẫu trên canvas**. Thiết kế ô như một khung thường; chọn chữ/ảnh/nút rồi nối dữ liệu trong bảng Chia ô (`title`, `excerpt`, `cover`, `href`, `price`). Chọn **Áp dụng ô mẫu cho danh sách** để cập nhật mọi mục hoặc hủy sửa. Ô mẫu đang sửa được giữ khi lưu nháp, có cảnh báo khi xuất bản và được loại khỏi trang public. Mẫu hỗ trợ chữ, ảnh, nút, hình, biểu tượng, video, số và khung lồng nhau. Trên mobile, danh sách xếp một cột.

## Timeline

Nút biểu tượng phim ở thanh trên hoặc Ctrl+K → **Timeline hiệu ứng** mở timeline cho phần đang chọn. Chọn hiệu ứng, kéo thanh để đổi độ trễ, kéo mép phải để đổi thời lượng; cũng có thể nhập số. **Xếp nối tiếp** đặt các lớp cách nhau 200 ms. Dùng thanh tua hoặc Phát/Tạm dừng để kiểm tra phối hợp. Đóng timeline xóa toàn bộ hiệu ứng xem thử, chỉ giữ cấu hình đã chỉnh. Runtime public tiếp tục tôn trọng reduced motion.

## Kiểm tra

`pnpm test:editor-design-tools` kiểm tra hình học, thứ tự, khóa, mobile, báo giá và binding. `scripts/test-editor-design-tools-browser.mjs` kiểm tra tương tác thật với cơ sở dữ liệu fixture riêng trên localhost. `test:editor-preview` kiểm tra renderer thật, link an toàn, dữ liệu loader, trạng thái lỗi và ẩn giá; `test:site-package` kiểm tra xuất/nhập ZIP.
