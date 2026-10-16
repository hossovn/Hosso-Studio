import { defineHossoConfig } from '@hosso/studio-blocks'
import wim from '@hosso/plugin-wim'
import altTheme from '@hosso/theme-alt'
import defaultTheme from '@hosso/theme-default'

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
  themes: [defaultTheme, altTheme],
  // Gỡ plugin: xóa dòng import ở trên và `wim` ở đây; Studio vẫn chạy, block của plugin bị bỏ qua.
  plugins: [wim],
})
