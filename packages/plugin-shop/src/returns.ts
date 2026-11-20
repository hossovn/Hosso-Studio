import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { CollectionConfig, Endpoint, PayloadRequest } from 'payload'
import type { HossoPlugin } from '@hosso/studio-blocks'
import { clientPrincipal, takeCommerceLimit } from '@hosso/studio-blocks/rate-limits'
import { adjustStock, inTransaction } from './stock'
import { limitedJSON } from '../../blocks/src/request-body'
import { encodeReturnEvidence } from './return-evidence'

const COLLECTION = 'shop-returns' as any
const managers = ({ req }: { req: PayloadRequest }) => Boolean(req.user?.roles?.includes('admin'))
const plugins = (req: PayloadRequest) => (req.payload.config.custom?.hossoPlugins || []) as HossoPlugin[]
export const Returns: CollectionConfig = {
  slug: COLLECTION, labels: { singular: 'Yêu cầu đổi trả', plural: 'Yêu cầu đổi trả' },
  admin: { group: 'Cửa hàng', defaultColumns: ['orderNo', 'state', 'refundAmount', 'createdAt'], components: { beforeListTable: ['@hosso/plugin-shop/admin#ReturnsLink'] } },
  access: { read: managers, create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'requestKey', type: 'text', unique: true, required: true }, { name: 'order', type: 'relationship', relationTo: 'shop-orders' as any, required: true, index: true },
    { name: 'orderNo', type: 'text', required: true }, { name: 'items', type: 'json', required: true }, { name: 'reason', type: 'textarea', required: true },
    { name: 'resolution', type: 'select', options: ['refund', 'exchange'], defaultValue: 'refund' },
    { name: 'state', type: 'select', options: ['requested', 'approved', 'rejected', 'received', 'closed'], defaultValue: 'requested', index: true },
    { name: 'revision', type: 'number', defaultValue: 0 }, { name: 'evidence', type: 'json', defaultValue: [] },
    { name: 'refundAmount', type: 'number', defaultValue: 0, min: 0 }, { name: 'restocked', type: 'checkbox', defaultValue: false },
    { name: 'refundReference', type: 'text' }, { name: 'history', type: 'json', defaultValue: [] },
  ],
}
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
const failure = (message: string, status = 409) => json({ ok: false, message }, status)
class ReturnConflict extends Error {}
const originOK = (req: PayloadRequest) => req.headers.get('origin') === new URL(req.payload.config.serverURL || req.url!).origin
const tokenMatches = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && /^[a-f0-9]{64}$/.test(a) && timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())
async function orderFor(req: PayloadRequest, id: unknown, token: unknown) {
  const order = (await req.payload.find({ collection: 'shop-orders' as any, where: { orderNo: { equals: String(id || '').slice(0, 50) } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] as any
  return order && (managers({ req }) || tokenMatches(token, order.lookupToken)) ? order : null
}
async function lockOrder(req: PayloadRequest, order: any) {
  const version = order.operationsVersion || 0
  const locked = await req.payload.db.updateOne({ collection: 'shop-orders', req, where: { and: [{ id: { equals: order.id } }, { operationsVersion: { equals: version } }] }, data: { operationsVersion: version + 1 }, options: { atomic: true } })
  if (!locked) throw new ReturnConflict('Đơn đã thay đổi. Tải lại và thử lại.')
}
const publicReturn = (row: any) => ({ id: row.id, orderNo: row.orderNo, items: row.items, reason: row.reason, resolution: row.resolution, state: row.state, revision: row.revision, refundAmount: row.refundAmount, history: row.history, evidenceCount: row.evidence?.length || 0 })
const readReturn = (req: PayloadRequest, id: any) => req.payload.findByID({ collection: COLLECTION, id, depth: 0, overrideAccess: true, req }) as Promise<any>
const fileRoot = () => path.resolve(process.env.HOSSO_PRIVATE_DIR || path.join(process.cwd(), 'data', 'private'), 'returns')
const safeEvidenceName = (name: unknown): name is string => typeof name === 'string' && /^[a-f0-9-]{36}\.(png|jpeg|webp)$/.test(name)

export async function cleanReturnEvidence(req: PayloadRequest, now = new Date()) {
  const configured = Number(process.env.HOSSO_RETURN_EVIDENCE_DAYS || 0)
  const cutoff = Number.isInteger(configured) && configured >= 30 ? now.getTime() - configured * 86400000 : 0
  const referenced = new Set<string>()
  for (let page = 1; ; page++) {
    const rows = await req.payload.find({ collection: COLLECTION, page, sort: 'id', limit: 250, depth: 0, select: { evidence: true, state: true, updatedAt: true, revision: true }, overrideAccess: true, req })
    for (const row of rows.docs as any[]) {
      if (row.evidence?.length && ['closed', 'rejected'].includes(row.state) && new Date(row.updatedAt).getTime() < cutoff) {
        const cleared = await req.payload.db.updateOne({ collection: COLLECTION, req, where: { and: [{ id: { equals: row.id } }, { revision: { equals: row.revision } }] }, data: { evidence: [], revision: row.revision + 1 }, options: { atomic: true } })
        if (cleared) row.evidence = []
      }
      for (const item of row.evidence || []) if (safeEvidenceName(item.filename)) referenced.add(item.filename)
    }
    if (!rows.hasNextPage) break
  }
  let directory
  try { directory = await fs.opendir(fileRoot()) } catch (error: any) { if (error.code === 'ENOENT') return; throw error }
  for await (const file of directory) {
    if (!file.isFile() || !safeEvidenceName(file.name) || referenced.has(file.name)) continue
    const target = path.join(fileRoot(), file.name), info = await fs.stat(target).catch(() => null)
    if (info && info.mtimeMs < now.getTime() - 2 * 86400000) await fs.unlink(target).catch(() => {})
  }
}

export const returnEndpoints: Endpoint[] = [
  { path: '/plugins/shop/returns', method: 'get', handler: async (req) => {
    const q = new URL(req.url!).searchParams
    if (managers({ req }) && !q.get('order')) {
      const result = await req.payload.find({ collection: COLLECTION, sort: '-createdAt', limit: 30, page: Math.max(1, Math.min(10000, Number(q.get('page')) || 1)), depth: 0, overrideAccess: true, req })
      return json({ ok: true, docs: result.docs.map(publicReturn), pages: result.totalPages })
    }
    const order = await orderFor(req, q.get('order'), q.get('token'))
    if (!order) return failure('Không tìm thấy đơn.', 404)
    const result = await req.payload.find({ collection: COLLECTION, where: { order: { equals: order.id } }, sort: '-createdAt', limit: 100, depth: 0, overrideAccess: true, req })
    return json({ ok: true, docs: result.docs.map(publicReturn) })
  } },
  { path: '/plugins/shop/returns', method: 'post', handler: async (req) => {
    if (!originOK(req)) return failure('Nguồn yêu cầu không hợp lệ.', 403)
    if (!await takeCommerceLimit(req, 'returns', clientPrincipal(req), 20)) return failure('Thử lại sau ít phút.', 429)
    let input: any
    try { input = await limitedJSON(req, 32768) } catch (error) { return failure('Dữ liệu yêu cầu không hợp lệ hoặc quá lớn.', error instanceof RangeError ? 413 : 400) }
    if (!input || !/^[a-f0-9-]{36}$/i.test(input.requestId || '') || !Array.isArray(input.items) || !input.items.length || input.items.length > 50 || typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.reason.length > 2000) return failure('Chọn sản phẩm và mô tả lý do (10–2.000 ký tự).', 400)
    try {
      return await inTransaction(req, async () => {
        const order = await orderFor(req, input.order, input.token)
        if (!order) return failure('Không tìm thấy đơn.', 404)
        await lockOrder(req, order)
        const requestKey = `${order.id}:${input.requestId}`
        const prior = (await req.payload.find({ collection: COLLECTION, where: { requestKey: { equals: requestKey } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0]
        if (prior) return json({ ok: true, request: publicReturn(prior) })
        if (order.status !== 'completed') return failure('Chỉ gửi yêu cầu đổi trả sau khi đơn hoàn tất.')
        const previous = await req.payload.find({ collection: COLLECTION, where: { and: [{ order: { equals: order.id } }, { state: { not_equals: 'rejected' } }] }, limit: 100, depth: 0, overrideAccess: true, req })
        if (previous.totalDocs >= 100) return failure('Liên hệ cửa hàng để xử lý thêm yêu cầu.')
        const used = new Map<string, number>(), requested = new Set<string>()
        for (const row of previous.docs as any[]) for (const line of row.items) { const key = `${line.productId}:${line.variantId || ''}`; used.set(key, (used.get(key) || 0) + line.quantity) }
        const items = input.items.map((line: any) => {
          const key = `${line.productId}:${line.variantId || ''}`, original = order.items.find((item: any) => String(item.productId) === String(line.productId) && (item.variantId || '') === (line.variantId || ''))
          if (!original || requested.has(key) || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity + (used.get(key) || 0) > original.quantity) throw new ReturnConflict('Số lượng đổi trả vượt số đã mua hoặc đã yêu cầu.')
          requested.add(key)
          return { productId: String(original.productId), variantId: original.variantId || '', name: original.name, price: original.price, source: original.source || 'shop', quantity: line.quantity }
        })
        const row = await req.payload.create({ collection: COLLECTION, overrideAccess: true, req, data: { requestKey, order: order.id, orderNo: order.orderNo, items, reason: input.reason.trim(), resolution: input.resolution === 'exchange' ? 'exchange' : 'refund', state: 'requested' } })
        return json({ ok: true, request: publicReturn(row) })
      })
    } catch (error) { return failure(error instanceof ReturnConflict ? error.message : 'Chưa lưu được yêu cầu. Vui lòng thử lại.', error instanceof ReturnConflict ? 409 : 503) }
  } },
  { path: '/plugins/shop/manage-return', method: 'post', handler: async (req) => {
    if (!managers({ req }) || !originOK(req)) return failure('Không có quyền.', 403)
    let input: any
    try { input = await limitedJSON(req, 8192) } catch (error) { return failure('Dữ liệu xử lý không hợp lệ hoặc quá lớn.', error instanceof RangeError ? 413 : 400) }
    const reason = String(input?.reason || '').trim().slice(0, 1000)
    if (!reason) return failure('Nhập ghi chú xử lý.', 400)
    try {
      await inTransaction(req, async () => {
        const row = await readReturn(req, input.id)
        const allowed: Record<string, string> = { approve: 'requested', reject: 'requested', receive: 'approved', close: 'received' }
        if (allowed[input.action] !== row.state || input.revision !== row.revision) throw new ReturnConflict('Yêu cầu đã thay đổi. Tải lại để kiểm tra.')
        const order = await req.payload.findByID({ collection: 'shop-orders' as any, id: row.order, depth: 0, overrideAccess: true, req }) as any
        await lockOrder(req, order)
        const claimed = await req.payload.db.updateOne({ collection: 'shop-returns', req, where: { and: [{ id: { equals: row.id } }, { revision: { equals: row.revision } }] }, data: { revision: row.revision + 1 }, options: { atomic: true } })
        if (!claimed) throw new ReturnConflict('Yêu cầu đã thay đổi.')
        let refundAmount = row.refundAmount || 0
        if (input.action === 'receive') {
          refundAmount = Number(input.refundAmount || 0)
          const prior = await req.payload.find({ collection: COLLECTION, where: { and: [{ order: { equals: order.id } }, { state: { in: ['received', 'closed'] } }] }, limit: 100, depth: 0, overrideAccess: true, req })
          const credited = prior.docs.reduce((sum: number, item: any) => sum + Number(item.refundAmount || 0), 0)
          const max = Math.min(order.total - credited, row.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0))
          if (!Number.isSafeInteger(refundAmount) || refundAmount < 0 || refundAmount > max || (row.resolution === 'exchange' && refundAmount > 0)) throw new ReturnConflict('Số hoàn phải là VND nguyên, trong giới hạn hàng trả và tổng đơn còn lại.')
          if (input.restock) for (const item of row.items) {
            const product = await req.payload.findByID({ collection: 'shop-products' as any, id: item.productId, depth: 0, overrideAccess: true, req }) as any
            if (item.source !== 'shop' || product.source && product.source !== 'shop' || product.wimId || product.supplierStockUnmanaged) throw new ReturnConflict('Hàng nhà cung cấp cần đối soát kho tại nguồn. Bỏ chọn nhập kho Studio.')
            await adjustStock(req.payload, item.productId, item.variantId || undefined, item.quantity, req)
          }
          if (refundAmount > 0) {
            if (order.paymentStatus !== 'paid') throw new ReturnConflict('Xác nhận tiền đã thu trong đơn trước khi tạo khoản cần hoàn.')
            const revise = plugins(req).find((plugin) => plugin.commerce?.revisePayment)?.commerce?.revisePayment
            if (!revise) throw new ReturnConflict('Chưa có sổ thanh toán để ghi nhận khoản cần hoàn.')
            const balance = await revise(req, order.orderNo, Math.max(0, order.total - credited - refundAmount))
            await req.payload.update({ collection: 'shop-orders' as any, id: order.id, data: { refundDue: balance.refundDue }, overrideAccess: true, req })
          }
        }
        if (input.action === 'close' && refundAmount > 0) {
          const record = plugins(req).find((plugin) => plugin.commerce?.recordRefund)?.commerce?.recordRefund
          const reference = String(input.reference || '').trim()
          if (!record || reference.length < 3 || reference.length > 120 || input.transferred !== true) throw new ReturnConflict('Chỉ đóng sau khi đã chuyển tiền; nhập mã giao dịch hoàn tiền thực tế.')
          const balance = await record(req, { orderNo: order.orderNo, amount: refundAmount, reference, reason: `Return ${row.id}: ${reason}` })
          await req.payload.update({ collection: 'shop-orders' as any, id: order.id, data: { refundDue: balance.refundDue }, overrideAccess: true, req })
        }
        const state = ({ approve: 'approved', reject: 'rejected', receive: 'received', close: 'closed' } as any)[input.action]
        await req.payload.update({ collection: COLLECTION, id: row.id, data: { state, refundAmount, ...(input.action === 'receive' && { restocked: Boolean(input.restock) }), ...(input.action === 'close' && { refundReference: String(input.reference || '').slice(0, 120) }), history: [...(row.history || []), { state, reason, at: new Date().toISOString() }] }, overrideAccess: true, req })
      })
      return json({ ok: true })
    } catch (error) { return failure(error instanceof ReturnConflict ? error.message : 'Chưa xử lý được yêu cầu. Vui lòng thử lại.', error instanceof ReturnConflict ? 409 : 503) }
  } },
  { path: '/plugins/shop/return-evidence', method: 'post', handler: async (req) => {
    if (!originOK(req)) return failure('Không có quyền.', 403)
    if (!await takeCommerceLimit(req, 'return-evidence', clientPrincipal(req), 20)) return failure('Thử lại sau ít phút.', 429)
    if (Number(req.headers.get('content-length')) > 1500000) return failure('Ảnh tối đa 1 MB.', 413)
    let input: any
    try { input = await limitedJSON(req, 1500000) } catch (error) { return failure('Ảnh tối đa 1 MB.', error instanceof RangeError ? 413 : 400) }
    if (!input || typeof input.image !== 'string' || input.image.length > 1400000) return failure('Ảnh tối đa 1 MB.', 400)
    const match = input.image.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/)
    if (!match) return failure('Chọn ảnh PNG, JPEG hoặc WebP.', 400)
    const bytes = Buffer.from(match[2], 'base64')
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    if (!valid || bytes.length > 1048576) return failure('Ảnh không hợp lệ hoặc lớn hơn 1 MB.', 400)
    let image: Buffer
    try { image = await encodeReturnEvidence(bytes) } catch { return failure('Không đọc được ảnh. Chọn ảnh PNG, JPEG hoặc WebP dưới 16 megapixel.', 400) }
    const filename = `${randomUUID()}.webp`, target = path.join(fileRoot(), filename)
    try {
      await inTransaction(req, async () => {
        const row = await readReturn(req, input.id)
        const order = await orderFor(req, row.orderNo, input.token)
        if (!order || row.revision !== input.revision || row.state !== 'requested' || (row.evidence || []).length >= 3) throw new ReturnConflict('Không thể đính kèm. Tải lại; tối đa 3 ảnh khi đang chờ duyệt.')
        const claimed = await req.payload.db.updateOne({ collection: 'shop-returns', req, where: { and: [{ id: { equals: row.id } }, { revision: { equals: row.revision } }] }, data: { revision: row.revision + 1 }, options: { atomic: true } })
        if (!claimed) throw new ReturnConflict('Yêu cầu đã thay đổi.')
        await fs.mkdir(fileRoot(), { recursive: true }); await fs.writeFile(target, image, { flag: 'wx', mode: 0o600 })
        await req.payload.update({ collection: COLLECTION, id: row.id, data: { evidence: [...(row.evidence || []), { filename, mime: 'image/webp' }] }, overrideAccess: true, req })
      })
      return json({ ok: true })
    } catch { await fs.unlink(target).catch(() => {}); return failure('Không thể đính kèm ảnh. Tải lại yêu cầu và thử lại.') }
  } },
  { path: '/plugins/shop/return-evidence', method: 'get', handler: async (req) => {
    const q = new URL(req.url!).searchParams, row = await readReturn(req, q.get('id')).catch(() => null)
    if (!row || !await orderFor(req, row.orderNo, q.get('token'))) return failure('Không tìm thấy.', 404)
    const item = row.evidence?.[Number(q.get('index'))]
    if (!item || !safeEvidenceName(item.filename)) return failure('Không tìm thấy.', 404)
    const bytes = await fs.readFile(path.join(fileRoot(), item.filename)).catch(() => null)
    return bytes ? new Response(bytes, { headers: { 'Content-Type': item.mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'" } }) : failure('Không tìm thấy.', 404)
  } },
]
