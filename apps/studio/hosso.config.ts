import { defineHossoConfig } from '@hosso/studio-blocks'
import wim from '@hosso/plugin-wim'
import shipping from '@hosso/plugin-shipping'
import reports from '@hosso/plugin-reports'
import promotions from '@hosso/plugin-promotions'
import payment from '@hosso/plugin-payment'
import notify from '@hosso/plugin-notify'
import analytics from '@hosso/plugin-analytics'
import accounts from '@hosso/plugin-accounts'
import affiliate from '@hosso/plugin-affiliate'
import shop from '@hosso/plugin-shop'
import crossSell from '@hosso/plugin-cross-sell'
import altTheme from '@hosso/theme-alt'
import autoTheme from '@hosso/theme-auto'
import defaultTheme from '@hosso/theme-default'

// Nơi duy nhất khai báo thương hiệu, theme và plugin của site.
export default defineHossoConfig({
  brand: {
    name: 'Hosso Studio',
    company: 'HOSSO',
    color: '#15803d',
    logo: '/brand/logo.png',
    mark: '/brand/mark.png',
    favicon: '/brand/favicon.png',
  },
  // Ngôn ngữ đầu tiên là mặc định (URL không có tiền tố); ngôn ngữ khác có tiền tố /en, ...
  locales: [
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'en', label: 'English' },
  ],
  themes: [defaultTheme, altTheme, autoTheme],
  // Gỡ plugin: xóa dòng import ở trên và tên plugin ở đây; Studio vẫn chạy, block của plugin bị bỏ qua.
  // Plugin thương mại (Giao vận, Khuyến mãi, Thanh toán, ...) cài riêng bằng giấy phép; thứ tự: shipping TRƯỚC promotions (xem docs/PLUGIN-COMMERCE.md).
  plugins: [shop, affiliate, wim, shipping, promotions, payment, notify, analytics, reports, accounts, crossSell],
})
