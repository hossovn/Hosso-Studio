'use client'
import React from 'react'
import { Plus, Columns2 } from 'lucide-react'
import type { FreeElement } from '@hosso/studio-blocks'
import { createFrameLayout, FRAME_LAYOUTS } from '../../../../../../../packages/blocks/src/frame-layout'

export function FrameLibrary({ onInsert }: { onInsert: (elements: FreeElement[]) => void }) {
  return <section className="cv-frame-library">
    <div className="cv-library-intro"><span className="cv-library-eyebrow">BỐ CỤC</span><h3>Chia ô theo ý bạn</h3><p>Chọn bố cục, sau đó bấm vào từng ô để thêm chữ, ảnh, video, form hoặc khối tính năng.</p></div>
    <div className="cv-layout-presets">{FRAME_LAYOUTS.map((preset) => <button className="cv-layout-preset" type="button" key={preset.id} onClick={() => onInsert(createFrameLayout(preset.id))} aria-label={`Chèn bố cục ${preset.label}`} draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', 'hosso-frame:' + preset.id); event.dataTransfer.effectAllowed = 'copy' }}>
      <span className="cv-layout-preview" aria-hidden="true" style={{ gridTemplateColumns: preset.columns.map((weight) => `${weight}fr`).join(' '), gridTemplateRows: `repeat(${preset.rows}, 1fr)` }}>{Array.from({ length: preset.columns.length * preset.rows }, (_, index) => <span key={index}><Plus size={14} strokeWidth={1.4} /></span>)}</span>
      <span className="cv-item-label"><span>{preset.label}</span><Plus size={14} aria-hidden="true" /></span>
    </button>)}</div>
    <div className="cv-library-tip"><Columns2 size={17} /><p>Mỗi ô là một khung chứa thật. Bạn có thể lồng thêm ô, kéo nội dung sang ô khác và chọn cách xếp tự động hoặc tự do.</p></div>
  </section>
}

export function InputPresetPreview({ type, heading, submitLabel }: { type: string; heading?: string; submitLabel?: string }) {
  return <div className="cv-input-preview" aria-hidden="true">
    {type === 'SearchBox' ? <div className="cv-sample-search"><span>Tìm nội dung…</span><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5" /><path d="m12 12 4 4" /></svg></div> : type === 'NavMenu' ? <div className="cv-sample-nav"><b>Logo</b><span>Trang chủ</span><span>Giới thiệu</span><span>Liên hệ</span></div> : <div className="cv-sample-form"><strong>{heading ?? 'Đăng ký thông tin'}</strong><span>Họ và tên</span><span>Số điện thoại</span>{type === 'ContactForm' && <span className="cv-sample-message">Nội dung cần hỗ trợ</span>}<b>{submitLabel ?? 'Đăng ký'}</b></div>}
  </div>
}
