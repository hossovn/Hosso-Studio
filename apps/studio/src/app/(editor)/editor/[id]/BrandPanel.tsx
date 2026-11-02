'use client'
import { FONTS, type ThemeTokens } from '@hosso/studio-blocks'
import React, { useEffect, useRef, useState } from 'react'
import { Check, RefreshCw, Save } from 'lucide-react'

export type BrandTheme = { name: string; title: string; tokens: ThemeTokens }
type Values = Record<string, string>
const labels: Record<string, string> = { primary: 'Màu chính', onPrimary: 'Chữ trên màu chính', secondary: 'Màu phụ', accent: 'Màu nhấn', background: 'Nền trang', bg: 'Nền trang', surface: 'Nền nội dung', text: 'Văn bản', muted: 'Văn bản phụ', border: 'Đường viền', danger: 'Cảnh báo' }
const kebab = (value: string) => value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
const defaults = (theme?: BrandTheme): Values => theme ? {
  ...Object.fromEntries(Object.entries(theme.tokens.colors).map(([key, value]) => [`color_${key}`, value])),
  fontBody: theme.tokens.fonts.body, fontHeading: theme.tokens.fonts.heading,
} : {}

export function useBrandDraft(theme: BrandTheme | undefined, enabled: boolean, locale: string, demo = false) {
  const [values, setValues] = useState<Values>(() => defaults(theme))
  const [saved, setSaved] = useState<Values>(() => defaults(theme))
  const [loading, setLoading] = useState(enabled && !demo)
  const [loaded, setLoaded] = useState(demo)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [savedMessage, setSavedMessage] = useState('')
  const saving = useRef(false)
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)
  useEffect(() => {
    if (!theme || !enabled || demo) return
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch(`/api/globals/site-settings?draft=true&depth=0&locale=${encodeURIComponent(locale)}`, { credentials: 'same-origin', signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error('settings')
      const result = await response.json()
      if (controller.signal.aborted) return
      if (result.theme !== theme.name) throw new Error('changed-theme')
      const overrides = result[`tokens_${theme.name}`] ?? {}
      const next = Object.fromEntries(Object.entries(defaults(theme)).map(([key, value]) => [key, typeof overrides[key] === 'string' && overrides[key] ? overrides[key] : value]))
      setValues(next)
      setSaved(next)
      setLoaded(true)
    }).catch(() => { if (!controller.signal.aborted) setError('Không tải được thương hiệu. Thử lại hoặc tải lại trang nếu theme vừa được đổi.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [theme, enabled, locale, demo, retry])
  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])
  const set = (key: string, value: string) => { setSavedMessage(''); setValues((previous) => ({ ...previous, [key]: value })) }
  const valid = Object.entries(values).every(([key, value]) => key.startsWith('color_') ? /^#[a-f\d]{6}$/i.test(value) : Object.hasOwn(FONTS, value))
  const css = !theme || !enabled || !loaded ? '' : ':root{' + Object.entries(values).flatMap(([key, value]) => {
    if (key.startsWith('color_') && /^#[a-f\d]{6}$/i.test(value)) return [`--hs-${kebab(key.slice(6))}:${value}`]
    if ((key === 'fontBody' || key === 'fontHeading') && Object.hasOwn(FONTS, value)) return [`--hs-font-${key === 'fontBody' ? 'body' : 'heading'}:var(--font-${value}),system-ui,sans-serif`]
    return []
  }).join(';') + '}'
  const save = async () => {
    if (!theme || !enabled || !dirty || !valid || saving.current || loading || !loaded || demo) return
    saving.current = true
    setBusy(true)
    setError('')
    const snapshot = { ...values }
    try {
      const response = await fetch(`/api/globals/site-settings?draft=true&locale=${encodeURIComponent(locale)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [`tokens_${theme.name}`]: snapshot, _status: 'draft' }) })
      if (!response.ok) throw new Error('save')
      setSaved(snapshot)
      setSavedMessage('Đã lưu bản nháp thương hiệu.')
    } catch { setError('Chưa lưu được thương hiệu. Các thay đổi vẫn được giữ để bạn thử lại.') }
    finally { saving.current = false; setBusy(false) }
  }
  return { values, set, saved, dirty, valid, loading, loaded, busy, error, savedMessage, css, save, reset: () => { setValues(saved); setSavedMessage('') }, retry: () => setRetry((count) => count + 1), demo }
}

export function BrandPanel({ theme, enabled, draft }: { theme?: BrandTheme; enabled: boolean; draft: ReturnType<typeof useBrandDraft> }) {
  if (!theme || !enabled) return <div className="cv-empty"><p>Quản trị viên có thể chỉnh màu sắc và kiểu chữ dùng chung cho website tại đây.</p></div>
  if (draft.loading) return <p role="status" className="cv-panel-note">Đang tải thương hiệu…</p>
  if (!draft.loaded) return <div role="alert" className="cv-form-error">{draft.error}<button className="cv-text-action" type="button" onClick={draft.retry}><RefreshCw size={14} />Thử lại</button></div>
  return <div className="cv-brand-panel">
    <div className="cv-brand-intro"><h3>Phong cách của bạn</h3><p>Màu sắc và kiểu chữ dùng chung cho theme {theme.title}.</p></div>
    <div className="cv-brand-sample" style={{ background: draft.values.color_bg || draft.values.color_background || '#f6f7fb', color: draft.values.color_text || '#20242b', fontFamily: `var(--font-${Object.hasOwn(FONTS, draft.values.fontBody) ? draft.values.fontBody : theme.tokens.fonts.body}),system-ui,sans-serif` }}><span>HOSSO STUDIO</span><strong style={{ fontFamily: `var(--font-${Object.hasOwn(FONTS, draft.values.fontHeading) ? draft.values.fontHeading : theme.tokens.fonts.heading}),system-ui,sans-serif` }}>Điều làm nên<br />thương hiệu của bạn.</strong><p>Một phong cách nhất quán trên website.</p><span className="cv-brand-sample-button" style={{ background: draft.values.color_primary || '#16704a', color: draft.values.color_onPrimary || '#fff' }}>Khám phá</span></div>
    <h4>Bảng màu</h4>
    <div className="cv-brand-colors">{Object.keys(theme.tokens.colors).map((key) => <label key={key} className="cv-brand-color"><input type="color" aria-label={labels[key] ?? key} value={/^#[a-f\d]{6}$/i.test(draft.values[`color_${key}`]) ? draft.values[`color_${key}`] : '#000000'} onChange={(event) => draft.set(`color_${key}`, event.target.value)} /><span><strong>{labels[key] ?? key}</strong><input type="text" aria-label={`Mã màu ${labels[key] ?? key}`} value={draft.values[`color_${key}`] ?? ''} maxLength={7} onChange={(event) => draft.set(`color_${key}`, event.target.value)} /></span></label>)}</div>
    <h4>Kiểu chữ</h4>
    {([['fontHeading', 'Font tiêu đề'], ['fontBody', 'Font nội dung']] as const).map(([key, label]) => <label key={key} className="cv-brand-field"><span>{label}</span><select aria-label={label} value={draft.values[key] ?? ''} onChange={(event) => draft.set(key, event.target.value)}>{Object.entries(FONTS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>)}
    <p className="cv-panel-note">Áp dụng cho các thành phần dùng màu và font của theme. Thành phần có thiết kế riêng giữ thiết lập riêng.</p>
    <p className="cv-panel-note">Lưu ở dạng nháp. Dùng bước xuất bản website để đưa thương hiệu mới lên trang công khai.</p>
    {draft.demo && <p role="status" className="cv-panel-note">Bản demo: bạn có thể thử màu và font; thay đổi không được lưu lên website.</p>}
    {!draft.valid && <p role="alert" className="cv-form-error">Nhập màu đủ 6 ký tự theo dạng #rrggbb.</p>}
    {draft.error && <div role="alert" className="cv-form-error">{draft.error}<button className="cv-text-action" type="button" onClick={draft.retry} disabled={draft.dirty || draft.busy}><RefreshCw size={14} />Tải lại thiết lập</button></div>}
    {draft.savedMessage && <p role="status" className="cv-form-success"><Check size={15} />{draft.savedMessage}</p>}
    <div className="cv-brand-actions"><button type="button" disabled={!draft.dirty || draft.busy} onClick={draft.reset}>Hủy thay đổi</button><button type="button" disabled={!draft.dirty || !draft.valid || draft.busy || draft.demo} onClick={draft.save}><Save size={15} />{draft.busy ? 'Đang lưu…' : 'Lưu thương hiệu'}</button></div>
  </div>
}
