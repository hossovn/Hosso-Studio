'use client'
import { useAdminT } from '@/lib/use-admin-t'
import React, { useEffect, useState } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
export function StructuredEntryField({ path }: { path: string }) {
 const T = useAdminT()
 const { value, setValue } = useField<Record<string,string>>({ path })
 const kind = useFormFields(([fields]) => fields.kind?.value)
 const [picking,setPicking] = useState(false), [query,setQuery] = useState(''), [media,setMedia] = useState<any[]>([]), [loading,setLoading] = useState(false), [error,setError] = useState('')
 const put = (key: string, text: string) => setValue({ ...value, [key]: text })
 useEffect(() => {
  if (!picking) return
  const controller = new AbortController()
  const timer = setTimeout(async () => {
   setLoading(true); setError('')
   try {
    const res = await fetch('/api/site/cms?kind=media&type=image&q='+encodeURIComponent(query), {signal:controller.signal})
    const body = await res.json()
    if (!res.ok) throw new Error(body.error)
    if (!controller.signal.aborted) setMedia(body.docs)
   } catch (e:any) { if(e.name !== 'AbortError') setError(T('Không tải được nội dung.')) }
   finally { if(!controller.signal.aborted) setLoading(false) }
  },200)
  return () => {controller.abort();clearTimeout(timer)}
 },[picking,query])
 return <div className="cms-entry-fields">
  {[[ 'description', kind === 'faq' ? T('Câu trả lời') : T('Mô tả') ], ['image',T('Đường dẫn ảnh')], ['url',T('Liên kết')], ...(kind === 'team' ? [['role',T('Vai trò / chức danh')]] : [])].map(([key,label]) => <label key={key}>{label}{key === 'description' ? <textarea value={value?.[key] || ''} onChange={(e) => put(key,e.target.value)} rows={7} /> : <input value={value?.[key] || ''} onChange={(e) => put(key,e.target.value)} />}</label>)}
  <button type="button" className="ha-button" aria-expanded={picking} onClick={()=>setPicking(!picking)}>{T('Chọn ảnh từ thư viện')}</button>
  {picking && <section className="cms-media-picker" aria-label={T('Chọn ảnh từ thư viện')}>
   <label>{T('Tìm nội dung')}<input type="search" value={query} onChange={(e)=>setQuery(e.target.value)}/></label>
   {error && <p role="alert">{error}</p>}
   <p role="status">{loading ? T('Đang tải…') : !media.length ? T('Không có kết quả phù hợp.') : ''}</p>
   <div>{media.map((item)=><button key={item.id} type="button" onClick={()=>{put('image',item.url || '/api/media/file/'+encodeURIComponent(item.filename));setPicking(false)}}><img src={item.url} alt="" loading="lazy"/><span>{item.alt || item.filename}</span></button>)}</div>
  </section>}
  {value?.image && <img className="cms-entry-preview" src={value.image} alt=""/>}
 </div>
}
