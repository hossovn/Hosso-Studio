# Đăng nhập quản trị Hosso Studio
**Tiếng Việt** | [English](en/ADMIN-LOGIN.md)

Hosso Studio dùng Payload CMS làm lớp quản trị. Bạn **không cần đăng ký**: tài khoản admin đầu tiên do hệ thống tự tạo khi khởi động lần đầu.

## 1. Tóm tắt nhanh

| Việc | Chi tiết |
|---|---|
| Địa chỉ | http://localhost:3000/admin |
| Email | `HOSSO_ADMIN_EMAIL` trong `apps/studio/.env` (mặc định `admin@example.com`) |
| Mật khẩu | `HOSSO_ADMIN_PASSWORD` trong `apps/studio/.env` (12 ký tự, sinh ngẫu nhiên) |
| Vai trò | `admin` (toàn quyền) |

## 2. Luồng chi tiết (chạy cục bộ)

### Bước 1. Chạy lệnh dev

```bash
pnpm install
pnpm dev
```

`pnpm dev` chạy `node scripts/ensure-env.mjs` trước khi khởi động Studio.

### Bước 2. Tạo file `apps/studio/.env`

`scripts/ensure-env.mjs` làm các việc sau:

1. Nếu `apps/studio/.env` **đã tồn tại**, script dừng ngay và không đụng vào file.
2. Nếu chưa, script sao chép `.env.example` thành `apps/studio/.env`.
3. Với các khóa còn để trống, script điền giá trị ngẫu nhiên: `HOSSO_SECRET`, `HOSSO_ENCRYPTION_KEY`, `HOSSO_ADMIN_PASSWORD`.
4. Script in ra dòng: "Đã tạo apps/studio/.env (tài khoản admin và mật khẩu nằm trong file này)."

`HOSSO_ADMIN_EMAIL` giữ nguyên giá trị trong `.env.example`, tức `admin@example.com`. Bạn có thể sửa email này trong `.env` **trước lần chạy đầu tiên** của Studio.

### Bước 3. Studio tạo tài khoản admin

Khi Studio khởi động, Payload gọi `onInit` trong [payload.config.ts](../apps/studio/src/payload.config.ts). Hook này gọi `ensureAdmin` ([seed.ts](../apps/studio/src/lib/seed.ts)):

- Điều kiện: có đủ `HOSSO_ADMIN_EMAIL` và `HOSSO_ADMIN_PASSWORD`, **và** bảng `users` đang trống.
- Hành động: tạo một user với `roles: ['admin']` và ghi log "Đã tạo tài khoản quản trị: <email>".
- Nếu DB đã có user, hàm không làm gì cả.

Sau đó, nếu `HOSSO_SEED` khác `false`, `seedIfEmpty` nạp trang mẫu.

### Bước 4. Lấy thông tin đăng nhập

Mở `apps/studio/.env` và đọc hai dòng:

```
HOSSO_ADMIN_EMAIL=admin@example.com
HOSSO_ADMIN_PASSWORD=<chuỗi ngẫu nhiên>
```

### Bước 5. Đăng nhập

1. Mở http://localhost:3000/admin.
2. Nhập email và mật khẩu ở bước 4.
3. Bạn vào dashboard, nơi có checklist "Hướng dẫn bắt đầu" (tên và logo, menu, trang chủ, ít nhất 3 trang đã xuất bản).

### Bước 6. Vào trình dựng kéo thả

Admin → **Các trang** → mở một trang → **Mở trình dựng kéo thả**. Hoặc vào thẳng `/editor/<id>`. Bài viết dùng `/editor/<id>?c=posts`.

## 3. Trường hợp đặc biệt

### 3.1. `.env` không có email hoặc mật khẩu admin

Khi đó `ensureAdmin` không tạo gì. Lần đầu mở `/admin`, Payload hiện màn hình **tạo người dùng đầu tiên**. Bạn nhập email và mật khẩu tự chọn.

Người dùng đầu tiên luôn được gán vai trò `admin`. Hook `beforeChange` trong [Users.ts](../apps/studio/src/collections/Users.ts) ép điều này.

### 3.2. Docker

Đặt trong `.env` ở thư mục gốc, rồi chạy `docker compose up --build`:

```
HOSSO_ADMIN_EMAIL=ban@congty.vn
HOSSO_ADMIN_PASSWORD=mat-khau-cua-ban
```

Nếu bỏ trống hai biến này, hệ thống không tạo admin tự động và bạn dùng màn hình tạo người dùng đầu tiên như mục 3.1. Docker **không** tự sinh mật khẩu như `pnpm dev`.

### 3.3. Đổi `.env` sau lần chạy đầu không đổi được tài khoản cũ

`ensureAdmin` chỉ chạy khi DB chưa có user. Muốn đổi:

- **Đổi mật khẩu hoặc email:** Admin → Hệ thống → **Người dùng** → mở user → sửa → Lưu.
- **Làm lại từ đầu (mất dữ liệu):** dừng Studio, xóa `apps/studio/data/studio.db`, chạy lại `pnpm dev`. Seed sẽ nạp lại trang mẫu.

### 3.4. Quên mật khẩu

- Nếu chưa đổi mật khẩu trong admin, mật khẩu vẫn là giá trị trong `apps/studio/.env`.
- Nếu đã đổi và quên: đăng nhập bằng tài khoản admin khác để đặt lại, hoặc dùng cách "làm lại từ đầu" ở mục 3.3.

### 3.5. Đăng nhập báo sai dù đúng mật khẩu

Kiểm tra theo thứ tự:

1. Studio có đang đọc đúng `apps/studio/.env` không (không phải `.env` ở thư mục gốc, trừ khi chạy Docker).
2. `.env` có bị tạo lại không. Nếu bạn xóa `.env` nhưng giữ `studio.db`, mật khẩu mới sinh sẽ **không khớp** user cũ trong DB.
3. `HOSSO_SECRET` có bị đổi không. Đổi secret làm các phiên đăng nhập cũ mất hiệu lực, nhưng không làm hỏng mật khẩu.

## 4. Vai trò người dùng

Định nghĩa ở [Users.ts](../apps/studio/src/collections/Users.ts). Chỉ `admin` được tạo, xóa người dùng và gán vai trò.

| Vai trò | Quyền |
|---|---|
| `admin` | Toàn quyền, gồm cài đặt site và plugin |
| `publisher` | Xuất bản nội dung, không sửa cài đặt |
| `editor` | Sửa trang và bài, chỉ lưu nháp (vai trò mặc định của user mới) |
| `author` | Chỉ viết bài của mình, lưu nháp |
| `moderator` | Bình luận và biểu mẫu |

Người dùng không phải `admin` chỉ đọc và sửa được **chính tài khoản của mình**.

Thêm người: Admin → Người dùng → **Tạo mới** → nhập email, mật khẩu, chọn vai trò.

## 5. Gợi ý an toàn khi đưa lên server

- Đặt `HOSSO_ADMIN_PASSWORD` mạnh, không dùng `admin@example.com` làm email thật.
- Không commit `apps/studio/.env` (chứa `HOSSO_SECRET`, `HOSSO_ENCRYPTION_KEY`).
- `HOSSO_ENCRYPTION_KEY` mã hóa khóa API và bí mật webhook của plugin WIM. Mất khóa này thì phải nhập lại các giá trị đó.
- Đặt `HOSSO_PUBLIC_URL` đúng domain thật.
