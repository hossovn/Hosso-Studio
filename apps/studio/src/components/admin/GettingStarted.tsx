import hosso from '@hosso-config'
import type { Payload } from 'payload'
import React from 'react'

import { adminLang, makeT } from '@/lib/admin-i18n'

type Step = { label: string; done: boolean; href: string }

/** Hướng dẫn bắt đầu trên dashboard: hiện các bước chưa xong, tự ẩn khi đã hoàn tất. */
export const GettingStarted = async ({ payload, i18n }: { payload: Payload; i18n?: { language?: string } }) => {
  const T = makeT(adminLang(i18n?.language))
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0 }).catch(() => ({}))) as Record<string, any>
  const home = await payload.count({ collection: 'pages', where: { slug: { equals: 'home' }, _status: { equals: 'published' } } })
  const published = await payload.count({ collection: 'pages', where: { _status: { equals: 'published' } } })

  const steps: Step[] = [
    { label: 'Đặt tên site và logo', done: Boolean(settings.siteName && settings.logo), href: '/admin/globals/site-settings' },
    { label: 'Tạo menu đầu trang', done: (settings.headerMenu?.length ?? 0) > 0, href: '/admin/globals/site-settings' },
    { label: 'Dựng và xuất bản trang chủ', done: home.totalDocs > 0, href: '/admin/collections/pages' },
    { label: 'Có ít nhất 3 trang đã xuất bản', done: published.totalDocs >= 3, href: '/admin/collections/pages' },
  ]
  for (const plugin of hosso.plugins) steps.push(...((await plugin.checklist?.(payload).catch(() => [])) ?? []))

  if (steps.every((s) => s.done)) return null
  // Giấy phép plugin chỉ cần khi chạy thật: tách riêng để không lẫn với việc thiết lập site.
  const isLicense = (s: Step) => s.label.startsWith('Giấy phép')
  const setup = steps.filter((s) => !isLicense(s))
  const licenses = steps.filter(isLicense)
  const pending = setup.filter((s) => !s.done)
  const doneCount = setup.length - pending.length
  const pct = setup.length ? Math.round((doneCount / setup.length) * 100) : 100
  const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', color: 'inherit', background: 'var(--theme-elevation-100)', border: '1px solid var(--theme-elevation-150)' } as const
  return (
    <section style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 12, padding: 22, marginBottom: 28, background: 'var(--theme-elevation-50)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{T('Bắt đầu với {name}', { name: hosso.brand.name })}</h3>
        <span style={{ fontSize: 13, opacity: 0.75 }}>{doneCount}/{setup.length}</span>
      </div>
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={T('Tiến độ thiết lập')} style={{ height: 6, borderRadius: 999, background: 'var(--theme-elevation-150)', margin: '12px 0 16px', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: 'var(--hosso-brand, #15803d)', borderRadius: 999, transition: 'width .4s' }} />
      </div>
      {pending.length > 0 ? (
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
          {pending.map((s) => (
            <a key={s.label} href={s.href} style={row}>
              <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--hosso-brand, #15803d)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 600 }}>{T(s.label)}</span>
              <span aria-hidden="true">→</span>
            </a>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0 }}>{T('Đã xong các bước thiết lập chính.')}</p>
      )}
      {doneCount > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', opacity: 0.8 }}>{T('Đã xong')} ({doneCount})</summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 20, display: 'grid', gap: 4, opacity: 0.7 }}>
            {setup.filter((s) => s.done).map((s) => (
              <li key={s.label}>✓ <a href={s.href} style={{ color: 'inherit' }}>{T(s.label)}</a></li>
            ))}
          </ul>
        </details>
      )}
      {licenses.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', opacity: 0.8 }}>{T('Giấy phép plugin')} ({licenses.filter((l) => !l.done).length}/{licenses.length})</summary>
          <p style={{ margin: '8px 0', fontSize: 13, opacity: 0.7 }}>{T('Chỉ cần khi chạy thật (production). Khi phát triển, plugin vẫn dùng thử được.')}</p>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
            {licenses.map((s) => (
              <li key={s.label} style={{ opacity: s.done ? 0.55 : 1 }}>{s.done ? '✓ ' : ''}<a href={s.href} style={{ color: 'inherit' }}>{T(s.label)}</a></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
