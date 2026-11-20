import definition from './browser'
import { withLicense } from '@hosso/studio-blocks'
import type { HossoPlugin } from '@hosso/studio-blocks'
import type { Config } from 'payload'

/** Plugin báo cáo: thêm trang /admin/shop-reports (chỉ đọc dữ liệu của plugin Cửa hàng). */
const plugin: HossoPlugin = {
  ...definition,

  payload: (config: Config): Config => {
    const views = (config.admin?.components as { views?: Record<string, unknown> } | undefined)?.views ?? {}
    return { ...config, admin: { ...config.admin, components: { ...config.admin?.components, views: { ...views, shopReports: { Component: '@hosso/plugin-reports/admin#ReportsView', path: '/shop-reports' } } } } }
  },
}

export default withLicense(plugin)
