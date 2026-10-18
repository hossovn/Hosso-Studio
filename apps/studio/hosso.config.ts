import { defineHossoConfig } from '@hosso/studio-blocks'
import affiliate from '@hosso/plugin-affiliate'
import shipping from '@hosso/plugin-shipping'
import wim from '@hosso/plugin-wim'
import altTheme from '@hosso/theme-alt'
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
  themes: [defaultTheme, altTheme, shopTheme],
  // Gỡ plugin: xóa dòng import ở trên và `wim` ở đây; Studio vẫn chạy, block của plugin bị bỏ qua.
  plugins: [wim, affiliate, shipping],
})
