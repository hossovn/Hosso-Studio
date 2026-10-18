import { defineHossoConfig } from '@hosso/studio-blocks'
import affiliate from '@hosso/plugin-affiliate'
import shipping from '@hosso/plugin-shipping'
import shop from '@hosso/plugin-shop'
import promotions from '@hosso/plugin-promotions'
import payment from '@hosso/plugin-payment'
import notify from '@hosso/plugin-notify'
import analytics from '@hosso/plugin-analytics'
import reports from '@hosso/plugin-reports'
import accounts from '@hosso/plugin-accounts'
import altTheme from '@hosso/theme-alt'
import autoTheme from '@hosso/theme-auto'
import defaultTheme from '@hosso/theme-default'
import shopTheme from '@hosso/theme-shop'

// Nơi duy nhất khai báo thương hiệu, theme và plugin của site.
export default defineHossoConfig({
  brand: {
    name: 'Hosso Studio',
    company: 'HOSSO',
    color: '#d71920',
    logo: '/brand/wordmark.svg',
    mark: '/brand/mark.svg',
    favicon: '/brand/wordmark.svg',
  },
  // Ngôn ngữ đầu tiên là mặc định (URL không có tiền tố); ngôn ngữ khác có tiền tố /en, ...
  locales: [
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'en', label: 'English' },
  ],
  themes: [defaultTheme, altTheme, shopTheme, autoTheme],
  // Gỡ plugin: xóa dòng import ở trên và tên plugin ở đây; Studio vẫn chạy, block của plugin bị bỏ qua.
  // Thứ tự có ý nghĩa: `shipping` phải đứng TRƯỚC `promotions` (xem docs/PLUGIN-COMMERCE.md).
  plugins: [shop, affiliate, shipping, promotions, payment, notify, analytics, reports, accounts],
})
