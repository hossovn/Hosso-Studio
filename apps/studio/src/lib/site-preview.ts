import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'
import { canEditPages } from './access'

/** The proxy supplies the flag; reading drafts additionally requires an authenticated editor. */
export const sitePreview = cache(async () => {
  const requestHeaders = await headers()
  if (requestHeaders.get('x-hosso-preview') !== '1') return false
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: requestHeaders })
  return canEditPages(user)
})
