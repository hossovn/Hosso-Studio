import { withLicense } from '@hosso/studio-blocks'
import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { Config, Endpoint, GlobalConfig } from 'payload'
import manifest from '../hosso.json'
import { Tracker } from './Tracker'

type Roled = { roles?: string[] | null } | null | undefined
const isAdmin = ({ req }: { req: { user?: unknown } }) => Boolean((req.user as Roled)?.roles?.includes('admin'))
const bi = (vi: string, en: string) => ({ vi, en })
const SETTINGS = 'analytics-settings'

const Settings: GlobalConfig = {
  slug: SETTINGS,
  label: bi('Theo dõi và quảng cáo', 'Analytics and ads'),
  admin: { group: bi('Tiếp thị', 'Marketing') },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    { name: 'ga4Id', type: 'text', label: bi('Google Analytics 4 (mã G-XXXXXXXXXX)', 'Google Analytics 4 (G-XXXXXXXXXX ID)') },
    { name: 'fbPixelId', type: 'text', label: bi('Meta (Facebook) Pixel ID', 'Meta (Facebook) Pixel ID'), admin: { description: bi('Chỉ gồm chữ số.', 'Digits only.') } },
  ],
}

const endpoints: Endpoint[] = [
  {
    // Mã đo lường là công khai (nằm sẵn trong mã nguồn trang), trình duyệt đọc để nạp script.
    path: '/plugins/analytics/config',
    method: 'get',
    handler: async (req) => {
      const s = (await req.payload.findGlobal({ slug: SETTINGS as any, depth: 0, overrideAccess: true }).catch(() => null)) as { ga4Id?: string; fbPixelId?: string } | null
      return Response.json({ ga4Id: s?.ga4Id?.trim() || undefined, fbPixelId: s?.fbPixelId?.trim() || undefined }, { headers: { 'Cache-Control': 'public, max-age=300' } })
    },
  },
]

/** Plugin theo dõi: GA4 và Meta Pixel + sự kiện thương mại điện tử (`hs:view_item`, `hs:add_to_cart`, `hs:purchase`). */
const plugin: HossoPlugin = {
  id: 'analytics',
  manifest: manifest as PluginManifest,
  headerSlot: Tracker,
  adminEn: { 'Tiếp thị': 'Marketing' },
  adminNav: [{ label: 'Theo dõi và quảng cáo', href: '/admin/globals/analytics-settings', roles: ['admin'] }],
  portable: { globals: [{ slug: SETTINGS, secretFields: [] }] },
  payload: (config: Config): Config => ({ ...config, globals: [...(config.globals ?? []), Settings], endpoints: [...(config.endpoints ?? []), ...endpoints] }),
}

export default withLicense(plugin)
