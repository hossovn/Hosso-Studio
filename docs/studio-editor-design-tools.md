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

## Desktop và mobile cùng lúc

Nút **Desktop và mobile cạnh nhau** trên thanh trên mở hai canvas dùng cùng dữ liệu. Bên có nhãn **Đang sửa** nhận thao tác; bên còn lại cập nhật xem trước. **Chỉnh bên này** đổi thiết bị đang sửa. Ở cửa sổ hẹp, hai canvas xếp dọc. Vị trí/kích thước riêng theo thiết bị vẫn được giữ.

## Kéo lề và khoảng cách

Chọn khung có bố cục ngang/dọc/lưới. Kéo nhãn **Lề** để thay padding, **Gap** để thay khoảng cách giữa các ô. Nhấn mũi tên để tăng/giảm 1 px; Shift tăng bước lên 10 px; Esc hủy lần kéo. Giá trị dùng cùng đơn vị với bảng thuộc tính và lưu riêng theo thiết bị đang sửa.

## Kiểu chung và biến thể

Mở **Công cụ thiết kế → Kiểu chung**. Chọn phần tử để tạo kiểu hoặc liên kết kiểu có sẵn. Chỉnh màu/cỡ chữ/bo góc ngay trong bảng hoặc chỉnh thuộc tính rồi **Cập nhật kiểu gốc từ phần tử**. Các phần tử liên kết trong trang, lớp nổi, ô mẫu và biến thể cập nhật cùng nhau; chữ/ảnh riêng và ghi đè thiết bị được giữ. Tách hoặc xóa kiểu giữ giao diện hiện tại. Kiểu chung hiện có phạm vi trong một trang.

Trong tab **Biến thể**, chọn khung, đặt tên và lưu thiết kế. Có thể áp dụng, ghi đè hoặc xóa tối đa 20 biến thể mỗi khung. Áp dụng giữ vị trí khung và tạo ID riêng cho lớp con. Với section dùng lại, bảng thuộc tính của instance cho chọn biến thể từ khung nguồn.

## Kiểm tra giao diện

Tab **Kiểm tra → Quét giao diện** đo canvas đang sửa: độ tương phản chữ trên nền màu phẳng, vùng bấm nhỏ hơn 24 px và nội dung bị cắt. Chọn cảnh báo để định vị phần tử; viền vàng đánh dấu các mục cần xem. Sau khi sửa cần quét lại. Nền ảnh, gradient, nền trong suốt phức tạp cần kiểm tra bằng mắt; kết quả quét không thay cho kiểm tra khả năng truy cập toàn trang.

## So sánh và khôi phục từng mục

Trong **Lịch sử**, dùng **So sánh** ở một bước chỉnh sửa, snapshot hoặc **Tải phiên bản để so sánh** từ máy chủ. Hai canvas hiển thị bản cũ và hiện tại; chọn desktop/mobile trong hộp so sánh. Danh sách đánh dấu mục thêm/xóa/sửa, kể cả đổi thứ tự. **Khôi phục mục này** chỉ lấy lại section hoặc khung/phần tử đã chọn; khung lấy lại cả lớp con. Có thể hoàn tác rồi lưu nháp khi đã kiểm tra.

## Tìm kiếm và phân trang danh sách

Thuộc tính danh sách có công tắc **Tìm kiếm trong danh sách**, **Lọc theo danh mục**, **Cho phép sắp xếp**, **Phân trang danh sách**. Số mục là kích thước trang. Nguồn thủ công dùng trường danh mục của từng mục; bài viết và sản phẩm dùng chuyên mục trong hệ thống. Điều khiển trên trang public gửi yêu cầu tới máy chủ và dùng tham số riêng cho từng danh sách. Sản phẩm tiếp tục tuân thủ quy tắc ẩn giá.

## Chỉ sửa nội dung

Tab **Nội dung** cho bật chế độ chỉ sửa chữ, ảnh và liên kết trong phiên hiện tại. Chọn phần tử trên canvas rồi sửa các trường trong bảng; công cụ thay bố cục được ẩn.

Quản trị viên/người xuất bản có thể bật **Chỉ cho biên tập viên sửa nội dung trang này** và lưu nháp. Tài khoản biên tập viên sẽ bị khóa chế độ này; API cũng từ chối thay vị trí, kiểu dáng, cấu trúc, thiết bị hoặc tự bỏ khóa. Chính sách áp dụng cho từng trang/bài viết/section dùng lại/khu vực chung đã bật khóa. Các widget không có trường nội dung trực tiếp vẫn cần người có quyền thiết kế chỉnh trong thuộc tính.

## Kiểm tra

`pnpm test:editor-design-tools` kiểm tra hình học, thứ tự, khóa, mobile, báo giá và binding. `scripts/test-editor-design-tools-browser.mjs` kiểm tra tương tác thật với cơ sở dữ liệu fixture riêng trên localhost. `test:editor-preview` kiểm tra renderer thật, link an toàn, dữ liệu loader, trạng thái lỗi và ẩn giá; `test:site-package` kiểm tra xuất/nhập ZIP.

`pnpm test:editor-design-workspace` kiểm tra kiểu chung, biến thể, chính sách nội dung, khôi phục từng mục và truy vấn danh sách. `scripts/test-editor-design-workspace-browser.mjs` kiểm tra các thao tác qua editor thật, phiên bản máy chủ, trang public và tài khoản biên tập viên với fixture localhost riêng.
