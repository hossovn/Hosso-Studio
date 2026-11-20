import { randomBytes } from 'node:crypto'
import { APIError, type PayloadRequest } from 'payload'
import { hasRole } from './access'

export const kilnUUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const kilnPageID = /^[1-9][0-9]{0,14}$/

/** Only a verified Kiln identity may use this mapping. Never re-elevate a revoked user. */
export async function kilnIdentity(req: PayloadRequest, actor: string) {
  if (!kilnUUID.test(actor)) throw new APIError('forbidden', 403)
  const email = `${actor.toLowerCase()}@kiln.invalid`
  const find = () =>
    req.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  let user = (await find()).docs[0]
  if (!user) {
    try {
      user = await req.payload.create({
        collection: 'users',
        overrideAccess: true,
        data: {
          email,
          password: randomBytes(48).toString('base64url'),
          roles: ['admin'],
        },
      })
    } catch (error) {
      user = (await find()).docs[0]
      if (!user) throw error
    }
  }
  if (user.twoFactorEnabled || !hasRole(user, 'admin'))
    throw new APIError('forbidden', 403)
  return user
}
