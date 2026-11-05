# Loại nội dung, nhập bảng tính và phân quyền

## 4. Tạo loại nội dung

Quản trị viên mở **Loại nội dung → Tạo mới**, nhập tên và mã (ví dụ `courses`, `branches`), rồi thêm các trường. Tiêu đề và mã của từng mục luôn có sẵn.

Các kiểu trường: văn bản ngắn/dài, số, đúng/sai, ngày, lựa chọn, ảnh và liên kết tới một loại nội dung khác. Có thể đặt bắt buộc và đổi thứ tự. Trường lựa chọn dùng mỗi dòng một giá trị. Lưu loại nội dung trước khi chọn liên kết tới chính nó.

Mở **Dữ liệu dùng chung → Thêm nội dung** và chọn loại vừa tạo. Studio sinh biểu mẫu từ cấu trúc đã lưu. Ảnh có nút chọn thư viện; liên kết lưu mã của mục đích để xuất/nhập qua website khác. Chỉ liên kết tới nội dung mà người dùng được xem; mục công khai chỉ liên kết tới mục công khai.

Mã loại nội dung, mã mục và loại của mục không đổi sau khi tạo. Máy chủ chặn cấu trúc không hợp lệ, trường trùng, thay đổi làm dữ liệu hiện có sai (kiểm tra mọi bản dịch), xóa loại còn dữ liệu và xóa/ẩn mục đang được liên kết. Bốn loại FAQ, đội ngũ, dự án và dịch vụ tiếp tục dùng cấu trúc sẵn có.

Trong **Danh sách dữ liệu**, chọn nguồn dữ liệu dùng chung và nhập mã loại ở **Mã loại dữ liệu dùng chung**. Các trường quy ước `description`, `image`, `url` dùng làm mô tả, ảnh và liên kết của ô. Gói website mang theo cấu trúc, dữ liệu và liên kết giữa các mục; quyền người dùng không được sao chép sang website khác.

## 6. Nhập Excel / CSV

Mở **Nhập Excel / CSV** từ menu hoặc không gian nội dung:

1. Chọn đích: dữ liệu dùng chung, bài viết hoặc trang; chọn loại dữ liệu và ngôn ngữ nội dung.
2. Tải `.xlsx` hoặc CSV UTF-8 (dấu phẩy, chấm phẩy hoặc tab). Tối đa 5 MB, 20 sheet, 500 dòng và 50 cột mỗi sheet. Dòng đầu chứa tiêu đề khác nhau. Có nút tải mẫu CSV kèm một dòng ví dụ.
3. Chọn sheet và ghép cột. Cần cột tiêu đề; mã trống được tạo từ tiêu đề. Liên kết dùng mã của mục đã tồn tại; ảnh dùng URL. Số dùng dấu chấm thập phân; ngày dùng `YYYY-MM-DD`; đúng/sai dùng `true/false`, `1/0`, `yes/no` hoặc `có/không`. Ô có công thức hoặc lỗi Excel phải chuyển thành giá trị trước khi nhập.
4. Chọn **Bỏ qua**, **Cập nhật** hoặc **Báo lỗi** khi mã đã tồn tại. Trùng mã ngay trong tệp được báo theo dòng. Khi cập nhật, các trường không ghép được giữ lại. Chuyên mục bài viết dùng mã chuyên mục, phân cách bằng `|`.
5. Bấm **Kiểm tra và xem trước**. Xem thao tác, dữ liệu chuyển đổi và lỗi từng dòng. Nếu có lỗi, sửa tệp hoặc bật **Bỏ qua các dòng lỗi** rồi xem trước lại.
6. Bấm **Nhập dữ liệu đã kiểm tra**. Trang/bài viết lưu nháp; mục dữ liệu dùng chung đặt chưa công khai, kể cả khi cập nhật mục đang công khai (cần quyền xuất bản mục đó).

Máy chủ kiểm tra lại trước khi ghi. Nếu dữ liệu, cấu trúc hoặc quyền đã đổi, bản xem trước bị từ chối và cần kiểm tra lại. Bản xem trước có hiệu lực 10 phút. Toàn bộ lô nhập được hoàn tác nếu có thao tác ghi thất bại. Không tự tải ảnh từ URL và không tạo chuyên mục chưa tồn tại.

## 8. Phân quyền theo nội dung

Quản trị viên mở **Người dùng → tài khoản → Phân quyền nội dung**, bật **Giới hạn theo phạm vi nội dung**, thêm các phạm vi và lưu:

- **Trang**: mọi trang trong phạm vi quyền của vai trò.
- **Bài viết**: chọn chuyên mục, hoặc để trống để áp dụng tất cả. Một bài có nhiều chuyên mục phải nằm hoàn toàn trong một phạm vi đã cấp.
- **Dữ liệu dùng chung**: chọn loại tùy chỉnh hoặc loại có sẵn, hoặc áp dụng tất cả.

Mỗi phạm vi có **Xem**, **Sửa**, **Duyệt**, **Xuất bản**. Sửa bao gồm tạo mới. Duyệt cho phép đổi trạng thái duyệt và phân công; xuất bản cho phép xuất bản, lên lịch và xóa/chuyển vào thùng rác theo chức năng của từng loại. Dữ liệu dùng chung cũng gửi duyệt/duyệt được từ Sửa nhanh và thao tác hàng loạt; lịch đăng áp dụng cho trang/bài viết.

Các quyền giới hạn vai trò hiện có: tác giả vẫn chỉ sửa bài của mình, biên tập viên vẫn không được xuất bản. Muốn cấp xuất bản, đặt vai trò người xuất bản rồi giới hạn phạm vi. Quản trị viên luôn toàn quyền. Tắt giới hạn giữ cách phân quyền theo vai trò trước đây; bật giới hạn và không thêm phạm vi sẽ không cấp quyền nội dung nào.

Kiểm tra áp dụng tại máy chủ cho REST, GraphQL, editor, nhập dữ liệu, tìm kiếm, lịch sử phiên bản và góp ý thiết kế. Người dùng không thể tự gỡ giới hạn. Quyền được tải lại từ cơ sở dữ liệu trên từng yêu cầu và khi tác vụ lịch chạy. Tài khoản giới hạn phạm vi xuất bản từng mục; phát hành/khôi phục toàn website cần tài khoản không bị giới hạn. Giới hạn CMS không biến nội dung website đã công khai thành nội dung riêng tư.

## Nâng cấp và kiểm thử

Chạy migration PostgreSQL `20261105_120000_content_models` sau migration CMS trước khi khởi động phiên bản mới. Migration giữ các loại và dữ liệu sẵn có. Không hạ phiên bản khi còn cấu trúc hoặc mục tùy chỉnh; sao lưu và xuất dữ liệu trước khi nâng cấp.

- `pnpm test:content-models`: schema, CSV/XLSX thực, xem trước, nhập, hoàn tác, phân quyền và gói website trên SQLite tạm.
- `pnpm test:content-model-migration`: so migration với schema Payload đang cài.
- CI chạy hai bước mới cùng các kiểm thử CMS/editor và roundtrip PostgreSQL.
