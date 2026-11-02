'use client'
import React, { useCallback, useEffect, useState } from 'react'
import type { PublishIssue } from '@/lib/publish-checks'

type Item = { key: string; title: string; href: string }
type Issue = PublishIssue & { key: string; locale: string; href: string }
type Release = { id: string | number; title: string; actor: string; action: string; createdAt: string; summary: Item[] }
type Review = { revision: string; items: Item[]; issues: Issue[]; canPublish: boolean; history: Release[] }
const button: React.CSSProperties = { padding: '10px 16px', minHeight: 44, borderRadius: 8, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-50)', color: 'inherit', font: 'inherit', cursor: 'pointer' }
const panel: React.CSSProperties = { padding: 20, border: '1px solid var(--theme-elevation-150)', borderRadius: 12, marginTop: 20 }

export function ReleasesClient({ lang, initialKey }: { lang: 'vi' | 'en'; initialKey?: string }) {
  const text = (vi: string, en: string) => lang === 'en' ? en : vi
  const [review, setReview] = useState<Review | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [restoring, setRestoring] = useState<Release | null>(null)
  const load = useCallback(async (initial = false) => {
    const result = await fetch('/api/site/releases/review', { cache: 'no-store' })
    const data = await result.json()
    if (!result.ok) throw new Error(data.error || String(result.status))
    setReview(data)
    setSelected((current) => initial ? data.items.filter((item: Item) => !initialKey || item.key === initialKey).map((item: Item) => item.key) : current.filter((key) => data.items.some((item: Item) => item.key === key)))
    setAccepted(false)
  }, [initialKey])
  useEffect(() => { let active = true; load(true).catch((failure) => { if (active) setError(String(failure.message)) }); return () => { active = false } }, [load])
  const issues = review?.issues.filter((issue) => selected.includes(issue.key)) ?? []
  const errors = issues.filter((issue) => issue.severity === 'error')
  const warnings = issues.filter((issue) => issue.severity === 'warning')
  const run = async (action: 'publish' | 'restore', id?: string | number) => {
    if (!review || busy) return
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await fetch(`/api/site/releases/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: review.revision, keys: selected, title, acceptWarnings: accepted, id }) })
      const data = await result.json()
      if (!result.ok) {
        if (data.issues) setReview((current) => current && { ...current, issues: data.issues })
        setAccepted(false)
        throw new Error(data.error || String(result.status))
      }
      setRestoring(null); setTitle('')
      setMessage(action === 'publish' ? text('Đã xuất bản các thay đổi đã chọn.', 'Selected changes have been published.') : text('Đã khôi phục trạng thái trước bản phát hành.', 'The state before the release has been restored.'))
      await load()
    } catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)) }
    finally { setBusy(false) }
  }
  const refresh = async () => { setBusy(true); setError(''); try { await load() } catch (failure) { setError(String(failure)) } finally { setBusy(false) } }
  return <div style={{ maxWidth: 1100, paddingBottom: 40 }}>
    <header className="ha-page-head"><div><h1>{text('Xuất bản website', 'Publish website')}</h1><p>{text('Kiểm tra và xuất bản trang, phần dùng chung, header/footer và giao diện cùng lúc.', 'Review and publish pages, reusable content, header/footer and appearance together.')}</p></div></header>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <a style={button} href="/?preview=1" target="_blank" rel="noreferrer">{text('Xem trước toàn bộ bản nháp', 'Preview all drafts')}</a>
      <button style={button} disabled={busy} onClick={refresh}>{text('Kiểm tra lại', 'Review again')}</button>
    </div>
    <p style={{ opacity: 0.75 }}>{text('Xem trước bao gồm tất cả bản nháp đã lưu. Bản phát hành chỉ áp dụng những mục bạn chọn.', 'Preview includes all saved drafts. A release applies only the items you select.')}</p>
    {error && <p role="alert" style={{ color: 'var(--theme-error-500, #b91c1c)', whiteSpace: 'pre-wrap' }}>{error}</p>}
    {message && <p role="status">{message}</p>}
    {!review && !error && <p role="status">{text('Đang tải bản nháp…', 'Loading drafts…')}</p>}
    {review && <>
      <section style={panel} aria-labelledby="release-changes"><h2 id="release-changes">{text('Thay đổi chờ xuất bản', 'Pending changes')} · {review.items.length}</h2>
        {!review.items.length && <p>{text('Các thay đổi đã lưu đều đã được xuất bản.', 'All saved changes have been published.')}</p>}
        {review.items.map((item) => <div key={item.key} style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center', borderBottom: '1px solid var(--theme-elevation-100)' }}>
          <label style={{ flex: 1 }}><input type="checkbox" disabled={busy} checked={selected.includes(item.key)} onChange={(event) => { setAccepted(false); setSelected((current) => event.target.checked ? [...current, item.key] : current.filter((key) => key !== item.key)) }} /> {item.title}</label>
          <a href={item.href}>{text('Chỉnh sửa', 'Edit')}</a>
        </div>)}
      </section>
      {selected.length > 0 && <section style={panel} aria-labelledby="release-checks"><h2 id="release-checks">{text('Kiểm tra trước xuất bản', 'Pre-publish checks')} · {errors.length} {text('lỗi', 'errors')}, {warnings.length} {text('cảnh báo', 'warnings')}</h2>
        <p>{text('Kiểm tra cấu trúc, bố cục theo thiết bị, ảnh, nội dung mẫu, SEO và đường dẫn nội bộ. Liên kết ngoài và nội dung động cần xem thử riêng.', 'Checks cover structure, device layouts, images, sample copy, SEO and internal paths. External links and dynamic content need a separate preview.')}</p>
        {!issues.length && <p>{text('Không phát hiện vấn đề trong các kiểm tra này.', 'No issues found by these checks.')}</p>}
        <ul style={{ paddingLeft: 20 }}>{issues.map((issue, index) => <li key={index} style={{ marginBottom: 12 }}><strong>{issue.severity === 'error' ? text('Lỗi', 'Error') : text('Cảnh báo', 'Warning')}</strong> · {issue.locale}{issue.device ? ' · ' + issue.device : ''}: {issue.message} {issue.path && <code>{issue.path}</code>} <a href={issue.href}>{text('Mở vị trí', 'Open location')}</a></li>)}</ul>
        {warnings.length > 0 && <label style={{ display: 'block', margin: '16px 0' }}><input type="checkbox" checked={accepted} disabled={busy} onChange={(event) => setAccepted(event.target.checked)} /> {text('Tôi đã xem các cảnh báo và muốn xuất bản các mục đã chọn.', 'I reviewed the warnings and want to publish the selected items.')}</label>}
        <label style={{ display: 'block', marginBottom: 16 }}>{text('Tên bản phát hành (tùy chọn)', 'Release name (optional)')}<input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} style={{ display: 'block', width: '100%', maxWidth: 500, padding: 10, marginTop: 6 }} /></label>
        {!review.canPublish && <p>{text('Bạn có thể kiểm tra bản nháp; cần người có quyền xuất bản để áp dụng.', 'You can review drafts; a publisher must apply them.')}</p>}
        <button style={{ ...button, background: 'var(--hosso-brand, #15803d)', color: '#fff' }} disabled={busy || !review.canPublish || errors.length > 0 || (warnings.length > 0 && !accepted)} onClick={() => run('publish')}>{busy ? text('Đang xử lý…', 'Working…') : text(`Xuất bản ${selected.length} mục`, `Publish ${selected.length} items`)}</button>
      </section>}
      <section style={panel} aria-labelledby="release-history"><h2 id="release-history">{text('Lịch sử xuất bản', 'Release history')}</h2>
        {!review.history.length && <p>{text('Chưa có bản phát hành.', 'No releases yet.')}</p>}
        {review.history.map((release) => <article key={release.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--theme-elevation-100)' }}>
          <strong>{release.title}</strong><p>{new Date(release.createdAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} · {release.actor}</p>
          <p>{(release.summary ?? []).map((item) => item.title).join(' · ')}</p>
          {review.canPublish && <button style={button} disabled={busy} onClick={() => setRestoring(release)}>{text('Khôi phục về trước bản này', 'Restore the state before this release')}</button>}
          {restoring?.id === release.id && <div role="group" aria-label={text('Xác nhận khôi phục', 'Confirm restore')} style={{ marginTop: 16 }}><p>{text('Các mục thuộc bản phát hành này sẽ trở về trạng thái trước đó. Bản nháp chưa xuất bản trong cùng phạm vi phải được xử lý trước. Thao tác được ghi lại trong lịch sử.', 'Items in this release will return to their previous state. Unpublished drafts in the same scope must be resolved first. This action is recorded in history.')}</p><button style={button} disabled={busy} onClick={() => run('restore', release.id)}>{text('Xác nhận khôi phục', 'Confirm restore')}</button> <button style={button} disabled={busy} onClick={() => setRestoring(null)}>{text('Hủy', 'Cancel')}</button></div>}
        </article>)}
      </section>
    </>}
  </div>
}
