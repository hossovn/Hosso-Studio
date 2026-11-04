# Không gian nội dung Studio

Mở **Trang**, **Bài viết**, **Thư viện media**, **Biên tập** hoặc **Dữ liệu dùng chung** trong menu quản trị. Các màn hình dùng nền trung tính và điểm nhấn xanh lá. **Mở danh sách đầy đủ** dẫn tới danh sách Payload khi cần các bộ lọc hoặc thao tác nâng cao.

## 1. Giao diện quản trị

Các màn hình nội dung dùng cùng thanh tìm kiếm, bộ lọc, trạng thái tải, trạng thái trống và thông báo lỗi. Có giao diện điện thoại; bảng sửa nhanh hỗ trợ Tab, Shift+Tab và Escape, rồi trả focus về nút đã mở.

## 2. Quản lý trang

- Chọn **Lưới** để xem bản dựng thu nhỏ, **Bảng** để đọc nhanh hoặc **Cây trang** để thấy cấu trúc.
- **Sửa nhanh** cho phép đặt trang cha và thứ tự. Cây trang tổ chức nội dung; URL không đổi. Máy chủ chặn vòng lặp.
- Chọn nhiều trang để nhân bản hoặc chuyển vào thùng rác. Bản sao là bản nháp và sao chép các ngôn ngữ hiện có.
- Quản trị viên có thể **Đặt trang chủ**. Thay đổi được lưu trong bản nháp cài đặt. Mở **Xuất bản website** để áp dụng ra công khai.

## 3. Soạn bài viết

**Viết bài** mở trình soạn thảo văn bản riêng với thanh định dạng, tiêu đề, danh sách, ảnh, liên kết và bảng. Cột bên có dàn ý và xem trước bản đã lưu. Có mẫu đọc tập trung hoặc có cột bên. Các bài dùng canvas từ trước vẫn giữ chế độ thiết kế kéo thả; có thể chọn cách viết trong biểu mẫu đầy đủ.

Lưu nháp trước khi xem trước. Khi xuất bản, Studio dùng nội dung theo cách viết đang chọn. Ảnh chèn trong bài được đổi tham chiếu theo tên tệp khi xuất/nhập gói site để dùng được ở cơ sở dữ liệu khác.

## 4. Thư viện media

Tải nhiều tệp bằng nút tải hoặc thả tệp vào vùng danh sách. Mỗi tệp có thư mục, thẻ và mô tả; có thể lọc theo thư mục, thẻ hoặc loại tệp. Chọn thư mục tải lên để đưa tệp mới vào đó. **Nơi sử dụng** liệt kê tham chiếu trong nội dung và các bản phát hành đã lưu. Máy chủ kiểm tra lại khi xóa và từ chối nếu tệp còn được sử dụng, bao gồm bản công khai dù bản nháp đã gỡ ảnh.

Thư mục là thông tin tổ chức, không di chuyển đường dẫn tệp vật lý. Tệp ngoài Studio dùng URL bên ngoài không thể được thống kê như media nội bộ.

## 5. Danh sách và thùng rác

Lọc theo trạng thái/chuyên mục, chọn các cột cần hiển thị và lưu bộ lọc bằng tên riêng. Bộ lọc được lưu trên trình duyệt theo tài khoản. **Sửa nhanh** cập nhật tiêu đề, chuyên mục và thông tin biên tập. Thao tác hàng loạt hỗ trợ nhân bản, gửi duyệt, duyệt và thùng rác. Chọn trạng thái **Thùng rác** để khôi phục; nội dung khôi phục là bản nháp. Không dùng xóa vĩnh viễn để dọn tạm nội dung.

## 6. Biên tập

Người viết gửi duyệt và ghi chú. Quản trị viên/người xuất bản phân công, yêu cầu sửa, duyệt và lên lịch. Lịch sử ghi người thao tác và thời điểm. Chỉnh sửa nội dung đã duyệt đưa nội dung về chờ duyệt. Lịch dùng múi giờ trình duyệt, được lưu trên máy chủ; đặt lịch mới thay lịch cũ, có thể hủy lịch. Máy chủ phải chạy để thực thi hàng đợi mỗi phút.

Quyền gửi duyệt khác quyền xuất bản. Tác giả chỉ quản lý bài của mình trong không gian nội dung; biên tập viên không thể duyệt hoặc lên lịch. Các mục dữ liệu dùng chung đang công khai chỉ quản trị viên/người xuất bản sửa được; biên tập viên quản lý mục chưa công khai.

## 7. Tìm toàn CMS

Bấm **Tìm toàn CMS** hoặc Ctrl+K / Command+K. Tìm trang, bài viết, media, dữ liệu dùng chung và sản phẩm theo quyền truy cập. Bấm ngôi sao để ghim kết quả. Mục vừa mở và mục đã ghim lưu theo tài khoản trên trình duyệt này.

## 8. Dữ liệu dùng chung

Tạo FAQ, thành viên đội ngũ, dự án hoặc dịch vụ bằng biểu mẫu có cấu trúc. Nội dung hỗ trợ đa ngôn ngữ. Bật **Hiển thị công khai** khi hoàn tất. Trong canvas, thêm **Danh sách dữ liệu**, chọn nguồn **Dữ liệu dùng chung** và loại nội dung; thiết kế ô mẫu một lần để áp dụng cho toàn bộ danh sách. Nội dung chưa công khai không xuất hiện trên website.

## Cập nhật và kiểm thử

Postgres: chạy migration `20261105_090000_cms_workspace` bằng quy trình cập nhật hiện có trước khi khởi động phiên bản mới. SQLite dùng schema push trong chế độ phát triển; sao lưu trước khi nâng cấp một cơ sở dữ liệu đang dùng.

- `pnpm test:cms-workspace`: kiểm thử trên SQLite tạm riêng, không dùng dữ liệu thật.
- `pnpm test:cms-migration`: so migration với schema Payload hiện có.
- `pnpm test:cms-browser`: kiểm thử trình duyệt với fixture vừa tạo; chỉ cho phép localhost. Chỉ định `HOSSO_EDITOR_ORIGIN` và `HOSSO_PLAYWRIGHT_MODULE` nếu cần.
