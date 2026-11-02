# Studio: bố cục thiết bị và xuất bản website

## Quy trình sử dụng

1. Trong trình dựng, chọn **Máy tính**, **Máy tính bảng** hoặc **Điện thoại**.
   Vị trí, kích thước và kiểu dáng phần tử có thể chỉnh riêng cho từng thiết bị.
   Nội dung chữ, ảnh, liên kết và cấu trúc trang được dùng chung.
2. Với phần FreeCanvas trên tablet/mobile, chọn **Tự xếp dọc** để tạo gợi ý bố cục.
   Có thể kéo chỉnh tiếp, hoàn tác, hoặc chọn **Dùng bố cục gốc** để bỏ ghi đè.
3. Chọn **Lưu nháp**. Header/footer và tùy biến giao diện cũng lưu thành bản nháp.
4. Chọn **Kiểm tra và xuất bản**, hoặc mở **Xuất bản website** trong menu quản trị
   (`/admin/releases`). Đánh dấu các mục muốn áp dụng và đặt tên bản phát hành nếu cần.
5. Xem các lỗi/cảnh báo. **Mở vị trí** đưa đến đúng phần, phần tử và thiết bị trong
   trình dựng. Sửa lỗi bắt buộc; xác nhận đã xem cảnh báo trước khi xuất bản.
6. Chọn **Xuất bản … mục**. Một lần xuất bản có thể gồm trang, bài viết, khối dùng lại,
   các vùng header/footer và cài đặt giao diện. Mỗi mục bao gồm mọi ngôn ngữ đã lưu.

**Xem trước toàn bộ bản nháp** (`/?preview=1`) yêu cầu đăng nhập với quyền biên tập.
Nó hiển thị tất cả bản nháp đã lưu, bao gồm giao diện và vùng dùng chung. Phạm vi xem
trước có thể rộng hơn các mục được chọn xuất bản. Khi điều hướng bằng liên kết website,
cần giữ hoặc thêm lại `preview=1` trên URL để tiếp tục xem nháp. Trang xem trước có
`noindex`. Khách truy cập website thông thường tiếp tục thấy nội dung đã xuất bản.

## Kiểm tra trước xuất bản

- Lỗi chặn xuất bản: cấu trúc trang sai, ID thiếu/trùng, thiếu renderer/plugin,
  vị trí hoặc kích thước phần tử không hợp lệ, giao thức liên kết không hỗ trợ.
- Cảnh báo: tràn khỏi phần theo từng thiết bị, ảnh thiếu nguồn/alt, nội dung mẫu,
  liên kết chưa có đích hoặc chưa tìm thấy đường dẫn nội bộ, H1 và thông tin SEO.
- Đây là kiểm tra tĩnh. Không truy cập liên kết ngoài để kiểm tra HTTP, không kiểm
  chứng hoạt động thanh toán, biểu mẫu hay dữ liệu động của plugin.
- Các kiểm tra và lịch sử bản phát hành áp dụng cho màn hình xuất bản website mới.
  Những công cụ quản trị/API có quyền xuất bản trực tiếp vẫn hoạt động theo Payload.

## Quyền, lịch sử và khôi phục

- Editor được lưu và kiểm tra bản nháp; publisher/admin được xuất bản nội dung.
- Cài đặt website yêu cầu admin để chỉnh sửa, xuất bản hoặc khôi phục.
- Nếu nội dung đổi sau khi kiểm tra, server yêu cầu kiểm tra lại trước khi áp dụng.
- Nội dung và bản ghi lịch sử nằm trong cùng transaction. Lỗi ghi ở bất kỳ mục nào
  sẽ hoàn tác toàn bộ lần xuất bản. PostgreSQL dùng advisory lock để tuần tự hóa
  xuất bản với các thao tác ghi nội dung thông thường.
- **Khôi phục về trước bản này** trả các mục thuộc bản phát hành về trạng thái
  ngay trước lần xuất bản đó, bao gồm các ngôn ngữ. Trang mới xuất bản được trả về
  bản nháp. Đây không phải thao tác khôi phục toàn bộ cơ sở dữ liệu.
- Nếu có bản nháp đang chờ trong cùng phạm vi, khôi phục bị từ chối để bảo vệ công
  việc đó. Thao tác khôi phục được ghi thành một mục lịch sử mới.
- Xóa tài liệu, media và dữ liệu nghiệp vụ của plugin nằm ngoài snapshot phát hành.

## Triển khai

Migration PostgreSQL: `20261102_061337_studio_releases`.

Sao lưu trước khi nâng cấp, sau đó chạy quy trình migrate hiện có (`pnpm migrate`)
trước khi phục vụ phiên bản mới. Migration bổ sung bảng lịch sử, phiên bản của globals
và trạng thái xuất bản; đánh dấu globals hiện có là `published` để giữ giao diện đang
chạy. Schema của các plugin tùy chọn được giữ lại. Migration chỉ hỗ trợ tiến lên;
hạ cấp cần khôi phục bản sao lưu trước nâng cấp. SQLite phát triển dùng schema push.

## Kiểm thử

```sh
pnpm test:studio-layout
pnpm test:site-releases
pnpm test:canvas
pnpm test:editor-preview
pnpm test:site-package
pnpm check:boundaries
pnpm check:i18n
pnpm --filter @hosso/studio typecheck
pnpm --filter @hosso/studio-blocks typecheck
```

Test phát hành tạo cơ sở dữ liệu SQLite dùng một lần trong thư mục tạm, kiểm tra
cách ly bản nháp, phân quyền, revision cũ, xuất bản theo phạm vi, ngôn ngữ, khôi phục
và hoàn tác khi lỗi. Dòng log `Injected global write failure` là lỗi chủ động tạo để
kiểm chứng hoàn tác.

`pnpm test:studio-browser` dùng Playwright Chromium, tạo dữ liệu và chạy Next trên
cổng 3107. Nếu Playwright không được cài trong workspace, đặt biến môi trường
`HOSSO_PLAYWRIGHT_MODULE` trỏ đến package Playwright có sẵn. Ảnh và log nằm trong
`output/studio-upgrades-*`. Test này kiểm tra thao tác trình dựng, xem trước có xác
thực, cách ly khách chưa đăng nhập, xuất bản qua UI và render tại 1440/768/390px.
