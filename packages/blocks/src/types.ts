import type { ComponentType } from 'react'
import type { Config, Payload } from 'payload'

/** Field của block: tập con tương thích với field của Puck (slice 2 truyền thẳng vào Puck). */
export type BlockField =
  | { type: 'text' | 'textarea' | 'number'; label?: string }
  | { type: 'select' | 'radio'; label?: string; options: { label: string; value: string | number | boolean }[] }
  | { type: 'array'; label?: string; arrayFields: Record<string, BlockField>; defaultItemProps?: Record<string, unknown> }

/** Schema của block: dữ liệu + thuộc tính. Không biết gì về cách hiển thị. */
export type BlockSchema<P extends Record<string, unknown> = Record<string, unknown>> = {
  type: string
  label: string
  fields: Record<keyof P & string, BlockField>
  defaultProps: P
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
  /** CSS của renderer dự phòng, dùng biến --hs-*. */
  css?: string
  /** Thêm collection, global, endpoint vào Payload (chỉ chạy lúc dựng cấu hình Payload). */
  payload?: (config: Config) => Config
  /** Global của plugin được đưa vào gói export/import; `secretFields` không bao giờ vào gói. */
  portable?: { globals: { slug: string; secretFields: string[] }[] }
  /** Lấy dữ liệu server cho block: kết quả được truyền vào renderer qua prop `data`. */
  loaders?: Record<string, BlockLoader>
}

export type HossoConfig = {
  brand: HossoBrand
  themes: Theme[]
  plugins: HossoPlugin[]
}

export const defineHossoConfig = (config: HossoConfig) => config

/** Dữ liệu trang theo định dạng của Puck. */
export type PageData = {
  root?: { props?: Record<string, unknown> }
  content: { type: string; props: Record<string, unknown> & { id: string } }[]
}
