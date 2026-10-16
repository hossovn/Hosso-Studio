'use client'
import hosso from '@hosso-config'
import { buildPuckConfig, coreBlocks } from '@hosso/studio-blocks'
import { Puck, usePuck } from '@puckeditor/core'
import '@puckeditor/core/puck.css'
import React, { useEffect, useMemo, useState } from 'react'

import { loadBlockData } from './actions'

type Props = {
  id: string
  title: string
  slug: string
  status: string
  data: any
  themeName: string
  css: string
  canPublish: boolean
  fontClass: string
}

/** Bọc renderer của block có loader: lấy dữ liệu thật qua server action rồi mới hiển thị. */
function withLiveData(type: string, Render: React.ComponentType<any>) {
  return function Live(props: Record<string, any>) {
    const [data, setData] = useState<unknown>(undefined)
    const key = JSON.stringify({ ...props, puck: undefined })
    useEffect(() => {
      let on = true
      const t = setTimeout(() => loadBlockData(type, props).then((d) => on && setData(d)), 300)
      return () => {
        on = false
        clearTimeout(t)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
    return <Render {...props} data={data ?? { status: 'loading' }} />
  }
}

function Actions({ id, slug, canPublish, onStatus }: Pick<Props, 'id' | 'slug' | 'canPublish'> & { onStatus: (s: string) => void }) {
  const { appState } = usePuck()
  const [busy, setBusy] = useState(false)

  const save = async (publish: boolean) => {
    setBusy(true)
    onStatus('Đang lưu…')
    const res = await fetch(`/api/pages/${id}${publish ? '' : '?draft=true'}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: appState.data, _status: publish ? 'published' : 'draft' }),
    })
    const body = await res.json().catch(() => ({}))
    onStatus(res.ok ? (publish ? 'Đã xuất bản' : 'Đã lưu nháp') : `Lỗi: ${body?.errors?.[0]?.message ?? res.status}`)
    setBusy(false)
  }

  const btn: React.CSSProperties = { padding: '8px 14px', borderRadius: 4, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', font: 'inherit' }
  const primary: React.CSSProperties = { ...btn, background: '#d71920', borderColor: '#d71920', color: '#fff', fontWeight: 600 }
  const href = slug === 'home' ? '/' : `/${slug}`
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <a style={{ ...btn, textDecoration: 'none', color: 'inherit' }} href={`${href}?preview=1`} target="_blank" rel="noreferrer">
        Xem trước
      </a>
      <button style={btn} disabled={busy} onClick={() => save(false)}>
        Lưu nháp
      </button>
      <button
        style={canPublish ? primary : { ...btn, opacity: 0.5, cursor: 'not-allowed' }}
        disabled={busy || !canPublish}
        title={canPublish ? '' : 'Chỉ quản trị viên được xuất bản'}
        onClick={() => save(true)}
      >
        Xuất bản
      </button>
    </div>
  )
}

export function Editor(props: Props) {
  const [status, setStatus] = useState(props.status === 'published' ? 'Đã xuất bản' : 'Bản nháp')
  const theme = hosso.themes.find((t) => t.manifest.name === props.themeName) ?? hosso.themes[0]
  const schemas = useMemo(() => [...coreBlocks, ...hosso.plugins.flatMap((p) => p.blocks ?? [])], [])
  const config = useMemo(() => {
    const known = new Set(schemas.map((s) => s.type))
    const extraTypes = (props.data?.content ?? []).map((c: { type: string }) => c.type).filter((t: string) => !known.has(t))
    const built = buildPuckConfig({ schemas, theme, plugins: hosso.plugins, mode: 'editor', extraTypes })
    for (const p of hosso.plugins) {
      for (const type of Object.keys(p.loaders ?? {})) {
        const c = built.components[type]
        if (c) c.render = withLiveData(type, c.render)
      }
    }
    // Khung gốc giống site công khai (class .hs-theme + biến font) để xem trước khớp bản thật.
    return { ...built, root: { fields: {}, render: ({ children }: { children: React.ReactNode }) => <div className={`hs-theme ${props.fontClass}`}>{children}</div> } }
  }, [schemas, theme, props.data, props.fontClass])

  return (
    <>
      {/* Puck sao chép style của trang chủ vào iframe xem trước (syncHostStyles). */}
      <style>{props.css}</style>
      <Puck
        config={config as any}
        data={props.data}
        headerTitle={`${props.title} · ${status}`}
        headerPath={props.slug === 'home' ? '/' : `/${props.slug}`}
        iframe={{ enabled: true, syncHostStyles: true }}
        overrides={{
          headerActions: () => <Actions id={props.id} slug={props.slug} canPublish={props.canPublish} onStatus={setStatus} />,
        }}
      />
    </>
  )
}
