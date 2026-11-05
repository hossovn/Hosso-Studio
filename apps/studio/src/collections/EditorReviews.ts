import { APIError, type CollectionConfig } from 'payload'
import { pageEditors } from '../lib/access'
import {contentDiscussionAccess,assertContent,isContentRestricted} from '../lib/content-permissions'

/** Authenticated design discussion lives outside publishable page JSON. Replies are separate records. */
export const EditorReviews: CollectionConfig = {
  slug: 'editor-reviews', lockDocuments: false,
  admin: { hidden: true },
  access: { read: contentDiscussionAccess('read',pageEditors), create: pageEditors, update: contentDiscussionAccess('edit',pageEditors), delete: () => false },
  fields: [
    { name: 'scope', type: 'text', required: true, index: true },
    { name: 'targetCollection', type: 'text', required: true },
    { name: 'targetId', type: 'text', required: true },
    { name: 'language', type: 'text', required: true },
    { name: 'owner', type: 'text', required: true },
    { name: 'element', type: 'text' },
    { name: 'x', type: 'number', min: 0, max: 1, required: true },
    { name: 'y', type: 'number', min: 0, max: 1, required: true },
    { name: 'parentId', type: 'text', index: true },
    { name: 'body', type: 'textarea', maxLength: 4000, required: true },
    { name: 'authorId', type: 'text', required: true },
    { name: 'authorName', type: 'text', required: true },
    { name: 'resolved', type: 'checkbox', defaultValue: false },
  ],
  hooks: { beforeValidate: [async ({ data = {}, originalDoc, operation, req }) => {
    if (operation === 'update') return { ...originalDoc, resolved: typeof data.resolved === 'boolean' ? data.resolved : originalDoc.resolved }
    const collection = String(data.targetCollection), id = String(data.targetId), language = String(data.language || 'vi')
    if (!['pages', 'posts', 'reusable-blocks', 'area'].includes(collection) || id.length > 100 || !/^[a-z]{2}(?:-[a-zA-Z]{2})?$/.test(language)) throw new APIError('Đích góp ý không hợp lệ.', 400)
    let target: unknown
    try { target = collection === 'area' ? await req.payload.findGlobal({ slug: 'site-areas', overrideAccess: false, req }) : await req.payload.findByID({ collection: collection as 'pages', id, depth: 0, overrideAccess: false, req }) } catch { /* missing or inaccessible target */ }
    if (!target) throw new APIError('Không truy cập được trang cần góp ý.', 404)
    if(collection==='pages'||collection==='posts')await assertContent(req,collection,'edit',target)
    else if(await isContentRestricted(req))throw new APIError('Không có quyền góp ý phạm vi này.',403)
    const scope = `${collection}:${id}:${language}`
    if (data.parentId) {
      const parent = await req.payload.findByID({ collection: 'editor-reviews', id: data.parentId, overrideAccess: false, req })
      if (parent.scope !== scope || parent.parentId) throw new APIError('Luồng góp ý không hợp lệ.', 400)
      for (const key of ['owner', 'element', 'x', 'y']) data[key] = parent[key as keyof typeof parent]
    }
    if (typeof data.body !== 'string' || !data.body.trim()) throw new APIError('Nhập nội dung góp ý.', 400)
    return { ...data, body: data.body.trim(), scope, targetCollection: collection, targetId: id, language, authorId: String(req.user?.id), authorName: String((req.user as any)?.name || 'Thành viên ' + req.user?.id), resolved: false }
  }] },
}
