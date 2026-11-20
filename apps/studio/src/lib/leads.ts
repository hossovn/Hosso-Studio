import type { Endpoint } from 'payload'
import { inTransaction } from '@hosso/studio-blocks/transactions'
import { canModerate } from './access'

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const
export const leadsList: Endpoint = { path: '/site/leads', method: 'get', handler: async (req) => {
  if (!canModerate(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const query = new URL(req.url || '', 'http://localhost').searchParams
  const status = query.get('status') || '', page = Math.max(1, Math.min(10000, Number(query.get('page')) || 1))
  const list = await req.payload.find({ collection: 'form-submissions', where: LEAD_STATUSES.includes(status as any) ? { leadStatus: { equals: status } } : {}, page, limit: 25, sort: '-createdAt', depth: 0, overrideAccess: false, req })
  const users = await req.payload.find({ collection: 'users', where: { roles: { in: ['admin', 'publisher', 'moderator'] } }, limit: 100, depth: 0, overrideAccess: true, req, select: { email: true, name: true } })
  const ids = list.docs.map((doc) => doc.id)
  const deliveries = ids.length ? await req.payload.find({ collection: 'form-deliveries' as any, where: { submission: { in: ids } }, limit: 100, depth: 0, req, overrideAccess: false, select: { submission: true, channel: true, status: true, attempts: true, lastError: true, nextAt: true, sentAt: true } }) : { docs: [] }
  return Response.json({ ...list, users: users.docs.map((user: any) => ({ id: user.id, label: user.name || user.email })), deliveries: deliveries.docs }, { headers: { 'Cache-Control': 'no-store' } })
} }

export const leadUpdate: Endpoint = { path: '/site/leads/:id', method: 'post', handler: async (req) => {
  if (!canModerate(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  let input: any
  try { input = await req.json?.() } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }) }
  if (!input || !Number.isInteger(input.revision) || !LEAD_STATUSES.includes(input.status) || (input.note && (typeof input.note !== 'string' || input.note.length > 4000))) return Response.json({ error: 'Dữ liệu không hợp lệ.' }, { status: 400 })
  const owner = input.assignedTo ? await req.payload.findByID({ collection: 'users', id: input.assignedTo, depth: 0, overrideAccess: true }).catch(() => null) : null
  if (input.assignedTo && !canModerate(owner)) return Response.json({ error: 'Người phụ trách không hợp lệ.' }, { status: 400 })
  return inTransaction(req, async () => {
    const lead: any = await req.payload.findByID({ collection: 'form-submissions', id: String(req.routeParams?.id), depth: 0, req, overrideAccess: false })
    if ((lead.revision || 0) !== input.revision) return Response.json({ error: 'Lead đã được cập nhật. Tải lại trước khi lưu.' }, { status: 409 })
    const claim = await req.payload.db.updateOne({ collection: 'form-submissions', req, where: { and: [{ id: { equals: lead.id } }, { revision: { equals: input.revision } }] }, data: { revision: input.revision + 1 }, options: { atomic: true } })
    if (!claim) return Response.json({ error: 'Lead đã được cập nhật. Tải lại trước khi lưu.' }, { status: 409 })
    const notes = Array.isArray(lead.notes) ? lead.notes : []
    if (input.note?.trim()) notes.push({ text: input.note.trim(), author: req.user!.email, at: new Date().toISOString() })
    const updated = await req.payload.update({ collection: 'form-submissions', id: lead.id, data: { leadStatus: input.status, assignedTo: owner?.id || null, notes }, req, overrideAccess: true })
    return Response.json({ lead: updated })
  })
} }

export const leadRetry: Endpoint = { path: '/site/lead-delivery/:id/retry', method: 'post', handler: async (req) => {
  if (!canModerate(req.user)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const result = await req.payload.db.updateOne({ collection: 'form-deliveries' as any, where: { and: [{ id: { equals: String(req.routeParams?.id) } }, { status: { in: ['retry', 'failed'] } }] }, data: { status: 'pending', attempts: 0, lastError: null, nextAt: new Date().toISOString() }, options: { atomic: true }, req })
  return Response.json(result ? { ok: true } : { error: 'Chỉ gửi lại lần chuyển bị lỗi.' }, { status: result ? 200 : 409 })
} }
