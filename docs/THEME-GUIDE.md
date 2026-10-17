# Tạo theme cho Hosso Studio

Theme quyết định **giao diện** của site: màu, font, header, footer và cách hiển thị từng block. Theme không chứa nội dung. Đổi theme thì nội dung các trang giữ nguyên, chỉ cách vẽ thay đổi.

Bài này hướng dẫn tạo một theme mới tên `my-theme` từ đầu. Các theme có sẵn để đối chiếu:

| Theme | Thư mục | Ghi chú |
|---|---|---|
| Sáng & Sạch | `packages/theme-default` | Theme mặc định |
| Kỹ thuật tối | `packages/theme-alt` | Nhỏ gọn, dễ đọc nhất để học |
| Cửa hàng phụ tùng | `packages/theme-shop` | Header hai tầng, tìm kiếm, giỏ hàng |

## 1. Theme gồm những gì

```
packages/theme-my-theme/
  package.json     khai báo package, phụ thuộc @hosso/studio-blocks
  tsconfig.json    kế thừa tsconfig.base.json
  theme.json       tên, tiêu đề, token (màu, font, bo góc, khoảng cách)
  preview.svg      ảnh xem trước
  src/
    index.tsx      renderer cho từng block + header/footer, export theme
    styles.ts      CSS của theme
```

Một theme là một object kiểu `Theme` ([types.ts](../packages/blocks/src/types.ts)):

```ts
type Theme = {
  manifest: ThemeManifest                     // nội dung theme.json
  css: string                                 // CSS, dùng biến --hs-*
  renderers: Record<string, BlockRenderer>    // tên block -> component
  layout?: { Header; Footer }                 // khung site
}
```

## 2. Các bước

### Bước 1. Sao chép theme gần nhất

Cách nhanh nhất là copy `theme-alt`:

```bash
cp -r packages/theme-alt packages/theme-my-theme
rm -rf packages/theme-my-theme/node_modules
```

### Bước 2. Sửa `package.json`

Đổi `name` thành `@hosso/theme-my-theme`. Giữ nguyên phần còn lại:

```json
{
  "name": "@hosso/theme-my-theme",
  "version": "0.1.0",
  "private": true,
  "license": "Apache-2.0",
  "type": "module",
  "exports": {
    ".": "./src/index.tsx",
    "./theme.json": "./theme.json"
  },
  "scripts": { "typecheck": "tsc -p ." },
  "dependencies": { "@hosso/studio-blocks": "workspace:*" },
  "peerDependencies": { "react": "19.3.1" },
  "devDependencies": {
    "@types/react": "19.3.0",
    "react": "19.3.1",
    "typescript": "5.9.3"
  }
}
```

Package workspace phát hành mã TypeScript nguồn, không có bước build riêng. `next.config.ts` tự nhận mọi package `@hosso/*` nên bạn không phải sửa gì ở đó.

### Bước 3. Sửa `theme.json`

```json
{
  "name": "my-theme",
  "title": "Theme của tôi",
  "version": "0.1.0",
  "studio": "^0.1.0",
  "preview": "preview.svg",
  "pluginBlocks": [],
  "tokens": {
    "colors": {
      "bg": "#ffffff",
      "surface": "#f5f6f8",
      "text": "#14181f",
      "muted": "#5b6573",
      "primary": "#d71920",
      "onPrimary": "#ffffff",
      "border": "#e2e5ea"
    },
    "fonts": { "body": "be-vietnam-pro", "heading": "be-vietnam-pro" },
    "radius": "6px",
    "spacing": "1rem"
  }
}
```

Giải thích:

- `name`: mã định danh, viết thường, không dấu cách. Nó cũng là khóa lưu tùy chỉnh theme trong admin, nên **đừng đổi sau khi đã có người dùng**.
- `title`: tên hiện trong admin.
- `studio`: khoảng phiên bản Studio tương thích.
- `pluginBlocks`: danh sách tên block của plugin mà theme có renderer riêng. Để `[]` nếu theme không vẽ riêng block plugin (khi đó plugin dùng renderer dự phòng).
- `tokens.colors`: mỗi khóa thành một biến CSS `--hs-<tên-kebab>`. Ví dụ `onPrimary` thành `--hs-on-primary`.
- `tokens.fonts`: chọn trong `be-vietnam-pro`, `barlow`, `jetbrains-mono` (định nghĩa ở `FONTS` trong `types.ts`). Muốn font khác thì phải khai báo thêm trong app, đây là thay đổi ở lõi.
- `radius`, `spacing`: thành `--hs-radius` và `--hs-space`.

Người quản trị có thể ghi đè các token này trong Admin → Giao diện site. Để trống ô nào thì dùng giá trị trong `theme.json`.

### Bước 4. Viết CSS trong `src/styles.ts`

```ts
export const css = `
.hs-theme{background:var(--hs-bg);color:var(--hs-text);font-family:var(--hs-font-body);line-height:1.65}
.hs-theme a{color:var(--hs-primary)}
.mt-wrap{max-width:72rem;margin:0 auto;padding:0 var(--hs-space)}
`
```

Quy tắc:

- Toàn bộ nội dung nằm trong `.hs-theme`. Màu, font, bo góc, khoảng cách **chỉ lấy từ biến `--hs-*`**, không viết cứng, để admin đổi được.
- Đặt tiền tố riêng cho class (ví dụ `mt-`) để không đụng class của theme khác.
- Viết mobile-first, dùng `@media(min-width:48rem)` cho màn rộng.
- Giữ `:focus-visible` rõ ràng, để người dùng bàn phím dùng được.

### Bước 5. Viết renderer trong `src/index.tsx`

Mỗi renderer là một component nhận props của block, cộng thêm `id`. Tên khóa trong `renderers` phải trùng `type` của block.

```tsx
import { Rich, SiteNav, t, type BlockRenderer, type SiteChrome, type Theme, type ThemeManifest } from '@hosso/studio-blocks'
import manifest from '../theme.json'
import { css } from './styles'

const Hero: BlockRenderer = ({ title, subtitle, ctaLabel, ctaHref, image }) => (
  <section className="mt-hero">
    {image && <img src={image} alt="" fetchPriority="high" decoding="async" />}
    <div className="mt-wrap">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {ctaLabel && <a href={ctaHref || '#'}>{ctaLabel}</a>}
    </div>
  </section>
)

const Text: BlockRenderer = ({ heading, body }) => (
  <section className="mt-wrap">
    <h2>{heading}</h2>
    <Rich text={String(body ?? '')} />
  </section>
)

export const theme: Theme = {
  manifest: manifest as ThemeManifest,
  css,
  renderers: { Hero, Text /* Image, Video, Features, ContactForm, Footer */ },
  layout: { Header, Footer }, // xem bước 6
}

export default theme
```

Block lõi mà theme nên có renderer: `Hero`, `Text`, `Image`, `Video`, `Features`, `ContactForm`, `Footer`. Nếu theme **không** có renderer cho một block, Studio dùng bản dự phòng của lõi (`PostList`, `TrustBar`, `CategoryGrid`, `Form`, `Reusable`) hoặc của plugin. Theme chưa vẽ đủ block thì site vẫn chạy.

Dùng sẵn các thành phần chung từ `@hosso/studio-blocks` thay vì tự viết lại:

| Thành phần | Dùng để |
|---|---|
| `Rich` | Hiển thị văn bản có **đậm**, *nghiêng*, liên kết, danh sách |
| `SiteNav` | Menu hai cấp có dropdown |
| `VideoEmbed` | Nhúng YouTube/Vimeo hoặc tệp video |
| `t('khóa')` | Lấy chuỗi giao diện theo ngôn ngữ hiện tại (vi/en) |

Chuỗi hiển thị cho người dùng nên lấy qua `t(...)`, không viết cứng tiếng Việt trong component, để site đa ngôn ngữ chạy đúng.

Ghi chú về form liên hệ: form gửi `POST /api/contact` với các trường `name`, `phone`, `message` và một ô bẫy bot `website` (ẩn bằng class `hs-hp`). Giữ nguyên các tên này, nếu không form sẽ không hoạt động.

### Bước 6. Header và footer

`layout.Header` và `layout.Footer` nhận `chrome` (dữ liệu từ Admin → Giao diện site) kiểu `SiteChrome`:

- `siteName`, `logoUrl`, `announcement`
- `headerMenu`, `footerMenu` (tối đa hai cấp)
- `contact` (điện thoại, email, địa chỉ, Zalo), `social`
- `search` (có hiện ô tìm không), `homeHref`, `searchHref`

`Header` còn nhận `actions`: phần plugin chèn thêm, ví dụ liên kết giỏ hàng. Hãy render nó ở chỗ bạn muốn, nếu không giỏ hàng sẽ không hiện.

Dùng `chrome.homeHref` và `chrome.searchHref` cho liên kết, đừng viết cứng `/`, vì site có nhiều ngôn ngữ (`/en`).

### Bước 7. Đăng ký theme

Thêm package vào `apps/studio/package.json`:

```json
"@hosso/theme-my-theme": "workspace:*",
```

Rồi khai báo trong `apps/studio/hosso.config.ts`:

```ts
import myTheme from '@hosso/theme-my-theme'

export default defineHossoConfig({
  // ...
  themes: [defaultTheme, altTheme, shopTheme, myTheme],
})
```

Theme **đầu tiên** trong mảng `themes` là theme mặc định của site mới.

Cài lại để pnpm nối package mới:

```bash
pnpm install
```

### Bước 8. Kiểm tra

```bash
pnpm typecheck
pnpm check:boundaries
pnpm dev
```

Sau đó vào Admin → Giao diện site → tab "Giao diện" → chọn "Theme của tôi". Mở site, mở trình dựng (`/editor/<id>`) để xem từng block, thử chuyển giữa xem trước điện thoại, máy tính bảng, máy tính.

Danh sách kiểm tra trước khi coi là xong:

- Mọi màu, font, bo góc, khoảng cách lấy từ biến `--hs-*` (đổi token trong admin thì giao diện đổi theo).
- Đổi qua lại giữa theme của bạn và theme mặc định: nội dung các trang không đổi.
- Trang vẫn đọc được khi chưa có plugin nào (gỡ `wim` khỏi `hosso.config.ts` để thử).
- Điều hướng bằng bàn phím được, focus nhìn thấy.
- Ảnh có `alt`, ảnh hero đầu trang có `fetchPriority="high"`, ảnh còn lại có `loading="lazy"`.

## 3. Hỗ trợ block của plugin

Plugin như WIM mang theo block riêng (lưới sản phẩm, giỏ hàng, ...) và **tự có renderer dự phòng**, vẽ bằng biến `--hs-*` nên đã hợp với mọi theme. Vì vậy theme không bắt buộc làm gì.

Nếu muốn vẽ riêng một block plugin cho đẹp hơn:

1. Thêm renderer cùng tên block vào `renderers` của theme. Renderer của theme được ưu tiên hơn bản dự phòng.
2. Ghi tên block đó vào `pluginBlocks` trong `theme.json`.

Dữ liệu động của block plugin (sản phẩm, giá) đến qua prop `data` do server chạy loader rồi truyền vào. Theme chỉ hiển thị, không gọi API.

## 4. Ranh giới cần giữ

- Theme **không được import từ plugin** (ví dụ `@hosso/plugin-wim`). `pnpm check:boundaries` sẽ báo lỗi.
- Theme không đọc DB, không gọi API. Mọi dữ liệu đi qua props.
- Theme không sửa schema block. Thêm hoặc đổi field là việc của `packages/blocks` (xem [PLUGIN-GUIDE.md](PLUGIN-GUIDE.md) nếu block thuộc plugin).

## 5. Lỗi thường gặp

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Theme không hiện trong danh sách chọn | Chưa thêm vào `themes` trong `hosso.config.ts`, hoặc chưa chạy `pnpm install` sau khi thêm dependency |
| Block hiện khung "thiếu" trong editor | Tên khóa trong `renderers` không trùng `type` của block |
| Đổi màu trong admin không có tác dụng | CSS viết cứng màu thay vì dùng `var(--hs-...)` |
| Menu hoặc giỏ hàng không hiện | `Header` không render `SiteNav` hoặc `actions` |
| Lỗi kiểu khi import `theme.json` | Thiếu `"include": ["src", "theme.json"]` trong `tsconfig.json` |
