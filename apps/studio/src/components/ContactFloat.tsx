import React from 'react'

type Contact = { phone?: string; zalo?: string; email?: string }

const zaloHref = (z: string) => (/^https?:/.test(z) ? z : `https://zalo.me/${z.replace(/\D/g, '')}`)
const base: React.CSSProperties = { width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,0,0,.35)' }

/** Nút liên hệ nổi (gọi, Zalo, email) lấy từ Cài đặt site; dùng khi footer tự dựng thay footer của theme (footer của theme tự có nút này). */
export function ContactFloat({ contact }: { contact: Contact }) {
  const { phone, zalo, email } = contact
  if (!phone && !zalo && !email) return null
  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 10, zIndex: 30 }}>
      {phone && <a href={`tel:${phone.replace(/\s/g, '')}`} aria-label="Gọi điện" style={{ ...base, background: '#16a34a', fontSize: 20 }}>☎</a>}
      {zalo && <a href={zaloHref(zalo)} rel="noopener noreferrer" aria-label="Zalo" style={{ ...base, background: '#0068ff', fontSize: 12 }}>Zalo</a>}
      {email && <a href={`mailto:${email}`} aria-label="Email" style={{ ...base, background: '#0ea5e9', fontSize: 18 }}>@</a>}
    </div>
  )
}
