'use client'
import React,{useEffect,useState,useRef} from 'react'
import {useField,useFormFields,useLocale,useDocumentInfo} from '@payloadcms/ui'
import {useAdminT} from '@/lib/use-admin-t'
import {BUILTIN_CONTENT_TYPES,type ContentType} from '@/lib/content-schema'
export function StructuredEntryField({path}:{path:string}){
 const T=useAdminT(),{value,setValue}=useField<Record<string,any>>({path}),kind=useFormFields(([fields])=>fields.kind?.value) as string,locale=useLocale()
 const [types,setTypes]=useState<ContentType[]>(BUILTIN_CONTENT_TYPES),[picking,setPicking]=useState(''),[query,setQuery]=useState(''),[items,setItems]=useState<any[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const type=types.find(t=>t.slug===kind),field=type?.fields.find(f=>f.key===picking)
 const put=(key:string,next:any)=>setValue({...value,[key]:next})
 const previousKind=useRef(kind),{id}=useDocumentInfo()
 useEffect(()=>{if(!id&&previousKind.current&&previousKind.current!==kind)setValue({});previousKind.current=kind},[kind,id])
 useEffect(()=>{const c=new AbortController();fetch('/api/site/cms/types',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();setTypes((await r.json()).types)}).catch(e=>{if(e.name!=='AbortError')setError(T('Không tải được nội dung.'))});return()=>c.abort()},[])
 useEffect(()=>{
  if(!field)return
  const c=new AbortController(),timer=setTimeout(async()=>{
   setLoading(true);setError('')
   try{const url='/api/site/cms?kind='+(field.type==='image'?'media&type=image':'content-entries&type='+encodeURIComponent(field.target||''))+'&locale='+encodeURIComponent(locale.code)+'&q='+encodeURIComponent(query)
    const r=await fetch(url,{signal:c.signal}),body=await r.json();if(!r.ok)throw Error(body.error);if(!c.signal.aborted)setItems(body.docs)
   }catch(e:any){if(e.name!=='AbortError')setError(T('Không tải được nội dung.'))}finally{if(!c.signal.aborted)setLoading(false)}
  },200)
  return()=>{c.abort();clearTimeout(timer)}
 },[picking,query,field?.target,field?.type,locale.code])
 return <div className="cms-entry-fields">
 {!type&&<p role="status">{T('Chọn loại nội dung để nhập dữ liệu.')}</p>}
 {type?.fields.map(f=><div key={kind+':'+f.key}><label>{T(f.label)}{f.required?' *':''}
 {f.type==='textarea'?<textarea rows={6} value={value?.[f.key]??''} onChange={e=>put(f.key,e.target.value)}/>:
 f.type==='select'?<select value={value?.[f.key]??''} onChange={e=>put(f.key,e.target.value)}><option value="">{T('Chọn giá trị')}</option>{f.options?.map(o=><option key={o} value={o}>{o}</option>)}</select>:
 f.type==='boolean'?<select value={value?.[f.key]===true?'true':value?.[f.key]===false?'false':''} onChange={e=>put(f.key,e.target.value===''?null:e.target.value==='true')}><option value="">{T('Chưa chọn')}</option><option value="true">{T('Đúng')}</option><option value="false">{T('Sai')}</option></select>:
 <input type={f.type==='number'?'number':f.type==='date'?'date':'text'} step={f.type==='number'?'any':undefined} value={value?.[f.key]??''} onChange={e=>put(f.key,f.type==='number'?(e.target.value===''?null:Number(e.target.value)):e.target.value)}/>}
 </label>
 {['image','relationship'].includes(f.type)&&<button type="button" className="ha-button" aria-expanded={picking===f.key} onClick={()=>{setPicking(picking===f.key?'':f.key);setQuery('')}}>{T(f.type==='image'?'Chọn ảnh từ thư viện':'Chọn nội dung liên kết')}</button>}
 {f.type==='image'&&value?.[f.key]&&<img className="cms-entry-preview" src={value[f.key]} alt=""/>}</div>)}
 {field&&<section className="cms-media-picker" aria-label={T(field.type==='image'?'Chọn ảnh từ thư viện':'Chọn nội dung liên kết')}><label>{T('Tìm nội dung')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><button type="button" onClick={()=>setPicking('')}>{T('Đóng')}</button><p role="status">{loading?T('Đang tải…'):!items.length?T('Không có kết quả phù hợp.'):''}</p><div>{items.map(item=><button type="button" key={item.id} onClick={()=>{put(field.key,field.type==='image'?(item.url||'/api/media/file/'+encodeURIComponent(item.filename)):item.slug);setPicking('')}}>{field.type==='image'&&<img src={item.url} alt="" loading="lazy"/>}<span>{item.title||item.alt||item.filename}</span></button>)}</div></section>}
 {error&&<p role="alert">{error}</p>}
 </div>
}
