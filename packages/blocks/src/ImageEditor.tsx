'use client'
import { useLabel } from './admin-lang'
import React, { useCallback, useEffect, useRef, useState } from 'react'

type Rect = { x: number; y: number; w: number; h: number }

const btn: React.CSSProperties = { padding: '6px 10px', border: '1px solid #c9ccd1', borderRadius: 4, background: '#fff', color: '#111', cursor: 'pointer', font: 'inherit', fontSize: 13 }
const primary: React.CSSProperties = { ...btn, background: '#d71920', borderColor: '#d71920', color: '#fff', fontWeight: 600 }
const RATIOS: [string, number | null][] = [
  ['Tự do', null],
  ['1:1', 1],
  ['4:3', 4 / 3],
  ['16:9', 16 / 9],
  ['3:4', 3 / 4],
]

const clone = (src: HTMLCanvasElement) => {
  const c = document.createElement('canvas')
  c.width = src.width
  c.height = src.height
  c.getContext('2d')!.drawImage(src, 0, 0)
  return c
}

/**
 * Trình sửa ảnh chạy hoàn toàn trên trình duyệt (canvas): xoay, lật, cắt, đổi kích thước, độ sáng/tương phản/bão hòa, đen trắng.
 * Không cần thư viện xử lý ảnh phía server. Kết quả trả về dạng Blob để lưu thành ảnh mới hoặc thay ảnh gốc.
 */
export function ImageEditor({
  src,
  filename,
  mime,
  onSaveNew,
  onReplace,
  onClose,
}: {
  src: string
  filename: string
  mime: string
  onSaveNew: (blob: Blob, filename: string) => Promise<void> | void
  onReplace?: (blob: Blob) => Promise<void> | void
  onClose: () => void
}) {
  const L = useLabel()
  const view = useRef<HTMLCanvasElement>(null)
  const work = useRef<HTMLCanvasElement | null>(null)
  const history = useRef<HTMLCanvasElement[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [sel, setSel] = useState<Rect | null>(null)
  const [ratio, setRatio] = useState<number | null>(null)
  const [maxW, setMaxW] = useState('')
  const [adj, setAdj] = useState({ brightness: 100, contrast: 100, saturate: 100, gray: false })
  const [format, setFormat] = useState(mime === 'image/png' ? 'image/png' : mime === 'image/webp' ? 'image/webp' : 'image/jpeg')
  const [quality, setQuality] = useState(90)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const drag = useRef<{ x: number; y: number } | null>(null)

  const filterCss = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturate}%)${adj.gray ? ' grayscale(1)' : ''}`

  const draw = useCallback(() => {
    const v = view.current
    const w = work.current
    if (!v || !w) return
    v.width = w.width
    v.height = w.height
    setSize({ w: w.width, h: w.height })
  }, [])

  const load = useCallback(() => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      work.current = c
      history.current = []
      setSel(null)
      draw()
    }
    img.onerror = () => setError(L('Không đọc được ảnh.'))
    img.src = src
  }, [src, draw])
  useEffect(load, [load])

  // Vẽ lại xem trước (có áp bộ lọc) mỗi khi ảnh hoặc chỉnh sửa đổi.
  useEffect(() => {
    const v = view.current
    const w = work.current
    if (!v || !w || !size.w) return
    const ctx = v.getContext('2d')!
    ctx.clearRect(0, 0, v.width, v.height)
    ctx.filter = filterCss
    ctx.drawImage(w, 0, 0)
    ctx.filter = 'none'
  }, [size, filterCss])

  const apply = (fn: (src: HTMLCanvasElement) => HTMLCanvasElement) => {
    const w = work.current
    if (!w) return
    history.current.push(clone(w))
    if (history.current.length > 12) history.current.shift()
    work.current = fn(w)
    setSel(null)
    draw()
  }
  const undo = () => {
    const prev = history.current.pop()
    if (prev) {
      work.current = prev
      setSel(null)
      draw()
    }
  }

  const rotate = (dir: 1 | -1) =>
    apply((w) => {
      const c = document.createElement('canvas')
      c.width = w.height
      c.height = w.width
      const ctx = c.getContext('2d')!
      ctx.translate(c.width / 2, c.height / 2)
      ctx.rotate((dir * Math.PI) / 2)
      ctx.drawImage(w, -w.width / 2, -w.height / 2)
      return c
    })
  const flip = (horizontal: boolean) =>
    apply((w) => {
      const c = document.createElement('canvas')
      c.width = w.width
      c.height = w.height
      const ctx = c.getContext('2d')!
      ctx.translate(horizontal ? w.width : 0, horizontal ? 0 : w.height)
      ctx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1)
      ctx.drawImage(w, 0, 0)
      return c
    })
  const crop = () => {
    if (!sel || sel.w < 4 || sel.h < 4) return
    apply((w) => {
      const c = document.createElement('canvas')
      c.width = Math.round(sel.w)
      c.height = Math.round(sel.h)
      c.getContext('2d')!.drawImage(w, sel.x, sel.y, sel.w, sel.h, 0, 0, c.width, c.height)
      return c
    })
  }
  const resize = () => {
    const target = Math.round(Number(maxW))
    if (!target || target < 16) return
    apply((w) => {
      if (w.width <= target) return w
      const c = document.createElement('canvas')
      c.width = target
      c.height = Math.round((w.height * target) / w.width)
      const ctx = c.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(w, 0, 0, c.width, c.height)
      return c
    })
  }

  // Chọn vùng cắt bằng cách kéo trên xem trước (tọa độ đổi theo tỉ lệ hiển thị).
  const toImage = (e: React.PointerEvent) => {
    const r = view.current!.getBoundingClientRect()
    return { x: Math.min(Math.max(0, ((e.clientX - r.left) / r.width) * size.w), size.w), y: Math.min(Math.max(0, ((e.clientY - r.top) / r.height) * size.h), size.h) }
  }
  const rectFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Rect => {
    let w = Math.abs(b.x - a.x)
    let h = Math.abs(b.y - a.y)
    if (ratio) h = w / ratio
    const x = b.x < a.x ? a.x - w : a.x
    const y = b.y < a.y ? a.y - h : a.y
    return { x, y: Math.max(0, Math.min(y, size.h - h)), w: Math.min(w, size.w - x), h: Math.min(h, size.h) }
  }

  const output = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const w = work.current
      if (!w) return resolve(null)
      const c = document.createElement('canvas')
      c.width = w.width
      c.height = w.height
      const ctx = c.getContext('2d')!
      if (format === 'image/jpeg') {
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, c.width, c.height)
      }
      ctx.filter = filterCss
      ctx.drawImage(w, 0, 0)
      c.toBlob((b) => resolve(b), format, quality / 100)
    })

  const ext = format === 'image/png' ? 'png' : format === 'image/webp' ? 'webp' : 'jpg'
  const newName = `${filename.replace(/\.[^.]+$/, '')}-sua.${ext}`

  const save = async (replace: boolean) => {
    setBusy(true)
    setError('')
    try {
      const blob = await output()
      if (!blob) throw new Error(L('Không xuất được ảnh'))
      if (replace && onReplace) await onReplace(blob)
      else await onSaveNew(blob, newName)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : L('Lưu không thành công'))
      setBusy(false)
    }
  }

  const label: React.CSSProperties = { display: 'grid', gap: 2, fontSize: 12 }
  return (
    <div role="dialog" aria-modal="true" aria-label={L('Sửa ảnh')} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 8, maxWidth: 980, width: '100%', maxHeight: '94vh', overflow: 'auto', padding: 16, display: 'grid', gap: 12, color: '#111' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{L('Sửa ảnh: {filename}', { filename })}</strong>
          <button type="button" style={btn} onClick={onClose}>
            {L('Đóng')}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 16 }}>
          <div
            style={{ position: 'relative', background: '#e5e7eb', borderRadius: 4, touchAction: 'none', lineHeight: 0, alignSelf: 'start' }}
            onPointerDown={(e) => {
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              drag.current = toImage(e)
              setSel(null)
            }}
            onPointerMove={(e) => drag.current && setSel(rectFrom(drag.current, toImage(e)))}
            onPointerUp={() => (drag.current = null)}
          >
            <canvas ref={view} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }} />
            {sel && size.w > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(sel.x / size.w) * 100}%`,
                  top: `${(sel.y / size.h) * 100}%`,
                  width: `${(sel.w / size.w) * 100}%`,
                  height: `${(sel.h / size.h) * 100}%`,
                  border: '2px dashed #fff',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,.45)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
          <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <div style={{ fontSize: 12, color: '#555' }}>
              {size.w} × {size.h} px
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" style={btn} onClick={() => rotate(-1)} title={L('Xoay trái')}>
                ⟲ {L('Xoay trái')}
              </button>
              <button type="button" style={btn} onClick={() => rotate(1)} title={L('Xoay phải')}>
                ⟳ {L('Xoay phải')}
              </button>
              <button type="button" style={btn} onClick={() => flip(true)}>
                ⇋ {L('Lật ngang')}
              </button>
              <button type="button" style={btn} onClick={() => flip(false)}>
                ⇅ {L('Lật dọc')}
              </button>
            </div>
            <div style={label}>
              {L('Cắt: kéo chuột trên ảnh để chọn vùng')}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {RATIOS.map(([name, r]) => (
                  <button key={name} type="button" style={{ ...btn, ...(ratio === r ? { borderColor: '#d71920', color: '#d71920' } : {}) }} onClick={() => setRatio(r)}>
                    {L(name)}
                  </button>
                ))}
              </div>
              <button type="button" style={btn} onClick={crop} disabled={!sel}>
                {L('Cắt vùng đã chọn')}
              </button>
            </div>
            <label style={label}>
              {L('Thu nhỏ: chiều rộng tối đa (px)')}
              <span style={{ display: 'flex', gap: 4 }}>
                <input type="number" min={16} value={maxW} onChange={(e) => setMaxW(e.target.value)} style={{ ...btn, width: 90 }} />
                <button type="button" style={btn} onClick={resize}>
                  {L('Áp dụng')}
                </button>
              </span>
            </label>
            {(['brightness', 'contrast', 'saturate'] as const).map((k) => (
              <label key={k} style={label}>
                {k === 'brightness' ? L('Độ sáng') : k === 'contrast' ? L('Tương phản') : L('Bão hòa')}: {adj[k]}%
                <input type="range" min={30} max={200} value={adj[k]} onChange={(e) => setAdj({ ...adj, [k]: Number(e.target.value) })} />
              </label>
            ))}
            <label style={{ ...label, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={adj.gray} onChange={(e) => setAdj({ ...adj, gray: e.target.checked })} /> {L('Đen trắng')}
            </label>
            <label style={label}>
              {L('Định dạng lưu')}
              <select value={format} onChange={(e) => setFormat(e.target.value)} style={btn}>
                <option value="image/jpeg">{L('JPEG (nhẹ)')}</option>
                <option value="image/webp">{L('WebP (nhẹ hơn)')}</option>
                <option value="image/png">{L('PNG (giữ nền trong suốt)')}</option>
              </select>
            </label>
            {format !== 'image/png' && (
              <label style={label}>
                {L('Chất lượng')}: {quality}%
                <input type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} />
              </label>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" style={btn} onClick={undo}>
                {L('Hoàn tác')}
              </button>
              <button type="button" style={btn} onClick={() => { setAdj({ brightness: 100, contrast: 100, saturate: 100, gray: false }); load() }}>
                {L('Đặt lại')}
              </button>
            </div>
          </div>
        </div>
        {error && <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" style={btn} onClick={onClose}>
            {L('Hủy')}
          </button>
          {onReplace && (
            <button type="button" style={btn} disabled={busy} onClick={() => save(true)} title={L('Thay ảnh gốc trong thư viện (mọi nơi đang dùng ảnh này sẽ đổi theo)')}>
              {L('Thay ảnh gốc')}
            </button>
          )}
          <button type="button" style={primary} disabled={busy} onClick={() => save(false)}>
            {busy ? L('Đang lưu…') : L('Lưu thành ảnh mới')}
          </button>
        </div>
      </div>
    </div>
  )
}
