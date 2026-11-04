'use client'
import { useEffect, useRef, useState } from 'react'
import { makeElement } from '@hosso/studio-blocks'
import { frameAtPoint, insertIntoFrame } from '../../../../../../../packages/blocks/src/frame-layout'
import { inheritedElementFlag } from '../../../../../../../packages/blocks/src/free-geometry'
import { PAGE, elsOf, findEl, floatOf, placeElement, setBlockEls, updateEl, type PageData, type Sel } from './canvas-model'

export async function uploadCanvasImage(file: File) {
  if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Chọn ảnh PNG, JPG, WebP, GIF hoặc AVIF tối đa 20 MB.')
  const form = new FormData(); form.append('file', file); form.append('_payload', JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, '') }))
  const res = await fetch('/api/media', { method: 'POST', body: form }), body = await res.json().catch(() => ({}))
  if (!res.ok || !body.doc?.filename) throw new Error(body.errors?.[0]?.message || 'Không tải được ảnh. Thử lại.')
  return '/api/media/file/' + encodeURIComponent(body.doc.filename)
}
async function dimensions(file: File) {
  const src = URL.createObjectURL(file)
  try { return await new Promise<{ width: number; height: number }>((resolve, reject) => { const image = new Image(); image.onload = () => image.naturalWidth && image.naturalHeight ? resolve({ width: image.naturalWidth, height: image.naturalHeight }) : reject(new Error('Ảnh không hợp lệ.')); image.onerror = () => reject(new Error('Không đọc được ảnh.')); image.src = src }) }
  finally { URL.revokeObjectURL(src) }
}

export function useCanvasMediaDrop({ docs, data, sel, preview, commit, setSel }: { docs: Document[]; data: PageData; sel: Sel; preview: boolean; commit: (data: PageData) => void; setSel: (sel: Sel) => void }) {
  const latest = useRef({ data, sel, preview, commit, setSel }), busy = useRef(false), alive = useRef(true), [message, setMessage] = useState('')
  latest.current = { data, sel, preview, commit, setSel }
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const over = (event: DragEvent) => { if (!latest.current.preview && event.dataTransfer?.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy' } }
    const drop = async (event: DragEvent) => {
      if (latest.current.preview || !event.dataTransfer?.files.length) return
      event.preventDefault(); event.stopPropagation()
      if (busy.current) { setMessage('Đang tải ảnh trước. Vui lòng đợi.'); return }
      const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith('image/')).slice(0, 12)
      if (!files.length) { setMessage('Kéo tệp ảnh vào canvas để thêm ảnh.'); return }
      const target = event.target as Element, doc = target.ownerDocument
      const section = target.closest<HTMLElement>('[data-block]'), page = doc.querySelector<HTMLElement>('[data-editor-page]')
      const layer = section?.querySelector<HTMLElement>('[data-canvas-layer]') ?? page
      if (!layer) return
      const rect = layer.getBoundingClientRect(), scale = Math.min(rect.width, 1200) / 1200
      if (!scale) return
      const owner = section?.dataset.block ?? PAGE, point = { x: (event.clientX - rect.left - Math.max(0, (rect.width - 1200) / 2)) / scale, y: (event.clientY - rect.top) / scale }
      const replaceId = target.closest<HTMLElement>('[data-element]')?.dataset.element
      busy.current = true; setMessage(`Đang tải ${files.length} ảnh…`)
      let count = 0
      try {
        for (const file of files) {
          const size = await dimensions(file), src = await uploadCanvasImage(file)
          if (!alive.current) return
          const current = latest.current, block = current.data.content.find((item) => item.props.id === owner)
          if (owner !== PAGE && !block) throw new Error('Phần đã bị xóa. Ảnh đã tải nằm trong thư viện.')
          const list = owner === PAGE ? floatOf(current.data) : elsOf(block!), hit = replaceId && findEl(current.data, replaceId)
          let next: PageData, id: string
          if (files.length === 1 && hit && hit.el.type === 'image' && current.sel.el === replaceId && !inheritedElementFlag(list, replaceId!, '_locked')) {
            id = hit.el.id; next = updateEl(current.data, id, (el) => ({ ...el, props: { ...el.props, src, alt: file.name.replace(/\.[^.]+$/, '') } }))
          } else {
            const ratio = Math.min(1, 480 / size.width, 480 / size.height), image = makeElement('image', { w: Math.round(size.width * ratio), h: Math.round(size.height * ratio), props: { src, alt: file.name.replace(/\.[^.]+$/, '') } })
            const frame = frameAtPoint(list, point.x, point.y); id = image.id
            next = frame ? setBlockEls(current.data, owner, insertIntoFrame(list, frame.id, [image], { x: point.x + count * 20, y: point.y + count * 20 })) : placeElement(current.data, owner, image, { x: point.x - image.w / 2 + count * 20, y: point.y - image.h / 2 + count * 20 })
          }
          current.commit(next); latest.current.data = next; current.setSel({ block: owner, el: id }); count++
        }
        setMessage(`Đã thêm ${count} ảnh. Nhấp đúp ảnh để cắt, xoay hoặc lật.`)
      } catch (error) { if (alive.current) setMessage(`${count ? `Đã thêm ${count} ảnh. ` : ''}${error instanceof Error ? error.message : 'Không thêm được ảnh.'}`) }
      finally { busy.current = false }
    }
    docs.forEach((doc) => { doc.addEventListener('dragover', over, true); doc.addEventListener('drop', drop, true) })
    return () => docs.forEach((doc) => { doc.removeEventListener('dragover', over, true); doc.removeEventListener('drop', drop, true) })
  }, [docs])
  return message
}
