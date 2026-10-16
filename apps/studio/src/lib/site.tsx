import config from '@payload-config'
import hosso from '@hosso-config'
import { FONTS, baseCss, buildPuckConfig, coreBlocks, type BlockSchema, type FontId, type MenuItem, type SiteChrome, type Theme } from '@hosso/studio-blocks'
import { cookies as nextCookies } from 'next/headers'
import { getPayload } from 'payload'

import { coreLoaders } from './core-loaders'

export const allBlocks = (): BlockSchema<any>[] => [...coreBlocks, ...hosso.plugins.flatMap((p) => p.blocks ?? [])]

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const fontStack = (id: FontId) =>
  `var(--font-${id}), ${id === 'jetbrains-mono' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`

type Overrides = Record<string, string | undefined | null>

/** Theme đang chọn + token đã gộp (token của theme, ghi đè bởi quản trị viên) thành CSS. */
export const mediaUrl = (m: unknown) => (m && typeof m === 'object' && (m as { filename?: string }).filename ? `/api/media/file/${encodeURIComponent((m as { filename: string }).filename)}` : undefined)
const menu = (items: any[] | undefined): MenuItem[] =>
  (items ?? []).map((i) => ({ label: i.label, href: i.href, children: i.children?.length ? i.children.map((c: any) => ({ label: c.label, href: c.href })) : undefined }))

export async function loadSite(): Promise<{ theme: Theme; css: string; siteName?: string; chrome: SiteChrome; favicon: string }> {
  const payload = await getPayload({ config })
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 1 })) as Record<string, any>
  const theme = hosso.themes.find((t) => t.manifest.name === settings.theme) ?? hosso.themes[0]
  const ov: Overrides = settings[`tokens_${theme.manifest.name}`] ?? {}
  const base = theme.manifest.tokens

  const colors = Object.fromEntries(Object.entries(base.colors).map(([k, v]) => [k, ov[`color_${k}`] || v]))
  const vars = [
    ...Object.entries(colors).map(([k, v]) => `--hs-${kebab(k)}:${v}`),
    `--hs-font-body:${fontStack((ov.fontBody as FontId) || base.fonts.body)}`,
    `--hs-font-heading:${fontStack((ov.fontHeading as FontId) || base.fonts.heading)}`,
    `--hs-radius:${ov.radius || base.radius}`,
    `--hs-space:${ov.spacing || base.spacing}`,
  ]
  const siteName = settings.siteName || hosso.brand.name
  const chrome: SiteChrome = {
    siteName,
    logoUrl: mediaUrl(settings.logo),
    announcement: settings.announcement || undefined,
    headerMenu: menu(settings.headerMenu),
    footerMenu: menu(settings.footerMenu),
    footerText: settings.footerText || undefined,
    contact: {
      phone: settings.contact?.phone || undefined,
      email: settings.contact?.email || undefined,
      address: settings.contact?.address || undefined,
      zalo: settings.contact?.zalo || undefined,
    },
    social: (settings.social ?? []).map((i: any) => ({ label: i.label, href: i.href })),
    search: settings.showSearch !== false,
  }
  return {
    theme,
    css: `:root{${vars.join(';')}}${theme.css}${baseCss}${hosso.plugins.map((p) => p.css ?? '').join('')}`,
    siteName: settings.siteName ?? undefined,
    chrome,
    favicon: mediaUrl(settings.favicon) ?? hosso.brand.favicon,
  }
}

export const renderConfig = (theme: Theme) =>
  buildPuckConfig({ schemas: allBlocks(), theme, plugins: hosso.plugins, mode: 'render' })

export { FONTS }

export const loaderFor = (type: string) => coreLoaders[type] ?? hosso.plugins.find((p) => p.loaders?.[type])?.loaders?.[type]

/** Chạy loader của plugin cho từng block; lỗi của một block không làm sập trang (block tự báo lỗi). */
export async function attachBlockData<T extends { content: { type: string; props: Record<string, any> }[] }>(
  data: T,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<T> {
  if (!data.content.some((c) => loaderFor(c.type))) return data
  const payload = await getPayload({ config })
  const cookies = Object.fromEntries((await nextCookies()).getAll().map((c) => [c.name, c.value]))
  const content = await Promise.all(
    data.content.map(async (item) => {
      const load = loaderFor(item.type)
      if (!load) return item
      try {
        return { ...item, props: { ...item.props, data: await load(item.props, { payload, searchParams, cookies }) } }
      } catch (e) {
        console.error(`[hosso] loader ${item.type} lỗi:`, e)
        return { ...item, props: { ...item.props, data: { status: 'error', kind: 'internal' } } }
      }
    }),
  )
  return { ...data, content }
}
