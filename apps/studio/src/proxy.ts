import { NextResponse, type NextRequest } from 'next/server'

import hosso from '@hosso-config'
import { SUPPORTED_LOCALE_CODES } from './lib/locales-catalog'

// Gán header x-hosso-locale theo tiền tố đường dẫn (/ko/..., /en/...). Ngôn ngữ mặc định không có tiền tố.
export function proxy(request: NextRequest) {
  const [defaultLocale] = hosso.locales
  const first = request.nextUrl.pathname.split('/')[1]
  const known = SUPPORTED_LOCALE_CODES.has(first) || hosso.locales.some((l) => l.code === first)
  const locale = known ? first : defaultLocale.code
  const headers = new Headers(request.headers)
  headers.set('x-hosso-locale', locale)
  headers.set('x-hosso-preview', request.nextUrl.searchParams.get('preview') === '1' ? '1' : '0')
  return NextResponse.next({ request: { headers } })
}

// Chỉ trang công khai; bỏ qua admin, editor, api và tệp tĩnh.
export const config = { matcher: ['/((?!api|admin|editor|_next|brand|.*\\..*).*)'] }
