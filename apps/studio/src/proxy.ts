import { NextResponse, type NextRequest } from 'next/server'

import hosso from '@hosso-config'
import { SUPPORTED_LOCALE_CODES } from './lib/locales-catalog'
import { kilnFramePolicy } from './lib/kiln-frame'

// Gán header x-hosso-locale theo tiền tố đường dẫn (/ko/..., /en/...). Ngôn ngữ mặc định không có tiền tố.
export function proxy(request: NextRequest) {
  const [defaultLocale] = hosso.locales
  const first = request.nextUrl.pathname.split('/')[1]
  const known = SUPPORTED_LOCALE_CODES.has(first) || hosso.locales.some((l) => l.code === first)
  const locale = known ? first : defaultLocale.code
  const headers = new Headers(request.headers)
  headers.set('x-hosso-locale', locale)
  headers.set('x-hosso-preview', request.nextUrl.searchParams.get('preview') === '1' ? '1' : '0')
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', kilnFramePolicy(process.env.HOSSO_KILN_FRAME_ORIGIN))
  return response
}

// Apply runtime frame policy to application routes, preserving static assets.
export const config = { matcher: ['/((?!_next|brand|.*\\..*).*)'] }
