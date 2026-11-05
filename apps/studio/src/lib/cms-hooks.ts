import { cancelCmsSchedule } from './cms-schedule'
import { APIError, type CollectionBeforeChangeHook, type Field } from 'payload'
import { canPublish, hasRole } from './access'
import { cmsMeta } from './cms-model'
export const cmsField: Field = { name: 'cms', type: 'json', admin: { hidden: true }, access: { read: ({ req }) => hasRole(req.user, 'admin', 'publisher', 'editor', 'author') } }
export const cmsBeforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, req, collection }) => {
  const old = cmsMeta(originalDoc?.cms)
  const next = cmsMeta(data.cms ?? originalDoc?.cms)
  if (data.cms !== undefined && req.user && !canPublish(req.user) && (
    ['approved', 'scheduled'].includes(next.review!) && next.review !== old.review ||
    next.assignee !== old.assignee || next.scheduledAt !== old.scheduledAt
  )) throw new APIError('Bạn không có quyền duyệt, phân công hoặc lên lịch.', 403)
  if (data.cms !== undefined && collection.slug === 'pages' && next.parent) {
    const seen = new Set([String(originalDoc?.id ?? '')]); let parent = next.parent
    for (let depth = 0; parent; depth++) {
      if (seen.has(parent) || depth > 50) throw new APIError('Cây trang không được tạo vòng lặp.', 400)
      seen.add(parent)
      const doc: any = await req.payload.findByID({ collection: 'pages', id: parent, draft: true, depth: 0, req, overrideAccess: !req.user })
      if (doc.deletedAt) throw new APIError('Trang cha đang ở thùng rác.', 400)
      parent = cmsMeta(doc.cms).parent || ''
    }
  }
  const deletedAt = Object.hasOwn(data, 'deletedAt') ? data.deletedAt : originalDoc?.deletedAt
  if (data._status === 'published' && deletedAt) throw new APIError('Khôi phục nội dung khỏi thùng rác trước khi xuất bản.', 400)
  const edited = originalDoc && ['title', 'content', 'articleBody', 'writingMode', 'articleTemplate', 'excerpt', 'description', 'data'].some((key) => data[key] !== undefined && JSON.stringify(data[key]) !== JSON.stringify(originalDoc[key]))
  if (edited && old.review === 'approved' && next.review === 'approved') next.review = 'review'
  if ((data._status === 'published' || deletedAt) && old.scheduledAt && originalDoc?.id) await cancelCmsSchedule(req, collection.slug, originalDoc.id)
  if (data._status === 'published') { next.review = 'approved'; next.scheduledAt = null }
  next.log = old.log
  if (next.review !== old.review || next.note !== old.note || next.assignee !== old.assignee || next.scheduledAt !== old.scheduledAt || data.deletedAt !== undefined && data.deletedAt !== originalDoc?.deletedAt) {
    next.log = [...(old.log ?? []), { at: new Date().toISOString(), actor: req.user?.email || 'system', action: deletedAt ? 'trash' : next.review || 'draft', note: next.note || '' }].slice(-30)
  }
  data.cms = next
  return data
}
