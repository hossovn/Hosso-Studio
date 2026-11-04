'use client'
import { useAdminT } from '@/lib/use-admin-t'
import React from 'react'
import { useFormFields, useDocumentInfo, useLocale } from '@payloadcms/ui'
import hosso from '@hosso-config'
import { articleOutline } from '@/lib/cms-model'
export function ArticleOutline() {
 const T=useAdminT()
 const body = useFormFields(([fields]) => fields.articleBody?.value), slug = useFormFields(([fields]) => fields.slug?.value)
 const { id } = useDocumentInfo(), locale = useLocale(), outline = articleOutline(body)
 return <aside className="cms-outline"><strong>{T('Dàn ý bài viết')}</strong>{outline.length ? <ol>{outline.map((item) => <li key={item.index} style={{ marginLeft: item.tag === 'h3' ? 12 : 0 }}><button type="button" onClick={()=>{const heading=document.querySelector('.rich-text-lexical [contenteditable]')?.children[item.index] as HTMLElement|undefined;heading?.scrollIntoView({block:'center'});heading?.focus()}}>{item.title}</button></li>)}</ol> : <p>{T('Thêm tiêu đề H2/H3 để tạo dàn ý.')}</p>}{id && slug ? <a className="ha-button" target="_blank" rel="noreferrer" href={`${locale.code === hosso.locales[0].code ? '' : '/' + locale.code}/bai-viet/${encodeURIComponent(String(slug))}?preview=1`}>{T('Xem trước bản đã lưu ↗')}</a> : <p>{T('Lưu nháp trước để xem trước.')}</p>}</aside>
}
