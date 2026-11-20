import { APIError, type PayloadRequest } from 'payload'
import { kilnPageID } from './kiln-identity'

/** Returns a local page only; never accepts a caller-provided redirect URL. */
export async function resolveKilnPage(req: PayloadRequest, target?: unknown) {
  if (target !== undefined) {
    if (typeof target !== 'string' || !kilnPageID.test(target))
      throw new APIError('invalid_page', 400)
    return req.payload.findByID({
      collection: 'pages',
      id: target,
      draft: true,
      depth: 0,
      req,
      overrideAccess: false,
    })
  }
  const pages = await req.payload.find({
    collection: 'pages',
    limit: 1,
    sort: 'createdAt',
    depth: 0,
    req,
    overrideAccess: false,
    draft: true,
  })
  if (pages.docs[0]) return pages.docs[0]
  return req.payload.create({
    collection: 'pages',
    req,
    overrideAccess: false,
    data: {
      title: 'Trang chủ',
      slug: 'home',
      _status: 'draft',
      content: { content: [], root: { props: {} } },
    },
  })
}
