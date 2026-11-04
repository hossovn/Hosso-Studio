'use client'
import React, { useEffect, useRef, useState } from 'react'
const STEPS = [
  ['Chọn nội dung', 'Mở Phần để thêm một section. Chọn Văn bản hoặc Ảnh/Video để kéo nội dung vào canvas.', 'sections'],
  ['Chỉnh trực tiếp', 'Nhấp đúp vào chữ để sửa. Kéo tay nắm để đổi kích thước; kéo chấm trên thanh công cụ để di chuyển thanh.', 'inspect'],
  ['Căn chỉnh chính xác', 'Bật thước và lưới trong Căn chỉnh. Kéo từ thước để đặt guide; chọn nhiều phần tử bằng Shift + bấm.', 'drawing'],
  ['Thiết kế trên từng màn hình', 'Chuyển Desktop, Tablet, Mobile rồi tinh chỉnh bố cục. Ghim phần tử và bố cục nhóm nằm trong Thuộc tính → Bố cục.', 'responsive'],
  ['Lưu và kiểm tra', 'Lưu nháp không xuất bản website. Mở Kiểm tra để xem lỗi và SEO trước khi đến bước xuất bản.', 'publish'],
] as const
const SHORTCUTS = [
  ['Hoàn tác / làm lại', 'Ctrl/⌘ Z · Shift Ctrl/⌘ Z'], ['Lưu nháp', 'Ctrl/⌘ S'], ['Sao chép / cắt / dán', 'Ctrl/⌘ C · X · V'], ['Nhân đôi', 'Ctrl/⌘ D'],
  ['Sao chép / dán kiểu', 'Ctrl/⌘ Alt C · V'], ['Chọn nhiều cùng section', 'Shift + bấm'], ['Dịch chuyển', 'Mũi tên · Shift để đi 10px'], ['Xóa', 'Delete / Backspace'],
  ['Giữ tỉ lệ khi resize', 'Shift + kéo góc'], ['Tạm bỏ hít', 'Ctrl/⌘ + kéo'], ['Sửa chữ tại chỗ', 'Nhấp đúp vào chữ'], ['Khôi phục thanh công cụ', 'Nhấp đúp tay nắm / Home'], ['Trợ giúp', '?'],
]
export function EditorHelp({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (target: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState<number | null>(null)
  useEffect(() => { try { if (!localStorage.getItem('hosso-editor-intro:v2')) setStep(0) } catch {} }, [])
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])
  const finish = () => { setStep(null); try { localStorage.setItem('hosso-editor-intro:v2', 'done') } catch {} }
  return <>
    {step !== null && <aside className="cv-intro" aria-label="Hướng dẫn lần đầu">
      <div><small>BƯỚC {step + 1}/{STEPS.length}</small><button type="button" aria-label="Bỏ qua hướng dẫn" onClick={finish}>×</button></div>
      <strong>{STEPS[step][0]}</strong><p>{STEPS[step][1]}</p>
      <div><button type="button" onClick={() => onNavigate(STEPS[step][2])}>Mở công cụ</button><button type="button" className="cv-tool-primary" onClick={() => step === STEPS.length - 1 ? finish() : setStep(step + 1)}>{step === STEPS.length - 1 ? 'Hoàn tất' : 'Tiếp theo'}</button></div>
    </aside>}
    <dialog ref={dialog} className="cv-help-dialog" aria-label="Trợ giúp Studio" onCancel={onClose} onClose={onClose}>
      <header><h2>Trợ giúp Studio</h2><button type="button" aria-label="Đóng trợ giúp" onClick={onClose}>×</button></header>
      <button type="button" className="cv-tool-button" onClick={() => { onClose(); setStep(0) }}>Xem lại hướng dẫn thao tác</button>
      <h3>Phím tắt</h3><dl>{SHORTCUTS.map(([label, keys]) => <div key={label}><dt>{label}</dt><dd><kbd>{keys}</kbd></dd></div>)}</dl>
      <p className="cv-tool-help">Bản chưa lưu được giữ trên trình duyệt này khi mất mạng. Khi mở lại, chọn Khôi phục để xem và tiếp tục. Dùng Lịch sử để lưu snapshot lâu dài.</p>
    </dialog>
  </>
}
