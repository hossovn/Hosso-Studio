# Kiến trúc Hosso Studio (PoC)
**Tiếng Việt** | [English](en/ARCHITECTURE.md)

```
apps/studio            Payload (admin) + site runtime Next.js + hosso.config.ts
packages/blocks        Hợp đồng chung: kiểu Block/Theme/Plugin, schema block lõi, buildPuckConfig, chuỗi vi
packages/theme-*       Theme: theme.json (token) + renderer cho từng block + CSS
packages/plugin-wim    Plugin WIM (đóng mã nguồn): kết nối, block thương mại, cache, webhook, đặt đơn
tools/mock-wim         Mock WIM (NestJS 11) dựng từ openapi.yaml
seed/                  Trang mẫu, dữ liệu mock WIM, gói site mẫu
```

## Nguyên tắc

- **Lõi không phụ thuộc plugin.** `apps/studio/src`, `packages/blocks`, `packages/theme-*` không nhắc `plugin-wim` (kiểm bằng `pnpm check:boundaries`). Chỗ duy nhất đăng ký plugin là `hosso.config.ts`.
- **Schema tách renderer.** Block khai báo field và giá trị mặc định (`BlockSchema`); theme cung cấp renderer. `buildPuckConfig(schemas, theme)` dựng cấu hình Puck lúc chạy, nên đổi theme không đổi JSON trang.
- **Quyền làm chủ dữ liệu.** Sản phẩm, giá, tồn kho, chi nhánh, xe, đơn hàng do WIM làm chủ; Studio chỉ đọc (và tạo đơn qua `POST /orders`), không lưu bản sao. Bảng trong DB của Studio: `pages`, `_pages_v`, `media`, `users*`, `contact_messages`, `site_settings`, `wim_settings*`, bảng nội bộ Payload.
- **Trình duyệt không gọi WIM.** Mọi gọi WIM đi qua server của site (loader của block, endpoint `/api/plugins/wim/*`).

## Luồng

- **Trang**: `pages.content` là JSON của Puck (collection có nháp/xuất bản/phiên bản của Payload). Trang công khai render bằng `Render` của Puck (RSC); với block có loader, server chạy loader rồi truyền kết quả vào prop `data`.
- **Đọc catalog (B)**: loader → cache TTL ngắn (bộ nhớ) → WIM. Site đúng chỉ với TTL; webhook (C, tùy chọn) xóa đúng mục cache. Lỗi tạm thời: dùng bản cache cũ (tối đa 10 phút); WIM lỗi hẳn: block báo lỗi thân thiện, phần nội dung Studio vẫn hiển thị.
- **Đặt đơn (D)**: `POST /api/plugins/wim/checkout` → kiểm tra lại tồn kho (không cache, theo chi nhánh nếu nhận tại chi nhánh) → Idempotency-Key = SHA-256(cartId + nội dung đơn) → `POST /v1/orders`; lỗi mạng/timeout thử lại tối đa 3 lần với cùng khóa. Hết hàng: 409, giữ giỏ.
- **Theo dõi đơn (E)**: `GET /v1/orders/{id}` qua cache; cần mã đơn + 4 số cuối điện thoại. Webhook `order.status_changed` làm mới ngay.
- **Webhook**: `POST /api/plugins/wim/webhook`; chữ ký HMAC-SHA256(secret, `timestamp.thân`) trong `X-Hosso-Signature`, `X-Hosso-Timestamp` lệch quá 5 phút thì từ chối.
- **Bí mật**: khóa API và bí mật webhook mã hóa AES-256-GCM (`HOSSO_ENCRYPTION_KEY`) khi lưu; API/admin chỉ trả dạng che; mã plugin dùng Web Crypto nên không kéo module Node vào bundle trình duyệt.

## Đa ngôn ngữ, quyền và endpoint (đợt 5)

- Ngôn ngữ: `src/proxy.ts` đọc tiền tố `/en` và đặt header `x-hosso-locale`; `lib/locale.ts` và store theo request của `@hosso/studio-blocks` (`i18n.ts`) cấp ngôn ngữ cho server; client dùng `LocaleProvider`/`useT`. Trường nội dung dùng `localization` của Payload (mảng không localize, nhãn bên trong có localize).
- Quyền: `lib/access.ts` (admin, publisher, editor, author, moderator).
- Endpoint tùy biến (`lib/endpoints.ts`): `/api/site/forms/:slug`, `/api/site/forms-export/:id`, `/api/site/comments`; giới hạn tần suất trong `lib/ratelimit.ts`.
- Định tuyến công khai gom về `app/(site)/[[...slug]]` + `views/` (trang, bài viết, chuyên mục/thẻ, tìm kiếm).
- Sidebar admin: `components/admin/Nav*.tsx` (thay `admin.components.Nav`), mục plugin qua `HossoPlugin.adminNav`.

## Vận hành (đợt 6)

- Gói site (`lib/site-package.ts` xuất, `lib/site-import.ts` nhập) dùng chung cho CLI (`studio:export/import`), sao lưu (`lib/backup.ts`, `studio:backup`) và trang Công cụ; endpoint admin: `/api/site/backup`, `/api/site/backups`, `/api/site/package-import`, `/api/site/template-install`.
- Link chia sẻ bản nháp: `lib/share.ts` (HMAC), endpoint `/api/site/share-link`; chuyển hướng: collection `redirects` + `lib/redirects.ts` (chỉ tra khi không tìm thấy nội dung); thông báo: `lib/notify.ts`; khóa sửa mềm: collection `edit-locks` + `/api/site/lock` (TTL 60 giây, gia hạn 25 giây/lần).
- Header bảo mật (nosniff, SAMEORIGIN, Referrer-Policy, Permissions-Policy) ở `next.config.ts` và `csrf` theo `HOSSO_PUBLIC_URL` ở cấu hình Payload.

## Giới hạn đã biết

- Giỏ hàng nằm ở trình duyệt (localStorage); cache là bộ nhớ trong một tiến trình (đủ cho một cài đặt = một site).
- Giới hạn tần suất là bộ nhớ trong một tiến trình (form, bình luận); checkout chỉ có ô bẫy bot.
- Puck còn ở 0.x.
