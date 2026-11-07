import {createHmac,timingSafeEqual} from 'node:crypto'
import ExcelJS from 'exceljs'
import {unzipSync} from 'fflate'
import {APIError,type Endpoint,type PayloadRequest} from 'payload'
import {hasRole} from './access'
import {contentType,validateEntry} from './content-types'
import {contentSlug,importFields} from './content-schema'
import {canContent,type ContentScope} from './content-permissions'
import {inTransaction} from '../../../../packages/blocks/src/transactions'
import {lockSitePublication} from './site-publication-lock'
import hosso from '@hosso-config'
import { getPayloadSiteLocales } from './locale'

export type ImportSheet={name:string;headers:string[];rows:{number:number;cells:string[]}[]}
function fail(message:string,status=400):never{throw new APIError(message,status)}
const LIMIT=500,MAX_BYTES=5*1024*1024
export function parseCsv(text:string):string[][]{
 text=text.replace(/^\uFEFF/,'')
 const first=text.split(/\r?\n/)[0],delimiter=[';',',','\t'].sort((a,b)=>first.split(b).length-first.split(a).length)[0]
 const rows:string[][]=[],row:string[]=[];let cell='',quoted=false,closed=false
 for(let i=0;i<text.length;i++){
  const ch=text[i]
  if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=ch}
  else if(ch==='"'){if(cell||closed)fail('Dấu ngoặc kép CSV không hợp lệ.');quoted=true}
  else if(ch===delimiter){row.push(cell);cell='';closed=false}
  else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push([...row]);row.length=0;cell='';closed=false;if(rows.length>LIMIT+1)fail('Tối đa 500 dòng dữ liệu mỗi sheet.')}
  else{if(closed&&!/\s/.test(ch))fail('Ký tự sau dấu ngoặc kép CSV không hợp lệ.');if(!closed)cell+=ch}
 }
 if(quoted)fail('CSV thiếu dấu ngoặc kép đóng.')
 if(cell||row.length){row.push(cell);rows.push([...row])}
 return rows
}
function sheet(name:string,rows:string[][]):ImportSheet{
 if(rows.length<2||rows.length>LIMIT+1)fail('Sheet cần một dòng tiêu đề và từ 1 đến 500 dòng dữ liệu.')
 const headers=rows[0].map(s=>s.trim())
 if(headers.length>50||headers.some(h=>!h||h.length>200)||new Set(headers).size!==headers.length)fail('Cần tối đa 50 tiêu đề cột khác nhau, không để trống.')
 if(rows.some(row=>row.length>headers.length||row.some(c=>c.length>50000)))fail('Dòng có nhiều ô hơn tiêu đề hoặc ô dài quá 50.000 ký tự.')
 return {name,headers,rows:rows.slice(1).map((cells,i)=>({number:i+2,cells:headers.map((_,j)=>cells[j]??'')})).filter(row=>row.cells.some(c=>c.trim()))}
}
export async function parseImportFile(name:string,bytes:Uint8Array):Promise<ImportSheet[]>{
 if(bytes.length>MAX_BYTES)fail('Tệp tối đa 5 MB.')
 if(/\.csv$/i.test(name))return [sheet(name,parseCsv(new TextDecoder('utf-8',{fatal:true}).decode(bytes)))]
 if(!/\.xlsx$/i.test(name))fail('Chọn tệp .xlsx hoặc CSV UTF-8.')
 let size=0,count=0
 unzipSync(bytes,{filter:entry=>{size+=entry.originalSize;if(++count>1000||size>30*1024*1024)fail('Tệp Excel quá lớn sau khi giải nén.');return false}})
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(bytes) as any)
 if(workbook.worksheets.length>20)fail('Tối đa 20 sheet.')
 return workbook.worksheets.filter(ws=>ws.rowCount>1).map(ws=>{
  if(ws.rowCount>LIMIT+1||ws.columnCount>50)fail('Tối đa 500 dòng và 50 cột mỗi sheet.')
  const rows:string[][]=[]
  for(let i=1;i<=ws.rowCount;i++){
   const row:string[]=[]
   for(let j=1;j<=ws.columnCount;j++){
    const cell=ws.getCell(i,j)
    if(cell.type===ExcelJS.ValueType.Formula)fail(`Sheet ${ws.name}, ô ${cell.address}: chuyển công thức thành giá trị trước khi nhập.`)
    if(cell.type===ExcelJS.ValueType.Error)fail(`Sheet ${ws.name}, ô ${cell.address}: ô Excel có lỗi.`)
    row.push(cell.value instanceof Date?cell.value.toISOString().slice(0,10):cell.text)
   }
   rows.push(row)
  }
  return sheet(ws.name,rows)
 })
}
export type ImportInput={collection:ContentScope;type?:string;locale:string;mode:'skip'|'update'|'error';mapping:Record<string,number>;rows:{number:number;cells:string[]}[];skipInvalid?:boolean}
export type ImportRow={row:number;slug:string;action:'create'|'update'|'skip'|'error';errors:string[];id?:string|number;revision?:string;data?:any}

function convert(field:any,text:string):any{
 if(!text.trim())return field.type==='number'||field.type==='boolean'?null:''
 if(field.type==='number'){if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()))fail(`${field.label}: số không hợp lệ.`);return Number(text)}
 if(field.type==='boolean'){const v=text.trim().toLowerCase();if(['true','1','yes','có','đúng'].includes(v))return true;if(['false','0','no','không','sai'].includes(v))return false;fail(`${field.label}: dùng true/false hoặc 1/0.`)}
 return text.trim()
}
const article=(text:string)=>({root:{type:'root',version:1,direction:null,format:'',indent:0,children:text.split(/\r?\n/).map(text=>({type:'paragraph',version:1,direction:null,format:'',indent:0,children:[{type:'text',version:1,text,format:0,style:'',mode:'normal',detail:0}]}))}})
export async function planImport(req:PayloadRequest,input:ImportInput){
 const { locales: activeLocales } = await getPayloadSiteLocales(req.payload, true)
 if(!input||!['pages','posts','content-entries'].includes(input.collection)||!['skip','update','error'].includes(input.mode)||!activeLocales.some(l=>l.code===input.locale)||!Array.isArray(input.rows)||!input.rows.length||input.rows.length>LIMIT||typeof input.mapping!=='object'||!input.mapping)fail('Cấu hình nhập không hợp lệ.')
 const type=input.collection==='content-entries'?await contentType(req,input.type||''):undefined,fields=importFields(input.collection,type?.fields)
 if(JSON.stringify(input).length>8*1024*1024)fail('Dữ liệu nhập tối đa 8 MB.')
 if(Object.keys(input.mapping).some(key=>!fields.some(f=>f.key===key))||Object.values(input.mapping).some(v=>!Number.isInteger(v)||v<0||v>49)||new Set(Object.values(input.mapping)).size!==Object.values(input.mapping).length)fail('Ghép cột không hợp lệ hoặc một cột được dùng nhiều lần.')
 if(input.mapping.title==null)fail('Ghép cột Tiêu đề trước khi xem trước.')
 const rows:ImportRow[]=[],seen=new Set<string>()
 for(const row of input.rows){
  const result:ImportRow={row:row.number,slug:'',action:'error',errors:[]};rows.push(result)
  try{
   if(!Number.isInteger(row.number)||!Array.isArray(row.cells)||row.cells.length>50||row.cells.some(c=>typeof c!=='string'||c.length>50000))fail('Dữ liệu dòng không hợp lệ.')
   const patch:any={},entry:any={}
   for(const [key,index] of Object.entries(input.mapping)){
    const field=fields.find(f=>f.key===key)!,value=convert(field,row.cells[index]??'')
    if(key.startsWith('data.'))entry[key.slice(5)]=value;else patch[key]=value
   }
   const slug=patch.slug||contentSlug(patch.title||'');result.slug=slug
   if(!slug||!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(slug))fail('Mã nội dung không hợp lệ. Dùng chữ thường, số và dấu gạch ngang.')
   if(seen.has(slug))fail('Trùng mã với dòng trước trong tệp.');seen.add(slug)
   const existing:any=(await req.payload.find({collection:input.collection,where:{slug:{equals:slug}},draft:true,trash:true,locale:input.locale as any,depth:0,limit:1,req,overrideAccess:true})).docs[0]
   if(existing&&!(await canContent(req,input.collection,'read',existing)))fail('Mã đã tồn tại hoặc không được phép cập nhật.')
   if(existing?.deletedAt)fail('Mã đang nằm trong thùng rác. Khôi phục trước khi nhập.')
   if(existing&&input.mode==='error')fail('Mã nội dung đã tồn tại.')
   if(existing&&input.mode==='skip'){result.action='skip';continue}
   if(existing&&type&&existing.kind!==type.slug)fail('Mã đã thuộc loại nội dung khác.')
   if(patch.categories!==undefined){
    const slugs=patch.categories.split(/[|,]/).map((s:string)=>s.trim()).filter(Boolean),terms=await req.payload.find({collection:'post-categories',where:{slug:{in:slugs}},limit:100,depth:0,req,overrideAccess:false})
    if(slugs.some((s:string)=>!terms.docs.some(d=>d.slug===s)))fail('Có mã chuyên mục không tồn tại.')
    patch.categories=terms.docs.map(d=>d.id)
   }
   const merged={...existing,...patch,slug,...(type?{kind:type.slug,data:{...existing?.data,...entry},published:false}:{}),...(input.collection==='posts'&&!existing?{createdBy:req.user!.id}:{} )}
   if(!(await canContent(req,input.collection,'edit',merged))||type&&existing?.published&&!(await canContent(req,input.collection,'publish',existing)))fail('Không có quyền nhập hoặc cập nhật dòng này.',403)
   if(!merged.title?.trim())fail('Tiêu đề không được để trống.')
   if(merged.title.length>300)fail('Tiêu đề tối đa 300 ký tự.')
   if(type)await validateEntry(req,type,merged.data,false,slug)
   if(patch.publishedAt && !Number.isFinite(Date.parse(patch.publishedAt)))fail('Ngày đăng không hợp lệ.')
   if(patch.articleText!==undefined){patch.articleBody=article(patch.articleText);patch.writingMode='article';delete patch.articleText}
   result.action=existing?'update':'create';result.id=existing?.id;result.revision=existing?.updatedAt
   result.data={...patch,slug,...(type?{kind:type.slug,data:merged.data,published:false}:{_status:'draft'}),...(input.collection==='posts'&&!existing?{writingMode:patch.writingMode||'article'}:{})}
  }catch(error:any){result.errors.push(error.message||'Dòng không hợp lệ.');result.action='error'}
 }
 return {rows,schema:type||fields,counts:{create:rows.filter(r=>r.action==='create').length,update:rows.filter(r=>r.action==='update').length,skip:rows.filter(r=>r.action==='skip').length,error:rows.filter(r=>r.action==='error').length}}
}
const sign=(req:PayloadRequest,input:ImportInput,plan:any,expires:number)=>createHmac('sha256',req.payload.config.secret).update(JSON.stringify({input,plan,user:req.user!.id,expires})).digest('hex')
const response=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}})
export const cmsImportFile:Endpoint={path:'/site/cms/import/file',method:'post',handler:async req=>{
 if(!hasRole(req.user,'admin','publisher','editor','author'))return response({error:'Forbidden'},403)
 try{const form=await req.formData?.(),file=form?.get('file');if(!file||typeof file==='string'||file.size>MAX_BYTES)fail('Chọn tệp .xlsx hoặc CSV, tối đa 5 MB.');return response({sheets:await parseImportFile(file.name,new Uint8Array(await file.arrayBuffer()))})}catch(e:any){return response({error:e.message},e.status||400)}
}}
export const cmsImport:Endpoint={path:'/site/cms/import',method:'post',handler:async req=>{
 if(!hasRole(req.user,'admin','publisher','editor','author'))return response({error:'Forbidden'},403)
 try{
  const body=await req.json?.(),input=body?.input as ImportInput
  if(body?.action==='preview'){
   const plan=await planImport(req,input),expires=Date.now()+10*60*1000
   return response({...plan,token:expires+'.'+sign(req,input,plan,expires)})
  }
  if(body?.action!=='commit'||typeof body.token!=='string')fail('Cần xem trước trước khi nhập.')
  return await inTransaction(req,async()=>{
   await lockSitePublication(req)
   const plan=await planImport(req,input),[time,hash]=body.token.split('.'),expires=Number(time),expected=sign(req,input,plan,expires)
   if(!Number.isFinite(expires)||expires<Date.now()||expires>Date.now()+10*60*1000||typeof hash!=='string'||hash.length!==expected.length||!timingSafeEqual(Buffer.from(hash),Buffer.from(expected)))fail('Dữ liệu, quyền hoặc cấu trúc đã đổi. Xem trước lại trước khi nhập.',409)
   if(plan.counts.error&&!input.skipInvalid)fail('Sửa các dòng lỗi hoặc chọn bỏ qua dòng lỗi trước khi nhập.')
   const ids=[]
   for(const row of plan.rows){if(row.action==='create')ids.push((await req.payload.create({collection:input.collection,data:row.data,draft:input.collection!=='content-entries',locale:input.locale as any,req,overrideAccess:false})).id);else if(row.action==='update')ids.push((await req.payload.update({collection:input.collection,id:row.id!,data:row.data,draft:input.collection!=='content-entries',locale:input.locale as any,req,overrideAccess:false})).id)}
   return response({ok:true,counts:plan.counts,ids})
  })
 }catch(e:any){return response({error:e.message||'Không nhập được dữ liệu.'},e.status||400)}
}}
