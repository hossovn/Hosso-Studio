'use client'
import React from 'react'
import type { FreeElement } from '@hosso/studio-blocks'

export function ConstraintsPanel({ el, put }: { el: FreeElement; put: (patch: Record<string, any>) => void }) {
  const constraints = el.props._constraints ?? {}, layout = el.props._layout ?? {}
  return <div className="cv-constraints">
    <strong>Kích thước theo nội dung</strong>
    <div className="cv-tool-grid">{(['width', 'height'] as const).map((axis) => <label className="cv-tool-field" key={axis}>{axis === 'width' ? 'Chiều rộng' : 'Chiều cao'}<select aria-label={axis === 'width' ? 'Chế độ chiều rộng' : 'Chế độ chiều cao'} value={el.props._sizing?.[axis] || 'fixed'} onChange={(event) => put({ _sizing: { ...el.props._sizing, [axis]: event.target.value } })}><option value="fixed">Cố định</option><option value="hug">Vừa nội dung</option><option value="fill">Lấp đầy ô</option></select></label>)}</div>
    <strong>Ghim và co giãn</strong><p className="cv-tool-help">Áp dụng khi chuyển thiết bị. Tọa độ đã chỉnh riêng trên tablet/mobile được ưu tiên. Kích thước phần tử giữ theo px khi ghim; kiểm tra tràn trước khi xuất bản.</p>
    {(['horizontal', 'vertical'] as const).map((axis) => <label className="cv-tool-field" key={axis}>{axis === 'horizontal' ? 'Ghim ngang' : 'Ghim dọc'}<select value={constraints[axis] || 'scale'} onChange={(event) => put({ _constraints: { ...constraints, [axis]: event.target.value } })}>
      <option value="scale">Co giãn theo khung</option><option value="start">{axis === 'horizontal' ? 'Giữ mép trái' : 'Giữ mép trên'}</option><option value="center">Giữ tâm</option><option value="end">{axis === 'horizontal' ? 'Giữ mép phải' : 'Giữ mép dưới'}</option><option value="stretch">Giữ hai mép, giãn kích thước</option>
    </select></label>)}
    {el.type === 'container' && <>
      <strong>Bố cục trong ô / khung</strong>
      <div className="cv-frame-modes" role="group" aria-label="Cách sắp xếp nội dung">{[{ id: 'free', title: 'Tự do', note: 'Kéo đặt ở vị trí bất kỳ' }, { id: 'column', title: 'Tự động', note: 'Xếp và giữ khoảng cách' }].map((mode) => <button className="cv-frame-mode" type="button" key={mode.id} aria-pressed={(layout.direction || 'free') === mode.id || mode.id === 'column' && ['row', 'grid'].includes(layout.direction)} onClick={() => put({ _layout: { ...layout, direction: mode.id } })}><strong>{mode.title}</strong><span>{mode.note}</span></button>)}</div>
      <label className="cv-tool-field">Hướng bố cục<select value={layout.direction || 'free'} onChange={(event) => put({ _layout: { ...layout, direction: event.target.value } })}><option value="free">Đặt tự do</option><option value="row">Xếp ngang</option><option value="column">Xếp dọc</option><option value="grid">Chia ô theo lưới</option></select></label>
      {layout.direction === 'grid' && <><label className="cv-tool-field">Tỷ lệ các cột<input aria-label="Tỷ lệ các cột" value={(Array.isArray(layout.columns) ? layout.columns : [1, 1]).join(' : ')} onChange={(event) => { const columns = event.target.value.split(/\s*[: ,]\s*/).map(Number).filter((n) => n > 0 && Number.isFinite(n)).slice(0, 12); if (columns.length) put({ _layout: { ...layout, columns } }) }} /></label><label className="cv-tool-check"><input type="checkbox" checked={layout.mobileStack !== false} onChange={(event) => put({ _layout: { ...layout, mobileStack: event.target.checked } })} />Xếp thành một cột trên điện thoại</label></>}
      {layout.direction && layout.direction !== 'free' && <>
        <p className="cv-tool-help">Nhóm quản lý vị trí các lớp con theo thứ tự trong cấu trúc. Khi đổi kích thước lớp con, các lớp kế tiếp giữ khoảng cách đã đặt.</p>
        <div className="cv-tool-grid">{[['gap', 'Khoảng cách'], ['padding', 'Lề trong']].map(([key, title]) => <label className="cv-tool-field" key={key}>{title}<input type="number" min={0} max={500} value={layout[key] ?? 16} onChange={(event) => put({ _layout: { ...layout, [key]: Math.min(500, Math.max(0, Number(event.target.value) || 0)) } })} /></label>)}</div>
        <label className="cv-tool-field">Căn theo chiều còn lại<select value={layout.align || 'start'} onChange={(event) => put({ _layout: { ...layout, align: event.target.value } })}><option value="start">Đầu</option><option value="center">Giữa</option><option value="end">Cuối</option><option value="stretch">Giãn đều</option></select></label>
        <label className="cv-tool-check"><input type="checkbox" checked={Boolean(layout.autoSize)} onChange={(event) => put({ _layout: { ...layout, autoSize: event.target.checked } })} />Tự vừa nhóm theo nội dung</label>
      </>}
    </>}
  </div>
}
