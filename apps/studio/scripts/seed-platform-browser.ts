import { getPayload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import config from '../src/payload.config'
import { importSitePackage } from '../src/lib/site-import'
if (!process.env.HOSSO_DATABASE_URL?.includes('hosso-platform-browser-')) throw new Error('Disposable browser database required')
const payload = await getPayload({ config })
payload.config.jobs.autoRun = []
try {
  const root = path.resolve('../../seed/sites')
  for (const name of fs.readdirSync(root).filter((name) => /^hosso-.*\.hosso-site\.zip$/.test(name))) await importSitePackage(payload, fs.readFileSync(path.join(root, name)), () => {})
  for (const page of (await payload.find({ collection: 'pages', draft: true, limit: 100, overrideAccess: true })).docs) await payload.update({ collection: 'pages', id: page.id, data: { _status: 'published' }, overrideAccess: true })
  await payload.updateGlobal({ slug: 'site-settings', data: { siteName: 'Platform browser fixture', theme: 'default', _status: 'published' }, overrideAccess: true })
  const media = []
  for (const [name, alt] of [['workspace.jpg', 'Không gian làm việc'], ['cafe.jpg', 'Không gian cà phê']]) media.push(await payload.create({ collection: 'media', data: { alt }, filePath: path.resolve('public/editor-templates', name), overrideAccess: true }))
  const product: any = await payload.create({ collection: 'shop-products' as any, data: { name: 'Sản phẩm kiểm thử', slug: 'platform-product', code: 'TEST-PLATFORM', price: 100000, stock: 20, active: true, source: 'shop', variants: [{ name: 'Tiêu chuẩn', stock: 10, price: 100000 }, { name: 'Nâng cấp', stock: 10, price: 150000 }], images: media.map((item) => ({ image: item.id })), description: 'Thông tin sản phẩm kiểm thử.\n'.repeat(40) }, overrideAccess: true })
  const token = 'a'.repeat(64)
  await payload.create({ collection: 'shop-orders' as any, data: { orderNo: 'HD2601019999', lookupToken: token, status: 'completed', paymentStatus: 'paid', payment: 'cod', total: 100000, subtotal: 100000, customer: { name: 'Khách kiểm thử', phone: '0900000000', address: 'Địa chỉ thử nghiệm' }, fulfillment: 'delivery', items: [{ productId: String(product.id), variantId: product.variants[0].id, name: product.name, quantity: 1, price: 100000, source: 'shop' }], checkoutComplete: true, hooksComplete: true }, overrideAccess: true })
  await payload.create({ collection: 'pages', data: { slug: 'platform-ab', title: 'A/B fixture', _status: 'published', content: { root: { props: {} }, content: [{ type: 'Hero', props: { id: 'hero', title: 'A/B fixture', subtitle: '', image: '', ctaLabel: 'Đăng ký', ctaHref: '/nhan-tai-lieu' } }, { type: 'AnalyticsExperiment', props: { id: 'test-ab', experimentId: 'fixture', revision: 1, mode: 'running', headingA: 'Tiêu đề thử nghiệm A', headingB: 'Tiêu đề thử nghiệm B', textA: 'Nội dung A', textB: 'Nội dung B', ctaA: 'Nhận tư vấn A', ctaB: 'Nhận tư vấn B', hrefA: '/nhan-tai-lieu', hrefB: '/nhan-tai-lieu' } }] } } })
  console.log('Platform browser fixture ready; product ' + product.id)
} finally { await payload.destroy() }
process.exit(0)
