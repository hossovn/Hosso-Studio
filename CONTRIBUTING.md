# Đóng góp cho Hosso Studio

**Tiếng Việt** | [English](CONTRIBUTING.en.md)

Cảm ơn bạn đã quan tâm. Mọi đóng góp được nhận và phân phối theo giấy phép **Apache-2.0** của dự án (xem [LICENSE](LICENSE)).

## 1. Chuẩn bị môi trường

Yêu cầu: Node.js `>=22.15`, pnpm `>=10` (dự án ghim `pnpm@10.34.6` qua Corepack).

```bash
git clone <repo> hosso-studio
cd hosso-studio
pnpm install
pnpm dev
```

Lần chạy đầu tự tạo `apps/studio/.env`, tạo SQLite `apps/studio/data/studio.db` và nạp trang mẫu.

- Site: http://localhost:3000
- Quản trị: http://localhost:3000/admin. Email và mật khẩu nằm trong `apps/studio/.env`. Xem [docs/ADMIN-LOGIN.md](docs/ADMIN-LOGIN.md).
- Health check: http://localhost:3000/api/health

Muốn thử plugin WIM mà không có WIM thật, chạy mock: `pnpm mock:wim`.

## 2. Cấu trúc repo

| Thư mục | Nội dung |
|---|---|
| `apps/studio` | Ứng dụng Next.js + Payload (admin, trình dựng, site công khai). Cấu hình site ở `hosso.config.ts` |
| `packages/blocks` | Block dựng trang, kiểu dữ liệu, chuỗi giao diện (`strings.vi.ts`, `strings.en.ts`) |
| `packages/theme-*` | Các theme (`default`, `alt`, `shop`) |
| `packages/plugin-wim` | Plugin thương mại kết nối Hosso WIM |
| `tools/mock-wim` | WIM giả để phát triển và kiểm thử |
| `scripts` | Script kiểm tra và tiện ích (`check-boundaries`, `ensure-env`, `check-order-flow`) |
| `seed` | Site mẫu đóng gói (`.hosso-site.zip`) |
| `docs` | Tài liệu: cài đặt, đăng nhập, kiến trúc, tạo theme và plugin |

Đọc [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) trước khi sửa phần lõi.

## 3. Quy trình đóng góp

1. **Mở issue trước** khi làm thay đổi lớn (kiến trúc, schema, block mới, plugin mới). Thay đổi nhỏ như sửa lỗi hoặc chính tả có thể gửi thẳng.
2. Tạo nhánh từ `main`, đặt tên rõ ý, ví dụ `fix/menu-dropdown`, `feat/block-faq`.
3. Làm thay đổi nhỏ, tập trung một việc. PR dễ đọc thì được duyệt nhanh.
4. Chạy các kiểm tra ở mục 5 trước khi gửi.
5. Mở Pull Request vào `main`, mô tả **vì sao** thay đổi, cách kiểm tra, và ảnh chụp nếu có đổi giao diện.

### Commit

Viết commit message bằng tiếng Anh (tiếng Việt cũng được chấp nhận), dòng đầu ngắn nêu việc đã làm (xem `git log`). Ví dụ: `Fix the dropdown menu not closing when clicking outside`. Một commit nên làm một việc.

## 4. Quy tắc mã nguồn

### Phụ thuộc và giấy phép

- Không thêm thư viện nặng khi không cần. Ưu tiên chuẩn của nền tảng và thứ đã có sẵn.
- Thư viện mới phải có giấy phép **MIT, Apache-2.0, BSD hoặc ISC**. Không dùng GPL, AGPL, LGPL hay giấy phép "source-available" trong lõi. Ghi vào [docs/LICENSES.md](docs/LICENSES.md) khi thêm.
- Không chép mã từ nguồn không rõ giấy phép.

### Ranh giới gói

- `apps/studio` (lõi), `packages/blocks` và các theme **không được import từ plugin** (ví dụ `@hosso/plugin-wim`). Plugin đăng ký qua `hosso.config.ts`.
- Gỡ plugin khỏi `hosso.config.ts` thì site vẫn phải chạy.
- Kiểm tra bằng `pnpm check:boundaries`.

### Nội dung và giao diện

- Chuỗi hiển thị cho người dùng đặt trong `strings.vi.ts` và `strings.en.ts`, không viết cứng trong component.
- Admin và trình dựng song ngữ: viết tiếng Việt trong code dạng `T('…')` (hoặc `L('…')` trong `packages/blocks`) rồi thêm bản tiếng Anh vào `apps/studio/src/lib/admin-en/*.ts` (nhãn block: `packages/blocks/src/labels-en.ts`; nhãn plugin: `HossoPlugin.adminEn`). `pnpm check:i18n` liệt kê chuỗi còn thiếu.
- Thông báo của máy chủ và CLI dùng `L('Tiếng Việt', 'English')` / `msg(req, …)` trong `apps/studio/src/lib/lang.ts`.
- Theme chỉ lo giao diện. Đổi theme không được làm thay đổi nội dung trang.
- Block mới: đăng ký trong `puck-config.ts`, thêm kiểu trong `types.ts`, và chạy được khi không có plugin.
- Giữ trang công khai nhẹ: tránh thêm JavaScript phía client khi CSS hoặc server component làm được.

### Next.js

Phiên bản Next.js ở đây có thay đổi so với bản phổ biến. Đọc hướng dẫn trong `node_modules/next/dist/docs/` trước khi viết mã liên quan, và để ý các cảnh báo deprecation.

## 5. Kiểm tra trước khi gửi

```bash
pnpm typecheck          # kiểm tra kiểu toàn workspace
pnpm check:boundaries   # kiểm tra ranh giới lõi / plugin
pnpm check:i18n         # kiểm tra đủ bản dịch admin (vi/en)
```

Nếu sửa phần thương mại (plugin WIM, giỏ hàng, thanh toán), chạy thêm với mock đang bật:

```bash
pnpm mock:wim
pnpm check:order-flow
```

Nếu đổi giao diện, tự mở site và trình dựng trên trình duyệt để xem. Kiểm tra gõ kiểu không thay thế việc nhìn bằng mắt.

### Thay đổi schema

Khi sửa collection hoặc global của Payload:

- SQLite ở dev tự đồng bộ (push).
- Postgres cần migration. Sinh migration và commit cùng thay đổi: `pnpm migrate` (xem `apps/studio/src/migrations`).

### Gói site

Nếu thay đổi ảnh hưởng định dạng export/import (`studio:export`, `studio:import`), kiểm tra nhập lại `packages/plugin-wim/templates/phu-tung-o-to.hosso-site.zip` vào một DB sạch.

## 6. Báo lỗi

Một issue tốt có: các bước tái hiện, kết quả mong đợi, kết quả thực tế, phiên bản Node/pnpm, chạy bằng `pnpm dev` hay Docker, và log nếu có. **Không dán** nội dung `.env`, khóa API hay mật khẩu vào issue.

Lỗ hổng bảo mật: không mở issue công khai. Liên hệ riêng chủ dự án.

## 7. Thương hiệu

Tên và logo Hosso được bảo hộ riêng, xem [TRADEMARK.md](TRADEMARK.md). Giấy phép Apache-2.0 không cấp quyền dùng nhãn hiệu.

## 8. CLA / DCO

_Chưa bắt buộc trong PoC. Chỗ này để bổ sung CLA hoặc DCO (ví dụ yêu cầu `Signed-off-by`) khi chủ dự án quyết định._
