# Tạo block và plugin cho Hosso Studio
**Tiếng Việt** | [English](en/PLUGIN-GUIDE.md)

Bài này hướng dẫn thêm chức năng cho Studio theo hai mức:

1. **Block**: một khối dựng trang mới (ví dụ "Câu hỏi thường gặp"). Làm khi chỉ cần thêm cách hiển thị nội dung.
2. **Plugin**: một gói đăng ký qua `hosso.config.ts`, mang theo block, dữ liệu, trang cài đặt và endpoint riêng (ví dụ plugin WIM). Làm khi cần lấy dữ liệu từ hệ thống ngoài, thêm collection hoặc trang admin.

Tham khảo thực tế: `packages/plugin-wim` là plugin đầy đủ nhất. Xem thêm [ARCHITECTURE.md](ARCHITECTURE.md) và [PLUGIN-WIM.md](PLUGIN-WIM.md).

## 1. Hiểu mô hình: schema tách khỏi renderer

Đây là ý quan trọng nhất.

- **Schema** (`BlockSchema`) mô tả dữ liệu của block: tên, các field, giá trị mặc định. Schema không biết gì về giao diện.
- **Renderer** là component React vẽ block. Do **theme** cung cấp, hoặc plugin cung cấp bản dự phòng.
- Lúc chạy, `buildPuckConfig(schemas, theme)` ghép hai thứ lại thành cấu hình cho trình dựng Puck.

Nhờ vậy đổi theme thì nội dung trang (JSON lưu trong `pages.content`) không đổi, chỉ cách vẽ đổi.

Thứ tự tìm renderer cho một block (xem [puck-config.ts](../packages/blocks/src/puck-config.ts)):

1. Renderer của theme đang chọn.
2. Renderer dự phòng của lõi (`PostList`, `TrustBar`, `CategoryGrid`, `Form`, `Reusable`).
3. `fallbackRenderers` của plugin.
4. Không có: trong editor hiện khung "thiếu", ở trang công khai thì bỏ qua block.

## 2. Mức 1: thêm một block

### Kiểu field có sẵn

Khai báo trong `fields` ([types.ts](../packages/blocks/src/types.ts)):

| `type` | Dùng cho |
|---|---|
| `text`, `textarea`, `number` | Chữ ngắn, đoạn văn, số |
| `media` | Chọn ảnh từ thư viện Media (`kind: 'video'` cho video) |
| `ref` | Chọn một bản ghi của collection khác (cần `collection`) |
| `select`, `radio` | Chọn một trong danh sách `options` |
| `array` | Danh sách lặp (cần `arrayFields`, có thể có `defaultItemProps`) |

### Ví dụ: block "Câu hỏi thường gặp"

**Schema.** Thêm vào `packages/blocks/src/core-blocks.ts` nếu là block lõi:

```ts
export const faq: BlockSchema<{ heading: string; items: { q: string; a: string }[] }> = {
  type: 'Faq',
  label: 'Câu hỏi thường gặp',
  fields: {
    heading: { type: 'text', label: 'Tiêu đề' },
    items: {
      type: 'array',
      label: 'Câu hỏi',
      arrayFields: { q: { type: 'text', label: 'Câu hỏi' }, a: { type: 'textarea', label: 'Trả lời' } },
      defaultItemProps: { q: 'Câu hỏi mới', a: '' },
    },
  },
  defaultProps: { heading: 'Câu hỏi thường gặp', items: [] },
}
```

Rồi thêm `faq` vào mảng `coreBlocks` ở cuối file.

**Renderer.** Thêm vào `renderers` của mỗi theme muốn vẽ, hoặc vào `coreFallback` trong `puck-config.ts` nếu muốn mọi theme đều có sẵn:

```tsx
const Faq: BlockRenderer = ({ heading, items }) => (
  <section className="mt-wrap">
    {heading && <h2>{heading}</h2>}
    {(items ?? []).map((it: { q: string; a: string }, i: number) => (
      <details key={i}>
        <summary>{it.q}</summary>
        <p>{it.a}</p>
      </details>
    ))}
  </section>
)
```

Dùng thẻ `<details>` có sẵn của trình duyệt thay vì viết JavaScript. Trang công khai nhờ vậy nhẹ hơn.

**Lưu ý:**
- `type` là khóa lưu trong JSON trang. **Đừng đổi tên** sau khi đã có trang dùng, nếu không các trang cũ mất block.
- Nếu theme thiếu renderer cho block mới, trang công khai bỏ qua block đó. Hãy thêm renderer cho cả 3 theme có sẵn hoặc đưa vào `coreFallback`.
- Chuỗi hiển thị cố định (nút, nhãn) đặt trong `strings.vi.ts` và `strings.en.ts` rồi lấy bằng `t(...)`.

## 3. Mức 2: tạo plugin

### Cấu trúc

```
packages/plugin-my/
  package.json
  tsconfig.json
  src/
    index.ts        export default plugin (kiểu HossoPlugin)
    blocks.ts       schema block của plugin
    renderers.tsx   renderer dự phòng
    loaders.ts      lấy dữ liệu server cho block
    styles.ts       CSS của renderer dự phòng
    payload.ts      collection, global, endpoint thêm vào Payload
```

`package.json` theo mẫu `plugin-wim`:

```json
{
  "name": "@hosso/plugin-my",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc -p ." },
  "dependencies": { "@hosso/studio-blocks": "workspace:*" },
  "peerDependencies": { "react": "19.3.1" },
  "devDependencies": {
    "@types/react": "19.3.0",
    "payload": "3.91.0",
    "react": "19.3.1",
    "typescript": "5.9.3"
  }
}
```

`tsconfig.json`:

```json
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
```

Không có bước build: package phát hành TypeScript nguồn, `next.config.ts` tự nhận mọi `@hosso/*`.

### Object plugin

Plugin là một object kiểu `HossoPlugin`. Mọi trường trừ `id` đều tùy chọn, chỉ khai báo cái bạn cần:

```ts
import type { HossoPlugin } from '@hosso/studio-blocks'

const plugin: HossoPlugin = {
  id: 'my',
  blocks: myBlocks,                    // schema block
  fallbackRenderers,                   // renderer khi theme không vẽ riêng
  css,                                 // CSS cho renderer dự phòng
  loaders: { MyBlock: loadMyBlock },   // dữ liệu server cho block
  headerSlot: MyHeaderItem,            // chèn vào header (ví dụ giỏ hàng)
  payload: applyPayload,               // thêm collection/global/endpoint
  portable: { globals: [{ slug: 'my-settings', secretFields: ['apiKey'] }] },
  checklist: async (payload) => [{ label: 'Kết nối dịch vụ X', done: false, href: '/admin/globals/my-settings' }],
  search: async (query, payload) => [{ title: '...', href: '/...' }],
}
export default plugin
```

| Trường | Làm gì |
|---|---|
| `blocks` | Thêm block vào trình dựng |
| `fallbackRenderers` | Vẽ block khi theme không có renderer riêng. Bắt buộc có nếu muốn block chạy được với mọi theme |
| `css` | CSS cho renderer dự phòng. Chỉ dùng biến `--hs-*` để theo theme đang chọn |
| `loaders` | Hàm chạy trên server, lấy dữ liệu rồi truyền vào renderer qua prop `data` |
| `headerSlot` | Component chèn vào header, chạy ở trình duyệt |
| `payload` | Hàm nhận cấu hình Payload và trả cấu hình mới (thêm collection, global, endpoint) |
| `portable` | Global của plugin được đưa vào gói export/import. `secretFields` **không bao giờ** vào gói |
| `checklist` | Thêm bước vào "Hướng dẫn bắt đầu" ở dashboard admin |
| `search` | Đưa kết quả của plugin vào trang tìm kiếm `/tim-kiem` |

### Loader: lấy dữ liệu cho block

Trình duyệt không gọi API ngoài. Server chạy loader rồi truyền kết quả vào prop `data` của renderer.

```ts
import type { BlockLoader } from '@hosso/studio-blocks'

export const loadMyBlock: BlockLoader = async (props, ctx) => {
  // ctx: payload, searchParams, cookies, locale
  try {
    const res = await fetch(`https://api.example.com/items?q=${ctx.searchParams.q ?? ''}`)
    if (!res.ok) return { status: 'error', kind: 'upstream' }
    return { status: 'ok', items: await res.json() }
  } catch {
    return { status: 'error', kind: 'unreachable' }
  }
}
```

Quy tắc nên theo (đúng theo cách `plugin-wim` làm với `guarded`):

- Luôn trả `{ status: 'ok', ... }` hoặc `{ status: 'error', kind }`, **không ném lỗi** ra ngoài. Hệ thống ngoài chết thì block báo lỗi thân thiện, còn phần nội dung còn lại của trang vẫn hiện.
- Trả `{ status: 'loading' }` hoặc để `data` rỗng được xử lý ở renderer, đừng giả định `data` luôn có.

Renderer đọc dữ liệu:

```tsx
const MyBlock: BlockRenderer = ({ heading, data }) => {
  if (data?.status === 'error') return <p role="status">Không tải được dữ liệu.</p>
  return <ul>{data?.items?.map((i: any) => <li key={i.id}>{i.name}</li>)}</ul>
}
```

### Thêm collection, global, endpoint vào Payload

```ts
import type { Config } from 'payload'

export const applyPayload = (config: Config): Config => ({
  ...config,
  globals: [...(config.globals ?? []), MySettings],
  endpoints: [...(config.endpoints ?? []), ...myEndpoints],
})
```

Khi làm trang cài đặt cho plugin:

- Chỉ cho `admin` đọc và ghi (xem `WimSettings` trong `plugin-wim/src/payload.ts`).
- Khóa API, bí mật webhook phải **mã hóa khi lưu** và **che khi trả ra API/admin**. `plugin-wim` làm bằng hook `beforeChange` và `afterRead`, mã hóa AES-256-GCM với `HOSSO_ENCRYPTION_KEY`. Dùng lại cách này, đừng lưu bí mật dạng văn bản thường.
- Liệt kê global vào `portable` và ghi các trường bí mật vào `secretFields`, để gói export không lộ khóa.

### Ràng buộc môi trường

Phần khai báo plugin chạy được ở **cả server và trình duyệt** (editor cũng nạp nó). Vì vậy:

- Không import module chỉ có ở Node (`fs`, `crypto` của Node...). Dùng Web Crypto và `fetch`.
- Phần chỉ chạy server (loader, endpoint) vẫn có thể gọi API ngoài, nhưng đừng để nó lọt vào bundle trình duyệt.
- Dữ liệu và bí mật không đưa xuống client. Chỉ truyền cho renderer phần cần hiển thị.

### Đăng ký plugin

Thêm vào `apps/studio/package.json`:

```json
"@hosso/plugin-my": "workspace:*",
```

Khai báo trong `apps/studio/hosso.config.ts` (đây là **chỗ duy nhất** được nhắc plugin trong lõi):

```ts
import my from '@hosso/plugin-my'

export default defineHossoConfig({
  // ...
  plugins: [wim, my],
})
```

Rồi:

```bash
pnpm install
pnpm dev
```

`pnpm dev` tự chạy `generate:importmap` của Payload trước khi khởi động.

### Phiếu thông tin và bật/tắt plugin

Mỗi plugin có tệp `hosso.json` ở thư mục gốc (id, loại `plugin`, tên và mô tả vi/en, version, trang quản lý, `needsBuild`). Plugin nạp tệp này vào `manifest` của đối tượng plugin; trang **Quản lý plugin** trong admin (`/admin/plugins`) liệt kê plugin đã cài từ đó. Xem mẫu ở `packages/plugin-affiliate`.

Biến `NEXT_PUBLIC_HOSSO_PLUGINS` (id cách nhau bằng dấu phẩy, ví dụ `wim,shipping`) chọn plugin nào bật; để trống là bật tất cả. Next nhúng biến này lúc build nên đổi giá trị cần dựng lại. Tắt một plugin giống gỡ nó: ở chế độ dev Payload hỏi xác nhận xóa bảng của plugin lúc khởi động.

### Gỡ plugin

Xóa dòng import và mục trong `plugins` ở `hosso.config.ts`. Site vẫn chạy, block của plugin bị bỏ qua. Ở chế độ dev, Payload có thể hỏi xác nhận xóa bảng cài đặt của plugin lúc khởi động. Đây là hành vi mong muốn: hãy thử cả việc gỡ plugin của bạn để chắc chắn site không sập.

## 4. Quy tắc bắt buộc

- **Lõi không phụ thuộc plugin.** `apps/studio/src`, `packages/blocks` và `packages/theme-*` không được nhắc tên plugin. Kiểm tra bằng `pnpm check:boundaries`. Nếu plugin mới của bạn nằm ngoài danh sách đã biết, hãy chắc rằng script vẫn bắt được vi phạm.
- **Dữ liệu nào của hệ thống ngoài thì để ở hệ thống ngoài.** Đừng sao chép sản phẩm, đơn hàng... vào DB của Studio. Đọc qua loader, cache ngắn.
- **Bí mật luôn mã hóa và che.** Xem mục trên.
- **Thất bại phải êm.** Hệ thống ngoài lỗi thì chỉ block đó báo lỗi, trang vẫn lên.
- **Giấy phép.** Thư viện mới phải là MIT, Apache-2.0, BSD hoặc ISC. Ghi vào [LICENSES.md](LICENSES.md).
- **Chuỗi giao diện** đặt trong file strings của plugin (như `strings.vi.ts` và `strings.en.ts` của `plugin-wim`), không viết cứng.

## 5. Kiểm tra

```bash
pnpm typecheck
pnpm check:boundaries
pnpm dev
```

Danh sách cần thử bằng tay:

1. Block mới có trong trình dựng, kéo vào trang, chỉnh được thuộc tính, xuất bản xong trang công khai hiển thị đúng.
2. Đổi giữa các theme: block vẫn hiện đúng và nội dung không mất.
3. Tắt hoặc làm hỏng hệ thống ngoài: block báo lỗi, phần còn lại của trang bình thường.
4. Gỡ plugin khỏi `hosso.config.ts`: `/` và `/admin` vẫn trả 200, trang có block của plugin vẫn mở được.
5. Xuất rồi nhập gói site (`pnpm studio:export`, `pnpm studio:import`) và xác nhận không có khóa bí mật trong gói.

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| Block không có trong trình dựng | Chưa đưa vào `blocks` của plugin (hoặc `coreBlocks` nếu là block lõi) |
| Trong editor hiện khung "thiếu" | Không có renderer: thiếu trong theme, `coreFallback` và `fallbackRenderers` |
| `data` luôn `undefined` | Tên khóa trong `loaders` không trùng `type` của block |
| Trang công khai trắng ở chỗ block | Loader ném lỗi thay vì trả `{ status: 'error' }` |
| Lỗi khi build về module Node | Plugin import `fs`, `crypto`... trong phần chạy cả ở trình duyệt |
| Plugin mới không nạp | Chưa `pnpm install` sau khi thêm dependency, hoặc chưa thêm vào `plugins` |
