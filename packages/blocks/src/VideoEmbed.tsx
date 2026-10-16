import React from 'react'

/** Chuyển link YouTube/Vimeo thành địa chỉ nhúng; host khác không được nhúng (chỉ tệp video trực tiếp). */
export function embedUrl(raw: string): string | null {
  try {
    const u = new URL(raw, 'https://x.invalid')
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.match(/^\/(\d+)/)?.[1]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {}
  return null
}

const isFile = (v: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(v) || v.startsWith('/api/media/file/')

/**
 * Video dùng chung cho mọi theme: YouTube/Vimeo (nhúng, tải khi khách cuộn tới) hoặc tệp tải lên (thẻ video).
 * `cls` là tiền tố class của theme (cls-video, cls-video-frame).
 */
export function VideoEmbed({ url, title, caption, cls }: { url?: string; title?: string; caption?: string; cls: string }) {
  if (!url) return null
  const embed = embedUrl(url)
  if (!embed && !isFile(url)) return null
  return (
    <figure className={`${cls}-video`}>
      <div className={`${cls}-video-frame`}>
        {embed ? (
          <iframe src={embed} title={title || 'Video'} loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <video src={url} controls preload="metadata" playsInline aria-label={title || undefined} />
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
