import { NextResponse, type NextRequest } from 'next/server'

import hosso from '@hosso-config'

// Gán header x-hosso-locale theo tiền tố đường dẫn (/en/...). Ngôn ngữ mặc định không có tiền tố.
export function proxy(request: NextRequest) {
  const [defaultLocale] = hosso.locales
  const first = request.nextUrl.pathname.split('/')[1]
  const locale = hosso.locales.some((l) => l.code === first) ? first : defaultLocale.code
  const headers = new Headers(request.headers)
  headers.set('x-hosso-locale', locale)
  return NextResponse.next({ request: { headers } })
}

// Chỉ trang công khai; bỏ qua admin, editor, api và tệp tĩnh.
export const config = { matcher: ['/((?!api|admin|editor|_next|brand|.*\\..*).*)'] }
