import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // Package workspace phát hành TS nguồn, không có bước build riêng.
  transpilePackages: fs.readdirSync(path.join(dirname, 'node_modules/@hosso')).map((name) => `@hosso/${name}`),
  // Không dùng sharp (binary libvips là LGPL): tắt tối ưu ảnh của Next, dùng <img> thường.
  images: { unoptimized: true },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname, '../..'),
  },
}

const config = withPayload(nextConfig, { devBundleServerPackages: false })

// Payload gắn Critical-CH (dò theme sáng/tối) cho MỌI đường dẫn, làm trình duyệt gửi lại yêu cầu trang công khai
// (tốn ~600ms trên di động). Chỉ giữ cho trang quản trị.
const CH = new Set(['Accept-CH', 'Critical-CH', 'Vary'])
const payloadHeaders = config.headers!
config.headers = async () =>
  (await payloadHeaders()).flatMap((rule) =>
    rule.source === '/:path*'
      ? [
          { source: '/admin/:path*', headers: rule.headers.filter((h) => CH.has(h.key)) },
          { source: rule.source, headers: rule.headers.filter((h) => !CH.has(h.key)) },
        ]
      : [rule],
  )

export default config
