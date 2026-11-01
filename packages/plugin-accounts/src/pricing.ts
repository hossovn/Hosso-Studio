import { sessionOf, type HossoPlugin } from '@hosso/studio-blocks'
import type { Payload } from 'payload'
import { session } from './endpoints'

const consent = sessionOf('hs_assisted_consent')
const affiliateSession = sessionOf('hs_aff')
const idOf = (v: any) => String(v && typeof v === 'object' ? v.id : v || '')

export async function pricingCustomer(payload: Payload, headers: Headers, token?: string) {
  let id: string | null = null
  if (token) {
    const claim = await consent.read(payload.secret, new Headers({ cookie: `hs_assisted_consent=${token}` }))
    const [customer, affiliate, expiry] = claim?.split(':') || []
    const currentAffiliate = await affiliateSession.read(payload.secret, headers)
    if (!customer || !currentAffiliate || affiliate !== currentAffiliate || !Number.isFinite(Number(expiry)) || Number(expiry) < Date.now()) throw new Error('Mã xác minh khách đã hết hạn hoặc không dành cho cộng tác viên này.')
    id = customer
  } else id = await session.read(payload.secret, headers)
  if (!id) return null
  return payload.findByID({ collection: 'customers' as any, id, depth: 0, overrideAccess: true }).catch(() => null) as Promise<any>
}

export async function makeConsent(payload: Payload, customer: any, affiliateCode: string) {
  const affiliates = await payload.find({ collection: 'affiliates' as any, where: { code: { equals: affiliateCode }, active: { equals: true }, approval: { equals: 'approved' } }, limit: 1, depth: 0, overrideAccess: true })
  const affiliate = affiliates.docs[0]
  if (!affiliate) throw new Error('Không tìm thấy cộng tác viên đã duyệt.')
  return { token: await consent.make(payload.secret, `${customer.id}:${affiliate.id}:${Date.now() + 15 * 60000}`), affiliateName: affiliate.name, expiresIn: 900 }
}

export const customerPrice: NonNullable<HossoPlugin['commerce']>['customerPrice'] = async ({ payload, headers, product, variantId, price, assistedCustomerToken }) => {
  if (assistedCustomerToken === 'retail') return
  const customer = await pricingCustomer(payload, headers, assistedCustomerToken)
  if (customer?.garageStatus !== 'approved' || !customer.priceGroup) return
  const group: any = await payload.findByID({ collection: 'garage-price-groups' as any, id: idOf(customer.priceGroup), depth: 0, overrideAccess: true }).catch(() => null)
  if (!group?.active) return
  const row = product.garagePrices?.find((p: any) => idOf(p.group) === String(group.id) && (p.variantId || '') === (variantId || ''))
  if (!row?.overrideEnabled || !Number.isSafeInteger(row.price) || row.price < 0) return
  if (product.source === 'wim' || product.wimId) {
    // WIM validates its own selling price on submit; a local override must not create an unreconcilable order.
    if (row.price !== price) throw new Error('WIM chưa hỗ trợ xác nhận mức giá gara này. Vui lòng liên hệ cửa hàng.')
  }
  return { price: row.price, group: String(group.id), source: 'studio' }
}
