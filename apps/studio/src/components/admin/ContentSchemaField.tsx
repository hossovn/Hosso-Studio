'use client'
import React,{useEffect,useState} from 'react'
import {useField} from '@payloadcms/ui'
import {CONTENT_FIELD_TYPES,schemaErrors,type ContentField,type ContentType} from '@/lib/content-schema'
import {useAdminT} from '@/lib/use-admin-t'
const labels:Record<string,string>={text:'Văn bản ngắn',textarea:'Văn bản dài',number:'Số',boolean:'Đúng / sai',date:'Ngày',select:'Lựa chọn',image:'Ảnh',relationship:'Liên kết nội dung'}
export function ContentSchemaField({path}:{path:string}){
 const T=useAdminT(),{value,setValue}=useField<ContentField[]>({path}),[types,setTypes]=useState<ContentType[]>([]),[error,setError]=useState(''),rows=Array.isArray(value)?value:[]
 useEffect(()=>{const c=new AbortController();fetch('/api/site/cms/types',{signal:c.signal}).then(async r=>{if(!r.ok)throw Error();setTypes((await r.json()).types)}).catch(e=>{if(e.name!=='AbortError')setError(T('Không tải được nội dung.'))});return()=>c.abort()},[])
 const patch=(i:number,p:Partial<ContentField>)=>setValue(rows.map((r,n)=>n===i?{...r,...p}:r))
 const move=(i:number,d:number)=>{const next=[...rows];[next[i],next[i+d]]=[next[i+d],next[i]];setValue(next)}
 return <section className="cms-schema cms-entry-fields" aria-label={T('Các trường nội dung')}><h3>{T('Các trường nội dung')}</h3><p>{T('Tiêu đề và mã nội dung có sẵn. Thêm các trường riêng bên dưới.')}</p>
 {rows.map((f,i)=><fieldset key={i}><legend>{i+1}. {f.label||T('Trường mới')}</legend><div className="cms-form-grid">
 <label>{T('Tên trường')}<input value={f.label} onChange={e=>patch(i,{label:e.target.value})}/></label><label>{T('Mã trường')}<input value={f.key} placeholder="start_date" onChange={e=>patch(i,{key:e.target.value})}/></label>
 <label>{T('Kiểu dữ liệu')}<select aria-label={T('Kiểu dữ liệu')} value={f.type} onChange={e=>patch(i,{type:e.target.value as ContentField['type'],options:undefined,target:undefined})}>{CONTENT_FIELD_TYPES.map(t=><option key={t} value={t}>{T(labels[t])}</option>)}</select></label>
 <label className="cms-check"><input type="checkbox" checked={!!f.required} onChange={e=>patch(i,{required:e.target.checked})}/>{T('Bắt buộc')}</label></div>
 {f.type==='select'&&<label>{T('Mỗi dòng một lựa chọn')}<textarea value={f.options?.join('\n')||''} onChange={e=>patch(i,{options:e.target.value.split('\n')})}/></label>}
 {f.type==='relationship'&&<label>{T('Loại nội dung liên kết')}<select aria-label={T('Loại nội dung liên kết')} value={f.target||''} onChange={e=>patch(i,{target:e.target.value})}><option value="">{T('Chọn loại nội dung')}</option>{types.map(t=><option key={t.slug} value={t.slug}>{T(t.title)}</option>)}</select><small>{T('Lưu loại nội dung trước để tạo liên kết tới chính loại này.')}</small></label>}
 <div className="cms-inline"><button type="button" disabled={i===0} aria-label={T('Đưa trường lên')} onClick={()=>move(i,-1)}>↑</button><button type="button" disabled={i===rows.length-1} aria-label={T('Đưa trường xuống')} onClick={()=>move(i,1)}>↓</button><button type="button" onClick={()=>setValue(rows.filter((_,n)=>n!==i))}>{T('Xóa trường')}</button></div></fieldset>)}
 <button type="button" className="ha-button" disabled={rows.length>=40} onClick={()=>setValue([...rows,{key:'field_'+(rows.length+1),label:'',type:'text',required:false}])}>{T('Thêm trường')}</button>
 {(error||schemaErrors(rows).length>0)&&<p role="status">{error||schemaErrors(rows).join(' ')}</p>}<small>{T('Không thể đổi cấu trúc nếu làm dữ liệu đã lưu không còn hợp lệ.')}</small></section>
}
