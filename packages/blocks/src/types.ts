import type React from 'react'
import type { ComponentType } from 'react'
import type { Config, Payload } from 'payload'

/** Field của block: tập con tương thích với field của Puck (slice 2 truyền thẳng vào Puck). */
export type BlockField =
  | { type: 'text' | 'textarea' | 'number'; label?: string; /** Sửa chữ trực tiếp trên canvas của trình dựng (chỉ nên bật khi renderer chỉ in giá trị ra JSX). */ contentEditable?: boolean }
  | { type: 'media'; label?: string; kind?: 'image' | 'video' }
  | { type: 'ref'; label?: string; collection: string }
  | { type: 'select' | 'radio'; label?: string; options: { label: string; value: string | number | boolean }[] }
  | { type: 'array'; label?: string; arrayFields: Record<string, BlockField>; defaultItemProps?: Record<string, unknown> }

/** Schema của block: dữ liệu + thuộc tính. Không biết gì về cách hiển thị. */
export type BlockSchema<P extends Record<string, unknown> = Record<string, unknown>> = {
  type: string
  label: string
  fields: Record<keyof P & string, BlockField>
  defaultProps: P
}

/** Một mục menu (tối đa hai cấp). */
export type MenuItem = { label: string; href: string; children?: { label: string; href: string }[] }

/** Dữ liệu khung site (header, footer) lấy từ trang "Cài đặt site" trong admin. */
export type SiteChrome = {
  siteName: string
  logoUrl?: string
  announcement?: string
  headerMenu: MenuItem[]
  footerMenu: MenuItem[]
  footerText?: string
  contact: { phone?: string; email?: string; address?: string; zalo?: string }
  social: { label: string; href: string }[]
  /** Hiện ô tìm kiếm trên header. */
  search: boolean
  /** Liên kết trang chủ và trang tìm kiếm theo ngôn ngữ hiện tại (ví dụ "/" hoặc "/en"). */
  homeHref: string
  searchHref: string
}

/** Header/footer do theme cung cấp. `actions` là phần do plugin chèn thêm (ví dụ giỏ hàng). */
export type ThemeLayout = {
  Header: ComponentType<{ chrome: SiteChrome; actions?: React.ReactNode }>
  Footer: ComponentType<{ chrome: SiteChrome }>
}

/** Renderer của block do theme cung cấp. `id` là id của block trong JSON trang. */
export type BlockRenderer<P = any> = ComponentType<P & { id: string }>

/** Font có sẵn (khai báo bằng next/font trong app). Quản trị viên chọn trong admin. */
export const FONTS = {
  'be-vietnam-pro': 'Be Vietnam Pro',
  barlow: 'Barlow',
  'jetbrains-mono': 'JetBrains Mono',
} as const
export type FontId = keyof typeof FONTS

export type ThemeTokens = {
  colors: Record<string, string>
  fonts: { body: FontId; heading: FontId }
  radius: string
  spacing: string
}

/** Nội dung file theme.json. */
export type ThemeManifest = {
  name: string
  title: string
  version: string
  /** Khoảng phiên bản Studio tương thích, ví dụ "^0.1.0". */
  studio: string
  preview?: string
  /** Block của plugin mà theme hỗ trợ (tên block). */
  pluginBlocks: string[]
  tokens: ThemeTokens
}

export type Theme = {
  manifest: ThemeManifest
  /** CSS của theme, dùng biến --hs-* do token sinh ra. */
  css: string
  renderers: Record<string, BlockRenderer>
  layout?: ThemeLayout
}

export type HossoBrand = {
  name: string
  company: string
  color: string
  /** Wordmark dùng làm logo trong admin. */
  logo: string
  /** Ký hiệu vuông (chữ H) cho chỗ nhỏ. */
  mark: string
  favicon: string
}

/** Ngữ cảnh khi lấy dữ liệu server cho block. */
export type LoadContext = {
  payload: Payload
  searchParams: Record<string, string | string[] | undefined>
  cookies: Record<string, string>
  /** Ngôn ngữ của yêu cầu (mã trong hosso.config.ts). */
  locale: string
}

export type BlockLoader = (props: Record<string, any>, ctx: LoadContext) => Promise<unknown>

/**
 * Plugin đăng ký qua hosso.config.ts. Phần này chạy được ở cả server và trình duyệt (editor),
 * nên mã plugin không được import module chỉ có ở Node lúc chạy (dùng Web Crypto, fetch).
 */
/** Một dòng hàng trong đơn. */
export type OrderLine = { productId: string; variantId?: string; name: string; code?: string; price: number; quantity: number }

/** Khoản cộng/trừ vào tổng đơn do plugin thêm (phí ship > 0, giảm giá < 0). */
export type OrderAdjustment = { label: string; amount: number; source: string }

export type OrderCustomer = { name: string; phone: string; address?: string; email?: string }

/** Đơn đang soạn lúc thanh toán (chưa lưu). Plugin bán hàng tạo, các plugin khác điều chỉnh qua `hooks.beforeOrder`. */
export type OrderDraft = {
  items: OrderLine[]
  subtotal: number
  adjustments: OrderAdjustment[]
  customer: OrderCustomer
  fulfillment: { type: 'delivery' | 'pickup' }
  /** Cách thanh toán khách chọn: 'cod', 'bank', ... (plugin thanh toán có thể thêm). */
  payment: string
  /** Dữ liệu thô từ trình duyệt cho plugin đọc (ví dụ mã giảm giá: meta.voucher). */
  meta: Record<string, unknown>
}

/** Hook `beforeOrder` có thể từ chối đơn (ví dụ mã giảm giá sai) bằng cách trả `{ reject }`. */
export type BeforeOrderResult = void | { reject: { code: string; message: string } }
export type BeforeOrderEvent = { payload: Payload; headers: Headers; draft: OrderDraft; source: string }

/** Sự kiện đặt đơn thành công. Plugin bán hàng (ví dụ Cửa hàng) phát ra, plugin khác (affiliate, giao vận, thanh toán...) lắng nghe qua `hooks`. */
export type OrderPlacedEvent = {
  payload: Payload
  /** Yêu cầu đặt đơn gốc: đọc cookie, header (ví dụ mã giới thiệu). */
  headers: Headers
  order: { id: string; total: number; status: string }
  customer: OrderCustomer
  /** Nhận tại chi nhánh hay giao tận nơi. */
  fulfillment: { type: 'delivery' | 'pickup' }
  items?: OrderLine[]
  subtotal?: number
  adjustments?: OrderAdjustment[]
  payment?: string
  /** Dữ liệu thô từ trình duyệt (xem OrderDraft.meta). */
  meta?: Record<string, unknown>
  /** Plugin phát sự kiện. */
  source: string
}

/** Hook `onOrderPlaced` có thể trả `{ redirectUrl }` để đưa khách sang cổng thanh toán. */
export type OrderPlacedResult = void | { redirectUrl?: string }

export type OrderStatusChangedEvent = { payload: Payload; order: { id: string; total: number; status: string; customer?: OrderCustomer }; from: string; to: string; source: string }

/** Plugin thanh toán báo đơn đã được thanh toán. Plugin bán hàng đánh dấu đơn, plugin thông báo gửi tin. */
export type OrderPaidEvent = { payload: Payload; orderNo: string; amount: number; reference?: string; source: string }

/** Plugin bổ sung thông tin hiển thị cho khách khi tra cứu đơn (ví dụ mã QR chuyển khoản). */
export type DescribeOrderEvent = { payload: Payload; order: { id: string; total: number; status: string; payment: string; paymentStatus: string } }
export type OrderExtras = { payment?: { qrUrl?: string; note?: string } }

export type HossoPlugin = {
  id: string
  /** Phiếu thông tin hiện ở trang Plugin trong admin (nạp từ hosso.json của plugin). */
  manifest?: PluginManifest
  blocks?: BlockSchema<any>[]
  /** Renderer dự phòng khi theme không hỗ trợ block của plugin. */
  fallbackRenderers?: Record<string, BlockRenderer>
  /** Phần chèn vào header (ví dụ liên kết giỏ hàng); chạy ở trình duyệt. */
  headerSlot?: ComponentType
  /** Mục hiện trong nhóm "Plugin" của sidebar admin. */
  adminNav?: { label: string; href: string; roles?: string[] }[]
  /** Bản tiếng Anh cho nhãn tiếng Việt của plugin trong trình dựng và màn Widget (khóa = nhãn tiếng Việt). */
  adminEn?: Record<string, string>
  /** CSS của renderer dự phòng, dùng biến --hs-*. */
  css?: string
  /** Thêm collection, global, endpoint vào Payload (chỉ chạy lúc dựng cấu hình Payload). */
  payload?: (config: Config) => Config
  /** Global của plugin được đưa vào gói export/import; `secretFields` không bao giờ vào gói. */
  portable?: {
    globals?: { slug: string; secretFields: string[] }[]
    /** Dữ liệu riêng của plugin (ví dụ danh mục và sản phẩm của Cửa hàng): xuất ra `data/plugins/<id>.json` và nhập lại sau media. */
    data?: { id: string; export: (payload: Payload) => Promise<unknown>; import: (payload: Payload, data: any) => Promise<void> }[]
  }
  /** Các bước cài đặt hiện trên dashboard admin (ví dụ "Kết nối WIM"). */
  checklist?: (payload: Payload) => Promise<{ label: string; done: boolean; href: string }[]>
  /** Tìm kiếm trên site: trả kết quả của plugin (ví dụ sản phẩm). */
  search?: (query: string, payload: Payload) => Promise<{ title: string; href: string; description?: string }[]>
  /** Móc vào sự kiện của lõi/plugin khác. Lỗi trong hook chỉ được ghi log, không làm hỏng đơn hàng. */
  hooks?: {
    beforeOrder?: (e: BeforeOrderEvent) => Promise<BeforeOrderResult>
    onOrderPlaced?: (e: OrderPlacedEvent) => Promise<OrderPlacedResult>
    onOrderStatusChanged?: (e: OrderStatusChangedEvent) => Promise<void>
    onOrderPaid?: (e: OrderPaidEvent) => Promise<void>
    describeOrder?: (e: DescribeOrderEvent) => Promise<OrderExtras | void>
  }
  /** Đường dẫn của plugin đưa vào sitemap.xml (ví dụ trang sản phẩm). */
  sitemap?: (payload: Payload) => Promise<{ path: string; lastModified?: string }[]>
  /** Lấy dữ liệu server cho block: kết quả được truyền vào renderer qua prop `data`. */
  loaders?: Record<string, BlockLoader>
}

export type HossoLocale = { code: string; label: string }

export type HossoConfig = {
  brand: HossoBrand
  /** Ngôn ngữ của site; ngôn ngữ đầu tiên là mặc định (URL không có tiền tố). */
  locales: HossoLocale[]
  themes: Theme[]
  /** Plugin cài vào site. Biến NEXT_PUBLIC_HOSSO_PLUGINS (id cách nhau bằng dấu phẩy) chọn plugin nào bật; để trống là bật tất cả. */
  plugins: HossoPlugin[]
}

/** Phiếu thông tin của plugin (`hosso.json` trong thư mục plugin): nguồn cho trang Plugin trong admin và cho Store. */
export type PluginManifest = {
  id: string
  type: 'plugin'
  name: { vi: string; en: string }
  description: { vi: string; en: string }
  version: string
  /** Đường dẫn trang cài đặt/quản lý trong admin. */
  settings?: string
  /** Cài hoặc đổi plugin này có cần dựng lại (build) và triển khai lại không. */
  needsBuild: boolean
}

/** Lọc `plugins` theo danh sách id (mặc định biến NEXT_PUBLIC_HOSSO_PLUGINS, được Next nhúng lúc build). Rỗng: giữ tất cả. */
export const selectPlugins = (all: HossoPlugin[], list: string | undefined = process.env.NEXT_PUBLIC_HOSSO_PLUGINS) => {
  const ids = (list ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return ids.length ? all.filter((p) => ids.includes(p.id)) : all
}

/** `plugins` của kết quả là các plugin đang bật; `installedPlugins` là tất cả plugin đã cài (kể cả đang tắt). */
export const defineHossoConfig = (config: HossoConfig) => ({ ...config, installedPlugins: config.plugins, plugins: selectPlugins(config.plugins) })

/** Dữ liệu trang theo định dạng của Puck. */
export type PageData = {
  root?: { props?: Record<string, unknown> }
  content: { type: string; props: Record<string, unknown> & { id: string } }[]
}
