import hosso from '@hosso-config'
import type { Payload } from 'payload'
import React from 'react'

type Step = { label: string; done: boolean; href: string }

/** Hướng dẫn bắt đầu trên dashboard: hiện các bước chưa xong, tự ẩn khi đã hoàn tất. */
export const GettingStarted = async ({ payload }: { payload: Payload }) => {
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
  const left = steps.filter((s) => !s.done).length
  return (
    <section style={{ border: '1px solid var(--theme-elevation-150)', borderRadius: 6, padding: 20, marginBottom: 24 }}>
      <h3 style={{ margin: '0 0 4px' }}>Bắt đầu với {hosso.brand.name}</h3>
      <p style={{ margin: '0 0 12px', opacity: 0.75 }}>Còn {left} bước để site sẵn sàng.</p>
      <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
        {steps.map((s) => (
          <li key={s.label} style={{ opacity: s.done ? 0.55 : 1 }}>
            {s.done ? '✓ ' : ''}
            <a href={s.href} style={{ textDecoration: s.done ? 'line-through' : 'underline', color: 'inherit' }}>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </section>
  )
}
