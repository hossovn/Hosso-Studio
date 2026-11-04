import { cancelCmsSchedule as cancelSchedule } from './cms-schedule'
import { APIError, type Endpoint, type PayloadRequest } from 'payload'
import { hasRole, canPublish, isAdmin } from './access'
import { cmsMeta, containsMedia } from './cms-model'
import { inTransaction } from '../../../../packages/blocks/src/transactions'
import { lockSitePublication } from './site-publication-lock'
import hosso from '@hosso-config'
const allowed = ['pages','posts','media','content-entries'] as const
const writer = (req: PayloadRequest) => hasRole(req.user,'admin','publisher','editor','author')
const noStore = { 'Cache-Control': 'no-store' }
const json = (value: any, status = 200) => Response.json(value, { status, headers: noStore })
const params = (req: PayloadRequest) => new URL(req.url || '', 'http://localhost').searchParams
export async function allCmsDocs(req: PayloadRequest, collection: string, extra: any = {}) {
 const docs: any[] = []; let page = 1, more = true
 while (more) { const result = await req.payload.find({ collection: collection as any, draft: true, depth: 0, limit: 100, page, req, overrideAccess: false, ...extra }); docs.push(...result.docs); more = result.hasNextPage; page++ }
 return docs
}
const manage = (req: PayloadRequest, collection: string) => writer(req) && (collection === 'posts' || collection === 'media' || hasRole(req.user,'admin','publisher','editor'))
export async function mediaReferences(req: PayloadRequest, id: string, filename: string) {
 const references = new Map<string, { title: string; href: string }>()
 for (const [collection, config] of Object.entries(req.payload.collections)) {
  if (collection === 'media' || ['users','edit-locks','payload-kv','payload-jobs','payload-locked-documents','commerce-rate-buckets'].includes(collection)) continue
  for (const draft of config.config.versions ? [false, true] : [false]) {
   let page = 1, more = true
   while (more) {
    const batch = await req.payload.find({ collection: collection as any, locale: 'all', draft, trash: true, depth: 0, limit: 100, page, req, overrideAccess: true })
    for (const doc of batch.docs as any[]) if (containsMedia(doc, id, filename)) references.set(collection + '/' + doc.id, { title: String(doc.title?.vi || doc.title || doc.name || collection + ' #' + doc.id), href: '/admin/collections/' + collection + '/' + doc.id })
    more = batch.hasNextPage; page++
   }
  }
 }
 for (const global of req.payload.config.globals) for (const draft of global.versions ? [false,true] : [false]) {
  const doc = await req.payload.findGlobal({ slug: global.slug as any, draft, locale: 'all', depth: 0, req, overrideAccess: true })
  if (containsMedia(doc,id,filename)) references.set(global.slug, { title: global.slug, href: '/admin/globals/' + global.slug })
 }
 return [...references.values()]
}
export const cmsList: Endpoint = { path: '/site/cms', method: 'get', handler: async (req) => {
 if (!writer(req)) return json({ error: 'Forbidden' },403)
 const sp = params(req), collection = sp.get('kind') || 'pages', locale = hosso.locales.some((l) => l.code === sp.get('locale')) ? sp.get('locale')! : hosso.locales[0].code
 if (!(allowed as readonly string[]).includes(collection) || !manage(req,collection)) return json({ error: 'Forbidden' },403)
 const q = (sp.get('q') || '').trim().slice(0,160), trash = sp.get('status') === 'trash', where: any = { and: [] }
 if (q) where.and.push({ or: (collection === 'media' ? ['filename','alt'] : ['title','slug']).map((key) => ({ [key]: { contains: q } })) })
 if (collection === 'posts' && !hasRole(req.user,'admin','publisher','editor')) where.and.push({ createdBy: { equals: req.user!.id } })
 if (trash) where.and.push({ deletedAt: { exists: true } })
 let docs = await allCmsDocs(req, collection, { where: where.and.length ? where : undefined, trash, sort: '-updatedAt', locale })
 const status = sp.get('status'), category = sp.get('category'), folder = sp.get('folder'), tag = sp.get('tag'), type = sp.get('type'), assignee = sp.get('assignee')
 const folders = [...new Set(docs.map((d) => String(d.cms?.folder || '')).filter(Boolean))].sort()
 docs = docs.filter((doc) => {
  const matchesStatus = !status || ['all','trash'].includes(status) || (status === 'published' ? doc._status === 'published' || doc.published : status === 'draft' ? doc._status === 'draft' : cmsMeta(doc.cms).review === status)
  return matchesStatus && (!category || (doc.categories ?? []).some((c: any) => String(c?.id ?? c) === category)) && (!folder || doc.cms?.folder === folder) && (!tag || String(doc.cms?.tags || '').toLowerCase().split(',').map((t) => t.trim()).includes(tag.toLowerCase())) && (!type || (collection === 'content-entries' ? doc.kind === type : String(doc.mimeType || '').startsWith(type + '/'))) && (!assignee || cmsMeta(doc.cms).assignee === assignee)
 })
 const total = docs.length, size = sp.get('layout') === 'tree' && collection === 'pages' ? total || 1 : 12, page = Math.min(Math.max(1, Number(sp.get('page')) || 1), Math.max(1, Math.ceil(total / size)))
 const categories = collection === 'posts' ? await allCmsDocs(req, 'post-categories', { locale }) : []
 const users = canPublish(req.user) ? (await allCmsDocs(req,'users', {overrideAccess:true,select:{email:true,roles:true},where:{roles:{in:['admin','publisher','editor','author']}}})).map((u) => ({ id: String(u.id), email: u.email })) : []
 const parents = collection === 'pages' ? (await allCmsDocs(req, 'pages', { locale })).map((d) => ({id:d.id,title:d.title})) : []
 const settings: any = collection === 'pages' ? await req.payload.findGlobal({ slug: 'site-settings', draft: true, depth: 0, req, overrideAccess: true }) : null
 return json({ docs: docs.slice((page-1)*size,page*size).map(({ id,title,slug,_status,updatedAt,categories,cms,mimeType,filename,url,alt,published,kind,writingMode,deletedAt }: any) => ({ id,title,slug,_status,updatedAt,categories,cms,mimeType,filename,url,alt,published,kind,writingMode,deletedAt })), total, page, pages: Math.max(1,Math.ceil(total/size)), folders, categories, users, parents, canPublish: canPublish(req.user), canHome: isAdmin(req.user), canEditPages: hasRole(req.user,'admin','publisher','editor'), homeSlug: settings?.homeSlug || 'home', defaultLocale:hosso.locales[0].code, locale })
} }
export const cmsSearch: Endpoint = { path: '/site/cms/search', method: 'get', handler: async (req) => {
 if (!writer(req)) return json({ error: 'Forbidden' },403)
 const sp = params(req), q = (sp.get('q') || '').trim().slice(0,100)
 if (!q) return json({ results: [] })
 const results: any[] = []
 for (const collection of [...allowed, ...(canPublish(req.user) && req.payload.collections['shop-products'] ? ['shop-products'] : [])]) {
  if (!manage(req,collection) && collection !== 'shop-products') continue
  const fields = collection === 'media' ? ['filename','alt'] : collection === 'shop-products' ? ['name','code'] : ['title','slug']
  const where: any = { and: [{ or: fields.map((key) => ({ [key]: { contains: q } })) }] }
  if (collection === 'posts' && !hasRole(req.user,'admin','publisher','editor')) where.and.push({ createdBy: { equals: req.user!.id } })
  const docs = await req.payload.find({ collection: collection as any, where, draft: ['pages','posts'].includes(collection), depth: 0, limit: 6, req, overrideAccess: false, locale: (sp.get('locale') || hosso.locales[0].code) as any })
  for (const doc of docs.docs as any[]) results.push({ id: doc.id, kind: collection, title: doc.title || doc.name || doc.alt || doc.filename, href: '/admin/collections/' + collection + '/' + doc.id })
 }
 return json({ results })
} }
export const cmsMutate: Endpoint = { path: '/site/cms', method: 'post', handler: async (req) => {
 if (!writer(req)) return json({ error: 'Forbidden' },403)
 const body = await req.json?.().catch(() => null), collection = body?.kind
 if (!(allowed as readonly string[]).includes(collection) || !manage(req,collection) || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 50) return json({ error: 'Invalid request' },400)
 const locale = hosso.locales.some((l) => l.code === body.locale) ? body.locale : hosso.locales[0].code
 try { return await inTransaction(req, async () => {
  await lockSitePublication(req)
  const output = []
  for (const id of [...new Set(body.ids)] as (string|number)[]) {
   const doc: any = await req.payload.findByID({ collection, id, draft: true, trash: true, depth: 0, locale, req, overrideAccess: false })
   if (collection === 'posts' && !hasRole(req.user,'admin','publisher','editor') && String(doc.createdBy?.id ?? doc.createdBy) !== String(req.user!.id)) throw new APIError('Forbidden',403)
   if (body.revisions?.[id] && body.revisions[id] !== doc.updatedAt) throw new APIError('Nội dung đã đổi. Tải lại danh sách trước khi lưu.',409)
   if (body.action === 'home') { if (!isAdmin(req.user) || collection !== 'pages' || doc.deletedAt) throw new APIError('Forbidden',403); await req.payload.updateGlobal({ slug: 'site-settings', data: { homeSlug: doc.slug } as any, draft: true, req, overrideAccess: false }); output.push(doc.id); continue }
   if (doc.deletedAt && !['restore','trash'].includes(body.action)) throw new APIError('Khôi phục nội dung trước khi chỉnh sửa.',400)
   if (body.action === 'duplicate') {
    if (!['pages','posts'].includes(collection)) throw new APIError('Invalid collection',400)
    const { id: _id, createdAt, updatedAt, deletedAt, cms, _status, createdBy, ...copy } = doc
    const slug = String(doc.slug) + '-copy-' + crypto.randomUUID().slice(0,8)
    const created: any = await req.payload.create({ collection, data: { ...copy, slug, title: doc.title + ' (bản sao)', cms: { review: 'draft' }, _status: 'draft' }, draft: true, locale, req, overrideAccess: false })
    for (const language of hosso.locales.filter((l) => l.code !== locale)) { const source: any = await req.payload.findByID({ collection,id,locale: language.code as any,fallbackLocale:false,draft:true,depth:0,req,overrideAccess:false }); const translated = Object.fromEntries(['title','description','excerpt','content','articleBody','seo'].filter((key) => source[key] != null).map((key) => [key,source[key]])); if (Object.keys(translated).length) await req.payload.update({ collection,id:created.id,data:{...translated,_status:'draft'},draft:true,locale:language.code as any,req,overrideAccess:false }) }
    output.push(created.id); continue
   }
   if (body.action === 'trash') { if (!canPublish(req.user) || !['pages','posts'].includes(collection)) throw new APIError('Forbidden',403); await cancelSchedule(req,collection,id); await req.payload.update({ collection,id,data:{deletedAt:new Date().toISOString(),_status:'draft',cms:{...doc.cms,review:'draft',scheduledAt:null}} as any,req,overrideAccess:false }); output.push(id); continue }
   if (body.action === 'restore') { if (!canPublish(req.user) || !['pages','posts'].includes(collection)) throw new APIError('Forbidden',403); await req.payload.update({collection,id,trash:true,data:{deletedAt:null,_status:'draft'} as any,req,overrideAccess:false});output.push(id);continue }
   if (body.action === 'schedule') { if (!canPublish(req.user) || !['pages','posts'].includes(collection)) throw new APIError('Forbidden',403); const at = new Date(body.at); if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) throw new APIError('Chọn thời điểm trong tương lai.',400); await cancelSchedule(req,collection,id); const meta = { ...cmsMeta(doc.cms), review:'scheduled',scheduledAt:at.toISOString() }; await req.payload.update({collection,id,data:{cms:meta,_status:'draft'},draft:true,locale,req,overrideAccess:false}); await req.payload.jobs.queue({task:'schedulePublish',input:{doc:{relationTo:collection,value:Number(id)},type:'publish',locale,user:{relationTo:'users',value:req.user!.id}},waitUntil:at,req});output.push(id);continue }
   if (body.action === 'cancel-schedule') { if (!canPublish(req.user) || !['pages','posts'].includes(collection)) throw new APIError('Forbidden',403); await cancelSchedule(req,collection,id); await req.payload.update({collection,id,data:{cms:{...doc.cms,review:'draft',scheduledAt:null}},draft:true,locale,req,overrideAccess:false});output.push(id);continue }
   if (body.action !== 'update') throw new APIError('Unknown action',400)
   const patch: any = {}, fields = body.patch || {}
   for (const key of collection === 'media' ? ['alt'] : ['title']) if (typeof fields[key] === 'string') { if (!fields[key].trim()) throw new APIError('Tiêu đề hoặc mô tả không được để trống.',400); patch[key] = fields[key].trim().slice(0,300) }
   if (collection === 'posts' && Array.isArray(fields.categories)) patch.categories = fields.categories.slice(0,50)
   if (fields.cms) { patch.cms = { ...doc.cms, ...cmsMeta({ ...doc.cms,...fields.cms }) }; if (collection === 'media') { patch.cms.folder = String(fields.cms.folder ?? doc.cms?.folder ?? '').slice(0,100); patch.cms.tags = String(fields.cms.tags ?? doc.cms?.tags ?? '').slice(0,500) } }
   if (fields.cms?.assignee && canPublish(req.user)) await req.payload.findByID({collection:'users',id:fields.cms.assignee,depth:0,req,overrideAccess:true,select:{email:true,roles:true}})
   if (fields.cms?.review && fields.cms.review !== 'scheduled' && doc.cms?.scheduledAt) { if (!canPublish(req.user)) throw new APIError('Hủy lịch trước khi thay đổi trạng thái.',403); await cancelSchedule(req,collection,id); patch.cms.scheduledAt = null }
   output.push((await req.payload.update({ collection,id,data:patch,draft:['pages','posts'].includes(collection),locale,req,overrideAccess:false })).id)
  }
  return json({ ok:true,ids:output })
 }) } catch (error: any) { return json({ error: error.message || 'Không lưu được thay đổi.' },error.status || 400) }
} }
export const cmsUsage: Endpoint = { path: '/site/cms/media-usage/:id', method: 'get', handler: async (req) => {
 if (!writer(req)) return json({error:'Forbidden'},403)
 const id = String(req.routeParams?.id || ''), doc: any = await req.payload.findByID({collection:'media',id,depth:0,req,overrideAccess:false})
 const references = await mediaReferences(req,id,doc.filename || '')
 return json({ references: canPublish(req.user) ? references : references.map(() => ({title:'Nội dung đang sử dụng tệp',href:''})) })
} }

export const cmsCreateArticle: Endpoint = { path:'/site/cms/article',method:'post',handler:async(req)=>{
 if(!writer(req)) return json({error:'Forbidden'},403)
 const body=await req.json?.().catch(()=>null), locale=hosso.locales.some((l)=>l.code===body?.locale)?body.locale:hosso.locales[0].code
 const doc=await req.payload.create({collection:'posts',draft:true,locale,req,overrideAccess:false,data:{title:req.i18n?.language==='en'?'Untitled article':'Bài viết mới',slug:'article-'+crypto.randomUUID().slice(0,8),writingMode:'article',articleTemplate:'reading',_status:'draft',articleBody:{root:{type:'root',version:1,direction:null,format:'',indent:0,children:[{type:'paragraph',version:1,direction:null,format:'',indent:0,children:[]}]}}}})
 return json({id:doc.id})
}}
