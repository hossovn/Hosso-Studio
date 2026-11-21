import { defineHossoConfig } from '@hosso/studio-blocks'
import affiliate from '@hosso/plugin-affiliate'
import installedPlugins from '@hosso-installed-plugins'
import shop from '@hosso/plugin-shop'
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
  // Plugin thương mại (WIM, Giao vận, Khuyến mãi, Thanh toán, Thông báo, Analytics, Báo cáo, Tài khoản, Cross-sell) là mã nguồn đóng,
  // cài riêng từ repo hosso-plugins; scripts/prepare-installed-plugins.mjs đăng ký những package có mặt, theo đúng thứ tự
  // (shipping TRƯỚC promotions, xem docs/PLUGIN-COMMERCE.md). Checkout công khai không có chúng và vẫn chạy với shop + affiliate.
  plugins: [shop, affiliate, ...installedPlugins],
})
