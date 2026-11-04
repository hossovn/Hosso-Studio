'use client'
import React, { useEffect, useState } from 'react'
import { elementFamily } from '@hosso/studio-blocks'
import { elsOf, floatOf, type PageData, type Sel } from './canvas-model'
export function FrameIsolation({ docs, data, preview, setSel }: { docs: Document[]; data: PageData; preview: boolean; setSel: (sel: Sel) => void }) {
  const [id, setId] = useState('')
  const owners = [{ id: '@page', els: floatOf(data) }, ...data.content.map((block) => ({ id: block.props.id, els: elsOf(block) }))]
  const owner = owners.find((item) => item.els.some((el) => el.id === id)), frame = owner?.els.find((el) => el.id === id)
  useEffect(() => {
    const pick = (e: Event) => setId(String((e as CustomEvent).detail || ''))
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setId('') }
    docs.forEach((doc) => { doc.addEventListener('hosso-isolate', pick); doc.addEventListener('keydown', escape) }); document.addEventListener('keydown', escape)
    return () => { docs.forEach((doc) => { doc.removeEventListener('hosso-isolate', pick); doc.removeEventListener('keydown', escape) }); document.removeEventListener('keydown', escape) }
  }, [docs])
  useEffect(() => { if (preview || !frame) setId('') }, [preview, Boolean(frame)])
  const familyKey = owner && frame ? elementFamily(owner.els, id).map((el) => el.id).join('|') : ''
  useEffect(() => {
    if (!id || !familyKey) return
    const allowed = new Set(familyKey.split('|')), cleanups: (() => void)[] = []
    docs.forEach((doc) => {
      const styles = doc.createElement('style'); styles.textContent = '[data-isolation-dim]{opacity:.15!important;pointer-events:none!important}[data-isolation-active]{outline:2px solid #2d7b57!important}'
      doc.head.appendChild(styles)
      doc.querySelectorAll<HTMLElement>('[data-element]').forEach((node) => { const key = allowed.has(node.dataset.element || '') ? 'isolationActive' : 'isolationDim'; node.dataset[key] = 'true'; cleanups.push(() => { delete node.dataset[key] }) })
      if (owner?.id !== '@page') doc.querySelectorAll<HTMLElement>('[data-block]').forEach((node) => { if (node.dataset.block === owner?.id) return; node.dataset.isolationDim = 'true'; cleanups.push(() => { delete node.dataset.isolationDim }) })
      cleanups.push(() => styles.remove())
    })
    return () => cleanups.forEach((clean) => clean())
  }, [id, familyKey, docs, data])
  if (!frame || preview) return null
  return <div className="cv-isolation-bar" role="status"><strong>Đang chỉnh: {frame.props._name || 'Khung'}</strong><button type="button" onClick={() => setSel({ block: owner!.id, el: id })}>Chọn khung</button><button type="button" onClick={() => setId('')}>Thoát · Esc</button></div>
}
