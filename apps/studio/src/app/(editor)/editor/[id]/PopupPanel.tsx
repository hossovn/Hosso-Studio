'use client'
import React from 'react'
import { blockId, patchBlock, type PageData, type Sel } from './canvas-model'
export function PopupPanel({ data, sel, setSel, commit, onAdd }: { data: PageData; sel: Sel; setSel: (sel: Sel) => void; commit: (data: PageData) => void; onAdd: () => void }) {
  const popups = data.content.filter((block) => block.type === 'Popup'), current = popups.find((block) => blockId(block) === sel.block)
  const put = (patch: Record<string, unknown>) => current && commit(patchBlock(data, blockId(current), patch))
  return <div className="cv-workbench-panel"><button type="button" className="cv-tool-button" onClick={onAdd}>Thêm popup</button>
    {popups.map((block) => <button type="button" className="cv-tool-button" key={blockId(block)} aria-pressed={current === block} onClick={() => setSel({ block: blockId(block), el: '' })}>{block.props.title || 'Popup'}</button>)}
    {!current ? <p className="cv-tool-help">Chọn popup hoặc thêm một popup mới để cấu hình nội dung và thời điểm hiển thị.</p> : <>
      {[['title', 'Tiêu đề'], ['body', 'Nội dung'], ['ctaLabel', 'Nhãn nút'], ['ctaHref', 'Liên kết nút']].map(([key, label]) => <label key={key} className="cv-tool-field">{label}<input value={current.props[key] || ''} onChange={(event) => put({ [key]: event.target.value })} /></label>)}
      <label className="cv-tool-field">Mở khi<select value={current.props.trigger || 'delay'} onChange={(event) => put({ trigger: event.target.value })}><option value="delay">Sau một khoảng thời gian</option><option value="scroll">Cuộn đến vị trí</option><option value="click">Khách bấm nút</option></select></label>
      {current.props.trigger === 'scroll' ? <label className="cv-tool-field">Vị trí cuộn (%)<input type="number" min={0} max={100} value={current.props.scrollAt ?? 50} onChange={(event) => put({ scrollAt: Math.min(100, Math.max(0, Number(event.target.value))) })} /></label> : current.props.trigger !== 'click' && <label className="cv-tool-field">Chờ (giây)<input type="number" min={0} max={3600} value={current.props.delay ?? 5} onChange={(event) => put({ delay: Math.min(3600, Math.max(0, Number(event.target.value))) })} /></label>}
      <label className="cv-tool-field">Mã mở bằng nút<input value={current.props.triggerKey || ''} placeholder={blockId(current)} onChange={(event) => put({ triggerKey: event.target.value.replace(/[^a-zA-Z0-9_-]/g, '') })} /></label>
      <p className="cv-tool-help">Đặt liên kết của nút hoặc chữ thành <code>#popup:{current.props.triggerKey || blockId(current)}</code>. Nút bấm có thể mở lại popup đã đóng. Trên canvas popup luôn hiện bản thiết kế; hành vi thật chạy trên website.</p>
      <label className="cv-tool-field">Tần suất tự hiện<select value={current.props.every || 'session'} onChange={(event) => put({ every: event.target.value })}><option value="always">Mỗi lần vào trang</option><option value="session">Một lần mỗi phiên</option><option value="once">Một lần trên trình duyệt</option></select></label>
      <label className="cv-tool-field">Thiết bị<select value={current.props.device || 'all'} onChange={(event) => put({ device: event.target.value })}><option value="all">Tất cả</option><option value="desktop">Tablet và desktop</option><option value="mobile">Mobile</option></select></label>
      <label className="cv-tool-check"><input type="checkbox" checked={current.props.enabled !== 'no'} onChange={(event) => put({ enabled: event.target.checked ? 'yes' : 'no' })} />Bật popup trên website</label>
    </>}
  </div>
}
