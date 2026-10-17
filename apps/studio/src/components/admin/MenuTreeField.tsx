'use client'
import { useField } from '@payloadcms/ui'
import React, { useEffect, useRef, useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'

type Node = { id?: string; label: string; href: string; children?: Node[] }
type Props = { path: string; field?: { label?: unknown }; maxDepth?: number }

const uid = () => Math.random().toString(36).slice(2, 10)
const box: React.CSSProperties = { border: '1px solid var(--theme-elevation-150)', borderRadius: 6, background: 'var(--theme-elevation-50)' }
const input: React.CSSProperties = { padding: '5px 8px', borderRadius: 4, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-input-bg)', color: 'inherit', font: 'inherit', minWidth: 0 }
const mini: React.CSSProperties = { border: '1px solid var(--theme-elevation-200)', background: 'transparent', color: 'inherit', borderRadius: 4, width: 28, height: 28, cursor: 'pointer', lineHeight: 1 }

const clone = (list: Node[]): Node[] => list.map((n) => ({ ...n, children: n.children ? clone(n.children) : undefined }))

/**
 * Trình sửa menu dạng cây: kéo thả để đổi thứ tự/thụt vào làm menu con, nút ↑ ↓ → ← cho bàn phím, thêm nhanh từ danh sách trang.
 * Lưu dưới dạng JSON [{label, href, children?}] theo từng ngôn ngữ (đổi ngôn ngữ ở góc trên để sửa bản dịch).
 */
export const MenuTreeField = ({ path, field, maxDepth = 2 }: Props) => {
  const T = useAdminT()
  const { value, setValue } = useField<Node[] | null>({ path })
  const tree: Node[] = Array.isArray(value) ? value : []
  const [pages, setPages] = useState<{ title: string; slug: string }[]>([])
  const drag = useRef<{ at: number[] } | null>(null)
  const [over, setOver] = useState('')

  useEffect(() => {
    fetch('/api/pages?limit=200&depth=0&select[title]=true&select[slug]=true', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setPages((j.docs ?? []).map((d: { title: string; slug: string }) => ({ title: d.title, slug: d.slug }))))
      .catch(() => {})
  }, [])

  const commit = (next: Node[]) => setValue(next)
  const listAt = (root: Node[], at: number[]) => {
    let list = root
    for (const i of at) list = list[i].children ??= []
    return list
  }
  const edit = (at: number[], patch: Partial<Node>) => {
    const next = clone(tree)
    const parent = listAt(next, at.slice(0, -1))
    parent[at[at.length - 1]] = { ...parent[at[at.length - 1]], ...patch }
    commit(next)
  }
  const remove = (at: number[]) => {
    const next = clone(tree)
    listAt(next, at.slice(0, -1)).splice(at[at.length - 1], 1)
    commit(clean(next))
  }
  const clean = (n: Node[]): Node[] => n.map((x) => ({ ...x, children: x.children?.length ? clean(x.children) : undefined }))

  // Chuyển một mục tới vị trí mới: toParent = đường dẫn của danh sách đích ([] = gốc), index = chèn trước vị trí này (tính trên cây hiện tại).
  // Chèn bản sao vào đích trước rồi mới xóa bản gốc (đã đánh dấu) nên chỉ số không bị lệch.
  const move = (from: number[], toParent: number[], index: number) => {
    if (toParent.length >= from.length && from.every((v, i) => toParent[i] === v)) return // thả vào chính nó/con của nó
    const next = clone(tree)
    const orig = listAt(next, from.slice(0, -1))[from[from.length - 1]]
    if (toParent.length + depthOf(orig) > maxDepth) return
    ;(orig as Node & { _del?: boolean })._del = true
    const copy: Node = { ...orig, children: orig.children ? clone(orig.children) : undefined }
    delete (copy as Node & { _del?: boolean })._del
    listAt(next, toParent).splice(index, 0, copy)
    const drop = (list: Node[]): Node[] => list.filter((n) => !(n as Node & { _del?: boolean })._del).map((n) => ({ ...n, children: n.children ? drop(n.children) : undefined }))
    commit(clean(drop(next)))
  }
  const depthOf = (n: Node): number => 1 + Math.max(0, ...(n.children ?? []).map(depthOf))

  const add = (label = '', href = '') => commit([...clone(tree), { id: uid(), label, href }])

  const DropZone = ({ parent, index }: { parent: number[]; index: number }) => {
    const key = `${parent.join('.')}:${index}`
    return (
      <div
        onDragOver={(e) => {
          if (drag.current) {
            e.preventDefault()
            setOver(key)
          }
        }}
        onDragLeave={() => setOver('')}
        onDrop={(e) => {
          e.preventDefault()
          setOver('')
          if (drag.current) move(drag.current.at, parent, index)
          drag.current = null
        }}
        style={{ height: over === key ? 22 : 6, background: over === key ? 'var(--hosso-brand)' : 'transparent', borderRadius: 3, transition: 'height .1s', opacity: over === key ? 0.5 : 1 }}
      />
    )
  }

  const Row = ({ node, at }: { node: Node; at: number[] }) => {
    const i = at[at.length - 1]
    const parent = at.slice(0, -1)
    const sibs = listAt(clone(tree), parent)
    return (
      <div>
        <div
          draggable
          onDragStart={(e) => {
            drag.current = { at }
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            drag.current = null
            setOver('')
          }}
          style={{ ...box, padding: 6, display: 'flex', gap: 6, alignItems: 'center', background: 'var(--theme-bg)' }}
        >
          <span title={T('Kéo để di chuyển')} aria-hidden="true" style={{ cursor: 'grab', opacity: 0.6, padding: '0 4px' }}>
            ⠿
          </span>
          <input style={{ ...input, flex: '1 1 140px' }} value={node.label} placeholder={T('Tên hiển thị')} aria-label={T('Tên hiển thị')} onChange={(e) => edit(at, { label: e.target.value })} />
          <input style={{ ...input, flex: '1 1 160px' }} value={node.href} placeholder={T('/duong-dan hoặc https://…')} aria-label={T('Đường dẫn')} onChange={(e) => edit(at, { href: e.target.value })} />
          <button type="button" style={mini} title={T('Lên')} aria-label={T('Lên')} disabled={i === 0} onClick={() => move(at, parent, i - 1)}>
            ↑
          </button>
          <button type="button" style={mini} title={T('Xuống')} aria-label={T('Xuống')} disabled={i >= sibs.length - 1} onClick={() => move(at, parent, i + 2)}>
            ↓
          </button>
          {maxDepth > 1 && at.length === 1 && (
            <button type="button" style={mini} title={T('Thụt vào làm menu con của mục trên')} aria-label={T('Thụt vào')} disabled={i === 0 || (node.children?.length ?? 0) > 0} onClick={() => move(at, [i - 1], (tree[i - 1].children ?? []).length)}>
              →
            </button>
          )}
          {at.length > 1 && (
            <button type="button" style={mini} title={T('Đưa ra thành mục chính')} aria-label={T('Đưa ra')} onClick={() => move(at, [], at[0] + 1)}>
              ←
            </button>
          )}
          <button type="button" style={{ ...mini, color: '#d63638' }} title={T('Xóa')} aria-label={T('Xóa')} onClick={() => remove(at)}>
            ✕
          </button>
        </div>
        {(node.children?.length ?? 0) > 0 && (
          <div style={{ marginLeft: 28, borderLeft: '2px solid var(--theme-elevation-150)', paddingLeft: 8 }}>
            <List list={node.children!} parent={at} />
          </div>
        )}
        {maxDepth > 1 && at.length === 1 && (node.children?.length ?? 0) === 0 && (
          <div style={{ marginLeft: 28 }}>
            <DropZone parent={at} index={0} />
          </div>
        )}
      </div>
    )
  }

  const List = ({ list, parent }: { list: Node[]; parent: number[] }) => (
    <div>
      <DropZone parent={parent} index={0} />
      {list.map((n, i) => (
        <React.Fragment key={n.id ?? `${i}-${n.href}`}>
          <Row node={n} at={[...parent, i]} />
          <DropZone parent={parent} index={i + 1} />
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>{typeof field?.label === 'string' ? field.label : T('Menu')}</label>
      {tree.length === 0 && <p style={{ opacity: 0.7, margin: '0 0 8px' }}>{T('Chưa có mục nào. Thêm trang bên dưới hoặc tạo mục tùy ý.')}</p>}
      <List list={tree} parent={[]} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <select
          style={input}
          value=""
          aria-label={T('Thêm trang vào menu')}
          onChange={(e) => {
            const p = pages.find((x) => x.slug === e.target.value)
            if (p) add(p.title, p.slug === 'home' ? '/' : `/${p.slug}`)
          }}
        >
          <option value="">{T('+ Thêm trang…')}</option>
          {pages.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
        <button type="button" style={{ ...input, cursor: 'pointer' }} onClick={() => add()}>
          {T('+ Liên kết tùy ý')}
        </button>
      </div>
      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
        {T('Kéo thả (⠿) hoặc dùng ↑ ↓ → ← để sắp xếp')}
        {maxDepth > 1 ? ` ${T('và tạo menu con (tối đa 2 cấp)')}` : ''}. {T('Nhớ bấm Lưu. Bản dịch: đổi ngôn ngữ ở góc trên rồi sửa tên hiển thị.')}
      </p>
    </div>
  )
}
