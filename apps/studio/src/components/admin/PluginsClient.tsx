'use client'
import React, { useState } from 'react'

import { useAdminT } from '@/lib/use-admin-t'

export type PluginRow = {
  id: string
  name: string
  description: string
  version?: string
  enabled: boolean
  license?: { ok: boolean; expires?: string }
  links: { label: string; href: string }[]
}
type Filter = 'all' | 'enabled' | 'disabled' | 'license'

export const filterPlugins = (plugins: PluginRow[], filter: Filter, query: string) => plugins.filter((plugin) =>
  (filter === 'all' || (filter === 'enabled' ? plugin.enabled : filter === 'disabled' ? !plugin.enabled : plugin.enabled && plugin.license?.ok === false)) &&
  `${plugin.name} ${plugin.id} ${plugin.description}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
)

export const PluginsClient = ({ plugins }: { plugins: PluginRow[] }) => {
  const T = useAdminT()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const rows = filterPlugins(plugins, filter, query)
  const filters: [Filter, string][] = [['all', T('Tất cả')], ['enabled', T('Đang bật')], ['disabled', T('Đã tắt')], ['license', T('Cần kiểm tra giấy phép')]]

  return <>
    <div className="ha-toolbar">
      <div className="ha-filters" role="group" aria-label={T('Lọc tiện ích')}>
        {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
          {label} <span>({filterPlugins(plugins, value, '').length})</span>
        </button>)}
      </div>
      <label className="ha-search">
        <span className="hn-sr">{T('Tìm tiện ích')}</span>
        <input type="search" placeholder={T('Tìm tiện ích…')} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
    </div>
    <p className="ha-result" role="status">{T('{n} tiện ích', { n: rows.length })}</p>
    <div className="ha-table-scroll">
      <table className="ha-plugin-table">
        <caption className="hn-sr">{T('Tiện ích đã cài')}</caption>
        <thead><tr><th scope="col">{T('Tiện ích')}</th><th scope="col">{T('Mô tả')}</th><th scope="col">{T('Trạng thái')}</th></tr></thead>
        <tbody>
          {rows.map((plugin) => <tr key={plugin.id} className={plugin.enabled ? 'is-enabled' : undefined}>
            <td>
              <strong className="ha-plugin-name">{plugin.name}</strong>
              <small>{plugin.version ? `v${plugin.version} · ` : ''}{plugin.id}</small>
              {plugin.enabled && <div className="ha-row-actions">{plugin.links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}</div>}
            </td>
            <td><p>{plugin.description}</p>{!plugin.enabled && <small>{T('Bật tiện ích để mở các chức năng quản lý.')}</small>}</td>
            <td>
              <span className={`ha-status ${plugin.enabled ? 'is-success' : ''}`}>{plugin.enabled ? T('Đang bật') : T('Đã tắt')}</span>
              {plugin.license && <p className={`ha-license${!plugin.license.ok ? ' is-warning' : ''}`}>
                {plugin.license.ok ? T('Giấy phép hợp lệ') : T('Cần kiểm tra giấy phép')}
                {plugin.license.expires && <small>{T('Hết hạn: {date}', { date: plugin.license.expires })}</small>}
              </p>}
            </td>
          </tr>)}
          {!rows.length && <tr><td colSpan={3} className="ha-empty">{T('Không tìm thấy tiện ích phù hợp. Thử từ khóa hoặc bộ lọc khác.')}</td></tr>}
        </tbody>
      </table>
    </div>
    <aside className="ha-note"><strong>{T('Cài thêm hoặc bật/tắt tiện ích')}</strong><p>{T('Liên hệ quản trị hệ thống để cập nhật danh sách tiện ích trong bản triển khai. Cấu hình các tiện ích đang bật bằng liên kết trong bảng.')}</p></aside>
  </>
}
