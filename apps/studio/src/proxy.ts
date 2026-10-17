import { NextResponse, type NextRequest } from 'next/server'

import hosso from '@hosso-config'

// Gán header x-hosso-locale theo tiền tố đường dẫn (/en/...). Ngôn ngữ mặc định không có tiền tố.
export function proxy(request: NextRequest) {
  const [defaultLocale] = hosso.locales
  const first = request.nextUrl.pathname.split('/')[1]
  const locale = hosso.locales.some((l) => l.code === first) ? first : defaultLocale.code
  const headers = new Headers(request.headers)
  headers.set('x-hosso-locale', locale)
  const res = NextResponse.next({ request: { headers } })
  // Khách ẩn danh xem trang công khai: cho CDN/reverse proxy cache ngắn (HOSSO_CACHE_TTL giây, 0 = tắt). Bản nháp/đăng nhập thì không cache.
  const ttl = Number(process.env.HOSSO_CACHE_TTL ?? 60)
  const { searchParams } = request.nextUrl
  if (ttl > 0 && request.method === 'GET' && !request.cookies.has('payload-token') && !searchParams.has('preview') && !searchParams.has('share')) {
    res.headers.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`)
  }
  return res
}

// Chỉ trang công khai; bỏ qua admin, editor, api và tệp tĩnh.
export const config = { matcher: ['/((?!api|admin|editor|_next|brand|.*\\..*).*)'] }
