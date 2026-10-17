import { defineHossoConfig } from '@hosso/studio-blocks'
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
  themes: [defaultTheme, altTheme, shopTheme],
  // Plugin (ví dụ kết nối Hosso WIM) khai báo ở đây. Bản công khai không kèm plugin nào.
  plugins: [],
})
