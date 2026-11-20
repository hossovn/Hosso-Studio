'use client'
import React, { useEffect, useRef } from 'react'
import type { Consent } from '../../blocks/src/attribution'

export const OPEN_CONSENT_EVENT = 'hs:consent-open'

/** Lives with the footer, so reopening preferences never covers the storefront. */
export function CookiePreferences() {
  return <div className="hs-cookie-preferences" style={{ padding: '12px 24px', textAlign: 'center', background: 'var(--hs-bg, #f5f2eb)', color: 'var(--hs-text, #191c1b)' }}>
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
      style={{ font: 'inherit', fontSize: 13, color: 'inherit', background: 'transparent', border: 0, padding: '10px 8px', minHeight: 44, textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer' }}>
      Tùy chọn cookie
    </button>
  </div>
}

export function ConsentDialog({ open, consent, onChoose, onClose }: {
  open: boolean
  consent: Consent | null
  onChoose: (value: Consent) => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    if (open && !node.open) node.showModal()
    if (!open && node.open) node.close()
  }, [open])
  // Dismissing the first prompt never opts into measurement or advertising.
  const dismiss = () => consent ? onClose() : onChoose({ analytics: false, marketing: false })
  return <>
    <style>{`
      .hs-consent{box-sizing:border-box;inset:auto 0 24px;margin:0 auto;width:min(720px,calc(100% - 32px));max-height:calc(100dvh - 48px);overflow:auto;border:1px solid #d9d4c9;border-radius:16px;padding:32px;background:#f8f6f0;color:#191c1b;box-shadow:0 24px 80px #0003;font:15px/1.6 var(--hs-font-body,system-ui,sans-serif)}
      .hs-consent::backdrop{background:rgb(13 16 15 / .4)}
      .hs-consent[open]{animation:hs-consent-enter .22s ease-out both}
      .hs-consent-label{margin:0 40px 10px 0;font-size:11px;font-weight:750;letter-spacing:.12em;text-transform:uppercase;color:#805214}
      .hs-consent h2{margin:0 28px 12px 0;font:700 clamp(22px,3vw,28px)/1.25 var(--hs-font-heading,system-ui,sans-serif);letter-spacing:-.025em;color:inherit}
      .hs-consent-copy{margin:0;color:#51554f;max-width:62ch}
      .hs-consent-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:24px}
      .hs-consent button{font-family:inherit;font-size:13px;font-weight:600;line-height:1.4;cursor:pointer;min-height:46px;border:1px solid #9b9c94;border-radius:6px;background:transparent;color:#191c1b;padding:12px;transition:background .15s,transform .15s}
      .hs-consent-actions button{font-family:inherit;font-size:13px;font-weight:650}
      .hs-consent-actions button:hover{background:#eae6dc}
      .hs-consent-actions button:last-child{background:#eaaa43;border-color:#b87512}
      .hs-consent-actions button:last-child:hover{background:#f0b75c}
      .hs-consent button:active{transform:translateY(1px)}
      .hs-consent button:focus-visible,.hs-cookie-preferences button:focus-visible{outline:3px solid #926014;outline-offset:3px}
      .hs-consent .hs-consent-close{position:absolute;top:12px;right:12px;display:grid;place-items:center;width:44px;min-height:44px;border:0;padding:0}
      .hs-consent-close:hover{background:#eae6dc}
      @keyframes hs-consent-enter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @media(max-width:540px){.hs-consent{bottom:12px;width:calc(100% - 24px);max-height:calc(100dvh - 24px);padding:24px;border-radius:12px}.hs-consent-actions{grid-template-columns:1fr;gap:8px;margin-top:20px}.hs-consent h2{font-size:24px}.hs-consent-copy{font-size:14px}}
      @media(prefers-reduced-motion:reduce){.hs-consent[open]{animation:none}.hs-consent button{transition:none}}
    `}</style>
    <dialog ref={dialog} className="hs-consent" aria-labelledby="hs-consent-title" aria-describedby="hs-consent-description"
      onCancel={(event) => { event.preventDefault(); dismiss() }} onClose={onClose}>
      <button type="button" className="hs-consent-close" aria-label={consent ? 'Đóng tùy chọn cookie' : 'Đóng và chỉ dùng cookie cần thiết'} onClick={dismiss}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
      </button>
      <p className="hs-consent-label">Quyền riêng tư</p>
      <h2 id="hs-consent-title">Bạn quyết định dữ liệu của mình.</h2>
      <p id="hs-consent-description" className="hs-consent-copy">Cookie cần thiết giúp website hoạt động. Bạn có thể cho phép thêm cookie đo lường và quảng cáo, hoặc chỉ dùng cookie cần thiết. Đổi lựa chọn bất cứ lúc nào tại “Tùy chọn cookie” ở cuối trang.</p>
      <div className="hs-consent-actions">
        <button type="button" autoFocus onClick={() => onChoose({ analytics: false, marketing: false })}>Chỉ cần thiết</button>
        <button type="button" onClick={() => onChoose({ analytics: true, marketing: false })}>Cho phép đo lường</button>
        <button type="button" onClick={() => onChoose({ analytics: true, marketing: true })}>Cho phép tất cả</button>
      </div>
    </dialog>
  </>
}
