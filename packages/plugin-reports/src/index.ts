import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import type { Config } from 'payload'
import manifest from '../hosso.json'

/** Plugin báo cáo: thêm trang /admin/shop-reports (chỉ đọc dữ liệu của plugin Cửa hàng). */
const plugin: HossoPlugin = {
  id: 'reports',
  manifest: manifest as PluginManifest,
  adminNav: [{ label: 'Báo cáo bán hàng', href: '/admin/shop-reports', roles: ['admin', 'publisher'] }],
  adminEn: { 'Báo cáo bán hàng': 'Sales reports' },
  payload: (config: Config): Config => {
    const views = (config.admin?.components as { views?: Record<string, unknown> } | undefined)?.views ?? {}
    return { ...config, admin: { ...config.admin, components: { ...config.admin?.components, views: { ...views, shopReports: { Component: '@hosso/plugin-reports/admin#ReportsView', path: '/shop-reports' } } } } }
  },
}

export default plugin
