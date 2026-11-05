import { APIError, type Access, type CollectionBeforeChangeHook, type PayloadRequest, type Where } from 'payload'
import { hasRole, isAdmin, canPublish, canEditPages } from './access'

export type ContentAction = 'read' | 'edit' | 'review' | 'publish'
export type ContentScope = 'pages' | 'posts' | 'content-entries'
export type ContentRule = { collection: ContentScope; type?: string; categories?: string[]; read: boolean; edit: boolean; review: boolean; publish: boolean }
export type ContentPermissions = { enabled: boolean; rules: ContentRule[] }
export const CONTENT_SCOPES: ContentScope[] = ['pages','posts','content-entries']
export function permissionErrors(value: any): string[] {
 if(value==null)return []
 if(typeof value!=='object'||Array.isArray(value)||typeof value.enabled!=='boolean'||!Array.isArray(value.rules)||value.rules.length>100)return ['Cấu hình phân quyền không hợp lệ.']
 return value.rules.flatMap((r:any)=>!r || !CONTENT_SCOPES.includes(r.collection) || ['read','edit','review','publish'].some(k=>typeof r[k]!=='boolean') || r.type!=null && (r.collection!=='content-entries'||typeof r.type!=='string'||r.type.length>64) || r.categories!=null && (r.collection!=='posts'||!Array.isArray(r.categories)||r.categories.length>100||r.categories.some((id:any)=>typeof id!=='string'||!/^\d+$/.test(id))) || (r.edit||r.review||r.publish)&&!r.read ? ['Mỗi phạm vi cần quyền xem trước khi cấp quyền sửa, duyệt hoặc xuất bản.'] : [])
}
/** Reload restrictions from the database so revocation applies to existing JWTs and scheduled jobs. */
export async function contentIdentity(req: PayloadRequest): Promise<any> {
 if(!req.user)return null
 const key='cms-content-identity-'+req.user.id
 if(req.context[key])return req.context[key]
 const identity=await req.payload.findByID({collection:'users',id:req.user.id,depth:0,req,overrideAccess:true,select:{roles:true,contentPermissions:true}})
 req.context[key]=identity
 return identity
}
export async function isContentRestricted(req: PayloadRequest) {
 const user=await contentIdentity(req)
 return !!user && !isAdmin(user) && user.contentPermissions?.enabled===true
}
function roleAllows(user:any,collection:ContentScope,action:ContentAction,doc?:any) {
 if(isAdmin(user))return true
 if(action==='publish'||action==='review')return canPublish(user)
 if(action==='read')return hasRole(user,'publisher','editor','author')
 if(collection==='posts')return canEditPages(user)||hasRole(user,'author')&&(!doc||String(doc.createdBy?.id??doc.createdBy)===String(user.id))
 return canEditPages(user)
}
const matchingRule=(r:ContentRule,collection:ContentScope,action:ContentAction,doc?:any)=>r.collection===collection&&r[action]&&(!r.type||doc?.kind===r.type)&&(!r.categories?.length||(doc?.categories?.length>0&&doc.categories.every((c:any)=>r.categories!.includes(String(c?.id??c)))))
export async function canContent(req:PayloadRequest,collection:ContentScope,action:ContentAction,doc?:any) {
 const user=await contentIdentity(req)
 if(!user)return false
 if(!roleAllows(user,collection,action,doc))return false
 if(isAdmin(user)||!user.contentPermissions?.enabled)return true
 if(permissionErrors(user.contentPermissions).length)return false
 return user.contentPermissions.rules.some((r:ContentRule)=>matchingRule(r,collection,action,doc))
}
export async function assertContent(req:PayloadRequest,collection:ContentScope,action:ContentAction,doc?:any) {
 if(req.user && !(await canContent(req,collection,action,doc)))throw new APIError('Bạn không có quyền thực hiện thao tác trong phạm vi nội dung này.',403)
}
export function scopedContentAccess(collection:ContentScope,action:ContentAction,base:Access):Access {
 return async args=>{
  const original=await base(args)
  if(original===false||!args.req.user)return original
  const user=await contentIdentity(args.req)
  if(isAdmin(user)||!user?.contentPermissions?.enabled)return original
  if(permissionErrors(user.contentPermissions).length)return false
  const rules:ContentRule[]=user.contentPermissions.rules.filter((r:ContentRule)=>r.collection===collection&&r[action])
  if(!rules.length)return false
  const scopes:Where[]=await Promise.all(rules.map(async (r):Promise<Where>=>{
   const and:Where[]=[]
   if(r.type)and.push({kind:{equals:r.type}})
   // Reject mixed-category posts: every category must be covered by one grant.
   if(r.categories?.length){
    const ids:(string|number)[]=[];let page=1
    do {const batch=await args.req.payload.find({collection:'posts',where:{categories:{in:r.categories}},draft:true,trash:true,depth:0,limit:100,page,select:{categories:true},req:args.req,overrideAccess:true})
     for(const doc of batch.docs)if(matchingRule(r,collection,action,doc))ids.push(doc.id)
     if(!batch.hasNextPage)break;page++
    }while(true)
    and.push({id:{in:ids}})
   }
   return and.length?{and}: {id:{exists:true}}
  }))
  const where:Where={or:scopes}
  return original===true?where:{and:[original,where]}
 }
}
/** Scope discussion records through their parent document, including the native REST/GraphQL list. */
export function contentDiscussionAccess(action:'read'|'edit',base:Access):Access {
 return async args=>{
  const original=await base(args)
  if(!original||!(await isContentRestricted(args.req)))return original
  const scopes:Where[]=[]
  for(const collection of ['pages','posts'] as const){const ids:string[]=[];let page=1
   do{let batch
    try{batch=await args.req.payload.find({collection,draft:true,depth:0,limit:100,page,req:args.req,overrideAccess:false})}catch(error:any){if(error.status===403)break;throw error}
    for(const doc of batch.docs)if(await canContent(args.req,collection,action,doc))ids.push(String(doc.id))
    if(!batch.hasNextPage)break;page++
   }while(true)
   scopes.push({and:[{targetCollection:{equals:collection}},{targetId:{in:ids}}]})
  }
  return {or:scopes}
 }
}
export function contentVersionAccess(collection:ContentScope):Access {
 return async({req})=>{
  if(!hasRole(req.user,'admin','publisher','editor','author'))return false
  if(!(await isContentRestricted(req)))return true
  const ids:(string|number)[]=[];let page=1
  do{let batch
   try{batch=await req.payload.find({collection,draft:true,trash:true,depth:0,select:{title:true},limit:100,page,req,overrideAccess:false})}catch(error:any){if(error.status===403)return false;throw error}
   ids.push(...batch.docs.map(doc=>doc.id));if(!batch.hasNextPage)break;page++
  }while(true)
  return {parent:{in:ids}}
 }
}
export const enforceContentScope:CollectionBeforeChangeHook=async({data,originalDoc,req,collection,operation})=>{
 if(!req.user)return data
 const scope=collection.slug as ContentScope, doc={...originalDoc,...data}
 if(operation==='create'&&scope==='posts'&&!doc.createdBy)doc.createdBy=req.user.id
 await assertContent(req,scope,'edit',doc)
 if(scope==='content-entries'&&(doc.published || originalDoc?.published))await assertContent(req,scope,'publish',doc)
 if(data._status==='published')await assertContent(req,scope,'publish',doc)
 if(data.cms && data.cms.scheduledAt!==undefined && (data.cms.scheduledAt||null)!==(originalDoc?.cms?.scheduledAt||null))await assertContent(req,scope,'publish',doc)
 if(data.cms && ['approved','scheduled','changes'].includes(data.cms.review) && data.cms.review!==originalDoc?.cms?.review)await assertContent(req,scope,'review',doc)
 if(data.cms && (data.cms.assignee!==undefined&&data.cms.assignee!==originalDoc?.cms?.assignee || data.cms.scheduledAt && data.cms.scheduledAt!==originalDoc?.cms?.scheduledAt))await assertContent(req,scope,'review',doc)
 if(data.deletedAt!==undefined&&data.deletedAt!==originalDoc?.deletedAt)await assertContent(req,scope,'publish',doc)
 return data
}
