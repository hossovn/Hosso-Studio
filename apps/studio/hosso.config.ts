import { defineHossoConfig } from '@hosso/studio-blocks'
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
  themes: [defaultTheme],
  plugins: [],
})
