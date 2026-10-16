import React from 'react'
import { t } from './strings.vi'
import type { BlockRenderer } from './types'

export type PostItem = { title: string; slug: string; excerpt?: string; cover?: string; publishedAt?: string }
export type PostListData =
  | { status: 'ok'; items: PostItem[]; page: number; pages: number }
  | { status: 'error' }
  | { status: 'loading' }
  | undefined

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '')

/** Danh sách bài viết (renderer dự phòng của lõi, dùng chung mọi theme; style `ss-*` trong baseCss). */
export const PostList: BlockRenderer = ({ heading, data }) => {
  const d = data as PostListData
  if (!d || d.status === 'loading') return <section className="ss-section"><div className="ss-wrap"><p className="ss-muted">{t('post.loading')}</p></div></section>
  if (d.status === 'error') return null
  return (
    <section className="ss-section">
      <div className="ss-wrap">
        {heading && <h2>{heading}</h2>}
        {d.items.length === 0 ? (
          <p className="ss-muted">{t('post.empty')}</p>
        ) : (
          <ul className="ss-posts">
            {d.items.map((p) => (
              <li key={p.slug} className="ss-post-card">
                {p.cover && (
                  <a href={`/bai-viet/${p.slug}`} tabIndex={-1} aria-hidden="true">
                    <img src={p.cover} alt="" loading="lazy" />
                  </a>
                )}
                <div>
                  {p.publishedAt && <time dateTime={p.publishedAt}>{date(p.publishedAt)}</time>}
                  <h3>
                    <a href={`/bai-viet/${p.slug}`}>{p.title}</a>
                  </h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.pages > 1 && (
          <nav className="ss-pager" aria-label={t('post.pager')}>
            {d.page > 1 && <a href={`?page=${d.page - 1}`}>{t('post.prev')}</a>}
            <span>
              {d.page} / {d.pages}
            </span>
            {d.page < d.pages && <a href={`?page=${d.page + 1}`}>{t('post.next')}</a>}
          </nav>
        )}
      </div>
    </section>
  )
}
