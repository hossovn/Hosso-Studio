import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeDeleteHook, type PayloadRequest } from 'payload'
import { BUILTIN_CONTENT_TYPES, entryDataErrors, schemaErrors, validContentKey, type ContentField, type ContentType } from './content-schema'

export async function contentTypes(req: PayloadRequest): Promise<ContentType[]> {
 const docs: any[] = []; let page = 1
 do { const batch = await req.payload.find({ collection: 'content-types', depth: 0, limit: 100, page, req, overrideAccess: true }); docs.push(...batch.docs); if (!batch.hasNextPage) break; page++ } while (true)
 return [...BUILTIN_CONTENT_TYPES, ...docs.map(d => ({ id: d.id, slug: d.slug, title: d.title, fields: d.fields as ContentField[] }))]
}
export async function contentType(req: PayloadRequest, slug: string) {
 const builtin = BUILTIN_CONTENT_TYPES.find(t => t.slug === slug)
 if (builtin) return builtin
 const result = await req.payload.find({collection:'content-types',where:{slug:{equals:slug}},depth:0,limit:1,req,overrideAccess:true})
 const doc: any = result.docs[0]
 if (!doc) throw new APIError('Loại nội dung không tồn tại.',400)
 return doc as ContentType
}
export async function validateEntry(req: PayloadRequest, type: ContentType, data: any, publicOnly = false, selfSlug?: string) {
 const errors = entryDataErrors(type.fields, data ?? {})
 if (errors.length) throw new APIError(errors.join('\n'),400)
 for (const f of type.fields.filter(f => f.type === 'relationship' && data?.[f.key])) {
  if (selfSlug && data[f.key] === selfSlug && f.target === type.slug) continue
  const result = await req.payload.find({collection:'content-entries',where:{and:[{slug:{equals:data[f.key]}},{kind:{equals:f.target}},...(publicOnly?[{published:{equals:true}}]:[])]},depth:0,limit:1,req,overrideAccess:!req.user})
  if (!result.docs[0]) throw new APIError(`${f.label}: nội dung liên kết không tồn tại, chưa công khai hoặc không được phép truy cập.`,400)
 }
}
export const validateContentType: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
 const slug = data.slug ?? originalDoc?.slug, fields = data.fields ?? originalDoc?.fields
 if (!validContentKey(slug) || BUILTIN_CONTENT_TYPES.some(t=>t.slug===slug)) throw new APIError('Mã loại nội dung không hợp lệ hoặc đã được dành sẵn.',400)
 if (originalDoc?.id && slug !== originalDoc.slug) throw new APIError('Mã loại nội dung không đổi sau khi tạo.',400)
 const errors = schemaErrors(fields)
 if(errors.length) throw new APIError(errors.join('\n'),400)
 if(!req.context.cmsDeferEntryLinks || req.user) for (const f of fields.filter((f:ContentField)=>f.type==='relationship')) if(f.target!==slug) await contentType(req,f.target)
 // A schema edit must preserve every locale of existing records, including private ones.
 if(originalDoc?.id && JSON.stringify(fields)!==JSON.stringify(originalDoc.fields)) {
  let page=1
  do {
   const batch=await req.payload.find({collection:'content-entries',where:{kind:{equals:slug}},locale:'all',depth:0,limit:100,page,req,overrideAccess:true})
   for(const doc of batch.docs as any[]) for(const localized of Object.values(doc.data || {})) {
    const problems=entryDataErrors(fields,localized??{})
    if(problems.length) throw new APIError(`Thay đổi làm dữ liệu hiện có không hợp lệ (${doc.slug}): ${problems.join(' ')}`,400)
   }
   if(!batch.hasNextPage)break;page++
  }while(true)
 }
 return data
}
export const protectContentType: CollectionBeforeDeleteHook = async ({id,req}) => {
 const doc=await req.payload.findByID({collection:'content-types',id,depth:0,req,overrideAccess:true})
 const existing=await req.payload.count({collection:'content-entries',where:{kind:{equals:doc.slug}},req,overrideAccess:true})
 if(existing.totalDocs || (await contentTypes(req)).some(t=>t.fields.some(f=>f.type==='relationship'&&f.target===doc.slug&&t.slug!==doc.slug))) throw new APIError('Loại nội dung đang có dữ liệu hoặc được loại khác liên kết.',400)
}
export const validateContentEntry: CollectionBeforeChangeHook = async ({data,originalDoc,req}) => {
 const kind=data.kind??originalDoc?.kind, slug=data.slug??originalDoc?.slug
 const type=await contentType(req,kind)
 if(originalDoc?.published && data.published===false && !(req.context.cmsDeferEntryLinks&&!req.user))await assertEntryNotReferenced(req,originalDoc,true)
 if(originalDoc?.id && (kind!==originalDoc.kind || slug!==originalDoc.slug)) throw new APIError('Mã và loại nội dung không đổi sau khi tạo. Hãy tạo mục mới.',400)
 if(req.context.cmsDeferEntryLinks && !req.user){const errors=entryDataErrors(type.fields,data.data??originalDoc?.data??{});if(errors.length)throw new APIError(errors.join(' '),400)}
 else await validateEntry(req,type,data.data??originalDoc?.data??{},Boolean(data.published??originalDoc?.published),slug)
 return data
}
async function assertEntryNotReferenced(req:PayloadRequest,doc:any,publicOnly=false){
 for(const type of await contentTypes(req)) {
  const keys=type.fields.filter(f=>f.type==='relationship'&&f.target===doc.kind).map(f=>f.key)
  if(!keys.length)continue
  let page=1
  do {const batch=await req.payload.find({collection:'content-entries',where:{and:[{kind:{equals:type.slug}},...(publicOnly?[{published:{equals:true}}]:[])]},locale:'all',depth:0,limit:100,page,req,overrideAccess:true})
   if((batch.docs as any[]).some(row=>String(row.id)!==String(doc.id)&&Object.values(row.data||{}).some((data:any)=>keys.some(key=>data?.[key]===doc.slug)))) throw new APIError('Nội dung đang được mục khác liên kết. Gỡ liên kết trước khi xóa hoặc ẩn.',400)
   if(!batch.hasNextPage)break;page++
  }while(true)
 }
}
export const protectLinkedEntry: CollectionBeforeDeleteHook = async ({id,req}) => {
 await assertEntryNotReferenced(req,await req.payload.findByID({collection:'content-entries',id,depth:0,req,overrideAccess:true}))
}
