'use client'
import React,{useEffect,useState} from 'react'
import {useField,useDocumentInfo} from '@payloadcms/ui'
import {BUILTIN_CONTENT_TYPES,type ContentType} from '@/lib/content-schema'
import {useAdminT} from '@/lib/use-admin-t'
export function ContentKindField({path}:{path:string}){
 const T=useAdminT(),{value,setValue}=useField<string>({path}),{id}=useDocumentInfo(),[types,setTypes]=useState<ContentType[]>(BUILTIN_CONTENT_TYPES),[error,setError]=useState('')
 useEffect(()=>{const c=new AbortController();fetch('/api/site/cms/types',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();setTypes((await r.json()).types)}).catch(e=>{if(e.name!=='AbortError')setError(T('Không tải được nội dung.'))});return()=>c.abort()},[])
 return <div className="cms-entry-fields"><label>{T('Loại nội dung')}<select aria-label={T('Loại nội dung')} disabled={!!id} value={value||'faq'} onChange={e=>setValue(e.target.value)}>{types.map(t=><option key={t.slug} value={t.slug}>{T(t.title)}</option>)}</select></label>{error&&<p role="alert">{error}</p>}</div>
}
