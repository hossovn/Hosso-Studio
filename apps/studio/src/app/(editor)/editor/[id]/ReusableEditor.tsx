'use client'
import React, { useEffect, useState } from 'react'
import { ColorControl, MediaField } from '@hosso/studio-blocks'
import { expandReusableInstance, reusableTargets } from '../../../../../../../packages/blocks/src/reusable-overrides'
import type { Block } from './canvas-model'

type Source = { blocks: Block[]; id: string; title: string; status: string }
const cache = new Map<string, Promise<Source>>()
function useReusable(slug: string, locale: string) {
  const [source, setSource] = useState<Source | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const key = `${locale}:${slug}`
  useEffect(() => {
    let alive = true
    const load = () => {
      if (!slug) { setSource(null); return }
      setBusy(true); setError('')
      if (!cache.has(key)) cache.set(key, fetch(`/api/reusable-blocks?draft=true&depth=0&limit=1&locale=${encodeURIComponent(locale)}&where[slug][equals]=${encodeURIComponent(slug)}`).then(async (res) => { const json = await res.json(); if (!res.ok) throw new Error('Không tải được mẫu liên kết.'); const doc = json.docs?.[0]; if (!doc) throw new Error('Không tìm thấy mẫu liên kết.'); return { blocks: doc.content?.content ?? [], id: String(doc.id), title: doc.title, status: doc._status } }))
      cache.get(key)!.then((value) => { if (alive) setSource(value) }).catch((cause) => { cache.delete(key); if (alive) { setSource(null); setError(String(cause.message)) } }).finally(() => { if (alive) setBusy(false) })
    }
    const refresh = () => { cache.delete(key); load() }
    setSource(null); load(); window.addEventListener('hosso-refresh-reusable', refresh); window.addEventListener('focus', refresh)
    return () => { alive = false; window.removeEventListener('hosso-refresh-reusable', refresh); window.removeEventListener('focus', refresh) }
  }, [key, slug, locale])
  return { source, error, busy, refresh: () => window.dispatchEvent(new Event('hosso-refresh-reusable')) }
}
export function ReusablePreview({ block, config, locale = 'vi', editing = true }: { block: Block; config: any; locale?: string; editing?: boolean }) {
  const { source, error, busy } = useReusable(String(block.props.slug || ''), locale)
  if (!source) return <div className="hs-missing" role={error ? 'alert' : 'status'}>{error || (busy ? 'Đang tải mẫu liên kết…' : 'Chọn mẫu dùng lại trong bảng thuộc tính.')}</div>
  return <div data-reusable-preview={block.props.id}>{expandReusableInstance(source.blocks, block).map((item) => { const Render = config.components[item.type]?.render; return Render ? <Render key={item.props.id} {...item.props} _motionEditing={editing} /> : null })}</div>
}
export function ReusableOverridesPanel({ block, locale = 'vi', onChange }: { block: Block; locale?: string; onChange: (patch: Record<string, any>) => void }) {
  const { source, error, busy, refresh } = useReusable(String(block.props.slug || ''), locale)
  const overrides = block.props.overrides ?? {}
  const put = (target: string, key: string, value?: string) => { const patch = { ...overrides[target] }; if (value === undefined) delete patch[key]; else { patch[key] = value; if (key === 'text') patch.richText = '' }; const next = { ...overrides, [target]: patch }; if (!Object.keys(patch).length) delete next[target]; onChange({ overrides: next }) }
  return <div className="cv-workbench-panel cv-reusable-overrides">
    <p className="cv-tool-help">Chữ, ảnh và màu dưới đây chỉ áp dụng cho bản chèn này. Vị trí và kích thước tiếp tục đồng bộ từ mẫu gốc. Xuất bản mẫu gốc để cập nhật trang công khai.</p>
    <button type="button" className="cv-tool-button" disabled={busy} onClick={refresh}>Cập nhật từ mẫu gốc</button>
    {busy && <p role="status">Đang tải mẫu…</p>}{error && <p role="alert" className="cv-tool-error">{error}</p>}
    {source && <><a className="cv-tool-button" href={`/editor/${source.id}?c=reusable-blocks&locale=${encodeURIComponent(locale)}`} target="_blank" rel="noreferrer">Sửa mẫu gốc · {source.title}</a><p className="cv-tool-help">Đang xem {source.status === 'published' ? 'mẫu đã xuất bản' : 'bản nháp của mẫu'}.</p>{reusableTargets(source.blocks).map((target) => {
      const own = overrides[target.key] ?? {}, props = { ...target.props, ...own }
      const fields = ['text', 'src', 'alt', 'bgImage', 'color', 'bg', 'borderColor', '_bgHex', '_bg2Hex', '_bdHex'].filter((key) => key in target.props || (key === 'color' && ['heading', 'text', 'button'].includes(target.type)) || (key === '_bgHex' && target.type === 'FreeCanvas'))
      return fields.length ? <details className="cv-grp" key={target.key} open><summary>{String(target.props._name || target.props.text || target.type).replace(/<[^>]+>/g, '').slice(0, 60)}</summary><div className="cv-grp-content">{fields.map((key) => <div className="cv-field" key={key}><label>{({ text: 'Nội dung chữ', src: 'Ảnh', alt: 'Mô tả ảnh', bgImage: 'Ảnh nền', color: 'Màu chữ', bg: 'Màu nền', borderColor: 'Màu viền', _bgHex: 'Màu nền phần', _bg2Hex: 'Màu chuyển sắc', _bdHex: 'Màu viền phần' } as Record<string, string>)[key]}</label>{['src', 'bgImage'].includes(key) ? <MediaField kind="image" value={props[key] || ''} onChange={(value) => put(target.key, key, value)} /> : key === 'text' || key === 'alt' ? <textarea aria-label={`${target.key} ${key}`} value={props[key] || ''} onChange={(e) => put(target.key, key, e.target.value)} /> : <ColorControl value={props[key] || ''} onChange={(value) => put(target.key, key, value)} />}{Object.hasOwn(own, key) && <button type="button" className="cv-tool-button" onClick={() => { if (key === 'text') { const patch = { ...own }; delete patch.text; delete patch.richText; onChange({ overrides: { ...overrides, [target.key]: patch } }) } else put(target.key, key) }}>Dùng {key === 'text' ? 'chữ' : 'giá trị'} gốc</button>}</div>)}</div></details> : null
    })}<button type="button" className="cv-tool-button" disabled={!Object.keys(overrides).length} onClick={() => onChange({ overrides: {} })}>Khôi phục toàn bộ nội dung gốc</button></>}
  </div>
}
