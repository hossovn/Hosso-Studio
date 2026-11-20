# Kiến trúc Hosso Studio
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
- **Quyền làm chủ dữ liệu.** Sản phẩm local do plugin shop quản lý; hàng WIM/nhà cung cấp giữ quyền giá và kho tại nguồn. Studio có catalog tổng hợp, đơn hàng và trạng thái điều phối riêng; checkout xác minh lại dữ liệu nguồn. Không coi cache catalog là nguồn kho chuẩn.
- **Trình duyệt không gọi WIM.** Mọi gọi WIM đi qua server của site (loader của block, endpoint `/api/plugins/wim/*`).

## Luồng

- **Trang**: `pages.content` là JSON của Puck (collection có nháp/xuất bản/phiên bản của Payload). Trang công khai render bằng `Render` của Puck (RSC); với block có loader, server chạy loader rồi truyền kết quả vào prop `data`.
- **Đọc catalog (B)**: loader → cache TTL ngắn (bộ nhớ) → WIM. Site đúng chỉ với TTL; webhook (C, tùy chọn) xóa đúng mục cache. Lỗi tạm thời: dùng bản cache cũ (tối đa 10 phút); WIM lỗi hẳn: block báo lỗi thân thiện, phần nội dung Studio vẫn hiển thị.
- **Đặt đơn**: shop quote/checkout xác minh sản phẩm, biến thể, giá, tồn kho và quote; khóa idempotency bảo vệ gửi lặp. Transaction giữ đơn, giữ kho local và intent; các bước điều phối/recovery theo dõi lỗi nguồn và tác vụ còn dang dở. Luồng WIM dùng hợp đồng commerce để nối nguồn.
- **Theo dõi đơn**: đơn Studio dùng mã đơn và lookup token riêng tư; tài khoản có thể đọc những đơn được gắn đúng chủ sở hữu. Không dùng bốn số điện thoại làm quyền truy cập đơn Studio.
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

## Nền tảng landing, CMS và commerce

- `HossoPlugin` tách định nghĩa browser khỏi adapter server; `runtimeSlot` mount một lần ở layout công khai để đồng bộ giỏ không phụ thuộc số header. Package private được installer đăng ký, không nhập trực tiếp từ lõi.
- `loadEntryRepeater` lọc/sắp xếp/phân trang tại DB. `content-binding` bind trường tùy chỉnh; `/noi-dung/:kind/:slug` render detail template của content type, kèm metadata/sitemap và kiểm tra published.
- `form-submissions` và `form-deliveries` lưu trong transaction. Worker có lease/backoff, quản trị theo dõi qua `/admin/leads`. Analytics của lead đi qua job riêng để lỗi kho đo lường không làm mất lead.
- Analytics kiểm tra consent/DNT/GPC ở server; assignment A/B ổn định theo experiment/revision, conversion nghiệp vụ được xác nhận ở server.
- `shop-saved-carts` có owner/revision/generation; `shop-returns` có revision và lịch sử, cập nhật kho/ledger trong transaction. Ảnh bằng chứng nằm ở volume private với endpoint kiểm tra quyền.
- Ảnh responsive dùng `@napi-rs/image`, WebP/AVIF, cache/ETag và giới hạn giải mã. Motion dùng breakpoint 600/1024px, reduced motion và scheduler đọc/ghi chung; background video tải khi cần, có poster và pause.
- Bộ website nhập additive, mặc định nháp. Readiness và publish checks kiểm tra nội dung, breakpoint thực tế và cấu hình vận hành. Xem [hướng dẫn vận hành](studio-platform-operations.md).

## Giới hạn đã biết

- Giỏ khách nằm trong localStorage, giỏ tài khoản đồng bộ server. Cache WIM hiện có vẫn theo tiến trình; nội dung/giá cá nhân không được đưa vào cache công khai dùng chung.
- Form/bình luận còn có giới hạn tần suất theo tiến trình. Luồng commerce dùng bucket DB và transaction; proxy phải ghi đè header IP đã cấu hình.
- Dịch vụ SMTP/GHN/SePay/WIM và phục hồi backup phải được nghiệm thu trên môi trường triển khai. Mẫu performance local không chứng minh Core Web Vitals p75 của người dùng thật.
- Puck còn ở 0.x.
