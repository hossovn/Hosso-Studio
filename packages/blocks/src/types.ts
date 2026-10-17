import type React from 'react'
import type { ComponentType } from 'react'
import type { Config, Payload } from 'payload'

/** Field của block: tập con tương thích với field của Puck (slice 2 truyền thẳng vào Puck). */
export type BlockField =
  | { type: 'text' | 'textarea' | 'number'; label?: string }
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
export type HossoPlugin = {
  id: string
  blocks?: BlockSchema<any>[]
  /** Renderer dự phòng khi theme không hỗ trợ block của plugin. */
  fallbackRenderers?: Record<string, BlockRenderer>
  /** Phần chèn vào header (ví dụ liên kết giỏ hàng); chạy ở trình duyệt. */
  headerSlot?: ComponentType
  /** Mục hiện trong nhóm "Plugin" của sidebar admin. */
  adminNav?: { label: string; href: string; roles?: string[] }[]
  /** CSS của renderer dự phòng, dùng biến --hs-*. */
  css?: string
  /** Thêm collection, global, endpoint vào Payload (chỉ chạy lúc dựng cấu hình Payload). */
  payload?: (config: Config) => Config
  /** Global của plugin được đưa vào gói export/import; `secretFields` không bao giờ vào gói. */
  portable?: { globals: { slug: string; secretFields: string[] }[] }
  /** Các bước cài đặt hiện trên dashboard admin (ví dụ "Kết nối WIM"). */
  checklist?: (payload: Payload) => Promise<{ label: string; done: boolean; href: string }[]>
  /** Tìm kiếm trên site: trả kết quả của plugin (ví dụ sản phẩm). */
  search?: (query: string, payload: Payload) => Promise<{ title: string; href: string; description?: string }[]>
  /** Lấy dữ liệu server cho block: kết quả được truyền vào renderer qua prop `data`. */
  loaders?: Record<string, BlockLoader>
}

export type HossoLocale = { code: string; label: string }

export type HossoConfig = {
  brand: HossoBrand
  /** Ngôn ngữ của site; ngôn ngữ đầu tiên là mặc định (URL không có tiền tố). */
  locales: HossoLocale[]
  themes: Theme[]
  plugins: HossoPlugin[]
}

export const defineHossoConfig = (config: HossoConfig) => config

/** Dữ liệu trang theo định dạng của Puck. */
export type PageData = {
  root?: { props?: Record<string, unknown> }
  content: { type: string; props: Record<string, unknown> & { id: string } }[]
}
