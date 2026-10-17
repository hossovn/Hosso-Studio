import config from '@payload-config'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import { HTMLElement, NodeType, parse, type Node } from 'node-html-parser'
import os from 'os'
import path from 'path'
import { getPayload } from 'payload'

import { embedUrl } from '@hosso/studio-blocks'

// pnpm studio:import-wordpress <tệp-xuất-WordPress.xml> [--site-url=https://site-cu.vn] [--locale=vi] [--media] [--dry-run]
//
// Nhập từ tệp xuất của WordPress (Công cụ → Xuất dữ liệu → Tất cả nội dung, định dạng WXR):
//   trang, bài viết, chuyên mục, thẻ, bình luận đã duyệt, ảnh đại diện (cần --media), ảnh trong bài.
// Nội dung HTML được chuyển thành block của Studio (Văn bản, Hình ảnh, Video); không chuyển được thì ghi vào báo cáo.
const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const opt = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
const file = args.find((a) => !a.startsWith('--'))
if (!file) {
  console.error('Cách dùng: pnpm studio:import-wordpress <tệp.xml> [--site-url=https://site-cu.vn] [--locale=vi] [--media] [--dry-run]')
  process.exit(1)
}
const dry = flag('dry-run')
const withMedia = flag('media')
const siteUrl = (opt('site-url') ?? '').replace(/\/$/, '')

const xml = fs.readFileSync(path.resolve(process.env.INIT_CWD || process.cwd(), file), 'utf8')
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  textNodeName: '#text',
  parseTagValue: false,
  isArray: (name) => ['item', 'category', 'wp:postmeta', 'wp:comment', 'wp:category', 'wp:tag'].includes(name),
})
const channel = parser.parse(xml)?.rss?.channel
if (!channel) {
  console.error('Không phải tệp xuất WordPress (WXR) hợp lệ.')
  process.exit(1)
}

const text = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return text(o.__cdata ?? o['#text'] ?? '')
  }
  return String(v)
}
const slugify = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const warnings = new Map<string, number>()
const warn = (msg: string) => warnings.set(msg, (warnings.get(msg) ?? 0) + 1)

const items: any[] = channel.item ?? []
const attachments = new Map<string, string>() // post_id -> url
for (const it of items) if (text(it['wp:post_type']) === 'attachment') attachments.set(text(it['wp:post_id']), text(it['wp:attachment_url']))

const payload = await getPayload({ config })
const locale = (opt('locale') ?? (config as any).localization?.defaultLocale ?? 'vi') as any

// ---------- Media ----------
const mediaCache = new Map<string, string>() // url gốc -> url mới
async function importMedia(url: string): Promise<string | null> {
  if (!url) return null
  if (mediaCache.has(url)) return mediaCache.get(url)!
  if (!withMedia) return null
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const buf = Buffer.from(await res.arrayBuffer())
    const base = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'anh').replace(/[^\w.\-]+/g, '-')
    const exists = await payload.find({ collection: 'media', where: { filename: { equals: base } }, limit: 1, depth: 0 })
    if (exists.docs[0]) {
      const u = `/api/media/file/${encodeURIComponent(base)}`
      mediaCache.set(url, u)
      return u
    }
    const tmp = path.join(os.tmpdir(), base)
    fs.writeFileSync(tmp, buf)
    if (!dry) {
      const doc = await payload.create({ collection: 'media', data: { alt: base.replace(/\.[^.]+$/, '') }, filePath: tmp })
      fs.rmSync(tmp, { force: true })
      const u = `/api/media/file/${encodeURIComponent(doc.filename ?? base)}`
      mediaCache.set(url, u)
      return u
    }
    return null
  } catch (e) {
    warn(`Không tải được ảnh/video: ${url} (${(e as Error).message})`)
    return null
  }
}
const mediaId = async (url: string): Promise<string | number | null> => {
  const u = await importMedia(url)
  if (!u || dry) return null
  const name = decodeURIComponent(u.split('/').pop()!)
  return (await payload.find({ collection: 'media', where: { filename: { equals: name } }, limit: 1, depth: 0 })).docs[0]?.id ?? null
}

// ---------- HTML -> block ----------
type Block = { type: string; props: Record<string, unknown> & { id: string } }
let seq = 0
const id = (type: string) => `${type}-wp${++seq}`

const rewrite = (href: string) => (siteUrl && href.startsWith(siteUrl) ? href.slice(siteUrl.length) || '/' : href)

/** Văn bản có định dạng nhẹ (xem Rich): **đậm**, *nghiêng*, [chữ](liên kết). */
function inlineText(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) return node.text.replace(/\s+/g, ' ')
  if (node.nodeType !== NodeType.ELEMENT_NODE) return ''
  const el = node as HTMLElement
  const inner = el.childNodes.map(inlineText).join('')
  switch (el.tagName.toLowerCase()) {
    case 'strong':
    case 'b':
      return inner.trim() ? `**${inner.trim()}**` : ''
    case 'em':
    case 'i':
      return inner.trim() ? `*${inner.trim()}*` : ''
    case 'a': {
      const href = rewrite(el.getAttribute('href') ?? '')
      return href && inner.trim() ? `[${inner.trim()}](${href})` : inner
    }
    case 'br':
      return '\n'
    case 'script':
    case 'style':
      return ''
    default:
      return inner
  }
}

async function htmlToBlocks(html: string): Promise<Block[]> {
  // Bỏ chú thích khối Gutenberg và shortcode; bài kiểu cổ điển (không có thẻ khối) tách đoạn theo dòng trống.
  let src = html.replace(/<!--[\s\S]*?-->/g, '')
  src = src.replace(/\[(\/?[a-z_]+)[^\]]*\]/gi, (m, name) => {
    warn(`Shortcode không chuyển được: [${String(name).replace('/', '')}]`)
    return ''
  })
  if (!/<(p|div|h[1-6]|ul|ol|figure|table|blockquote)\b/i.test(src)) src = src.split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')

  const blocks: Block[] = []
  let heading = ''
  let paras: string[] = []
  const flush = () => {
    if (heading || paras.length) blocks.push({ type: 'Text', props: { id: id('Text'), heading, body: paras.join('\n\n') } })
    heading = ''
    paras = []
  }
  const pushImage = async (el: HTMLElement, caption = '') => {
    const raw = el.getAttribute('src') ?? el.getAttribute('data-src') ?? ''
    if (!raw) return
    const local = await importMedia(raw)
    flush()
    blocks.push({ type: 'Image', props: { id: id('Image'), src: local ?? raw, alt: el.getAttribute('alt') ?? '', caption } })
    if (!local) warn('Ảnh trong bài vẫn trỏ về site cũ (dùng --media để tải về)')
  }
  const pushVideo = (url: string, title = '') => {
    flush()
    blocks.push({ type: 'Video', props: { id: id('Video'), url, title, caption: '' } })
  }

  async function walk(nodes: Node[]) {
    for (const node of nodes) {
      if (node.nodeType === NodeType.TEXT_NODE) {
        const t = node.text.trim()
        if (t) paras.push(t)
        continue
      }
      if (node.nodeType !== NodeType.ELEMENT_NODE) continue
      const el = node as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (/^h[1-6]$/.test(tag)) {
        flush()
        heading = inlineText(el).replace(/\*\*/g, '').trim()
      } else if (tag === 'img') await pushImage(el)
      else if (tag === 'figure') {
        const img = el.querySelector('img')
        const cap = inlineText(el.querySelector('figcaption') ?? parse('')).trim()
        if (img) await pushImage(img, cap)
        else await walk(el.childNodes)
      } else if (tag === 'iframe') {
        const src = el.getAttribute('src') ?? ''
        if (embedUrl(src)) pushVideo(src, el.getAttribute('title') ?? '')
        else warn(`iframe không chuyển được: ${src.slice(0, 80)}`)
      } else if (tag === 'video') {
        const src = el.getAttribute('src') ?? el.querySelector('source')?.getAttribute('src') ?? ''
        const local = await importMedia(src)
        if (local || src) pushVideo(local ?? src)
      } else if (tag === 'ul' || tag === 'ol') {
        const lines = el.querySelectorAll('li').map((li) => `- ${inlineText(li).replace(/\n/g, ' ').trim()}`)
        if (lines.length) paras.push(lines.join('\n'))
      } else if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
        const imgs = el.querySelectorAll('img')
        const t = inlineText(el).trim()
        const bare = t.replace(/\*\*/g, '')
        if (!imgs.length && /^https?:\/\/\S+$/.test(bare) && embedUrl(bare)) pushVideo(bare)
        else {
          if (t) paras.push(tag === 'blockquote' ? t.split('\n').map((l) => `*${l}*`).join('\n') : t)
          for (const img of imgs) await pushImage(img)
        }
      } else if (tag === 'table') {
        warn('Bảng (table) được chuyển thành văn bản thuần')
        for (const tr of el.querySelectorAll('tr')) paras.push(tr.querySelectorAll('th,td').map((c) => inlineText(c).trim()).join(' | '))
      } else if (['script', 'style', 'hr'].includes(tag)) continue
      else if (['div', 'section', 'article', 'span', 'center', 'main'].includes(tag)) await walk(el.childNodes)
      else {
        const t = inlineText(el).trim()
        if (t) paras.push(t)
        warn(`Thẻ <${tag}> được chuyển thành văn bản`)
      }
    }
  }
  await walk(parse(src).childNodes)
  flush()
  return blocks
}

const content = (blocks: Block[]) => ({ root: { props: {} }, content: blocks })
const plainFromHtml = (html: string) => parse(html).text.replace(/\s+/g, ' ').trim()

// ---------- Chuyên mục và thẻ ----------
const termIds = { category: new Map<string, string | number>(), tag: new Map<string, string | number>() }
async function ensureTerm(kind: 'category' | 'tag', slug: string, name: string) {
  if (termIds[kind].has(slug)) return termIds[kind].get(slug)!
  const collection = kind === 'category' ? 'post-categories' : 'post-tags'
  const found = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })
  let doc = found.docs[0]
  if (!doc && !dry) doc = await payload.create({ collection, data: { name: name || slug, slug }, locale })
  if (doc) termIds[kind].set(slug, doc.id)
  return doc?.id
}
for (const c of channel['wp:category'] ?? []) await ensureTerm('category', text(c['wp:category_nicename']), text(c['wp:cat_name']))
for (const t of channel['wp:tag'] ?? []) await ensureTerm('tag', text(t['wp:tag_slug']), text(t['wp:tag_name']))

// ---------- Trang và bài viết ----------
const byId = new Map<string, any>()
for (const it of items) byId.set(text(it['wp:post_id']), it)
const pageSlug = (it: any): string => {
  const slug = text(it['wp:post_name']) || slugify(text(it.title)) || `trang-${text(it['wp:post_id'])}`
  const parent = byId.get(text(it['wp:post_parent']))
  return parent && text(parent['wp:post_type']) === 'page' ? `${pageSlug(parent)}/${slug}` : slug
}

const stats = { pages: 0, posts: 0, comments: 0, media: 0, terms: termIds.category.size + termIds.tag.size }
const postIdBySlug = new Map<string, string | number>()

for (const it of items) {
  const type = text(it['wp:post_type'])
  if (type !== 'page' && type !== 'post') continue
  const status = text(it['wp:status']) === 'publish' ? 'published' : 'draft'
  if (!['publish', 'draft', 'pending', 'private', 'future'].includes(text(it['wp:status']))) continue
  const title = text(it.title) || '(Không tiêu đề)'
  const slug = type === 'page' ? pageSlug(it) : text(it['wp:post_name']) || slugify(title)
  const blocks = await htmlToBlocks(text(it['content:encoded']))
  const excerpt = plainFromHtml(text(it['excerpt:encoded'])).slice(0, 300) || undefined
  const collection = type === 'page' ? 'pages' : 'posts'

  const data: Record<string, unknown> = { title, slug, content: content(blocks), _status: status }
  if (type === 'page') data.description = excerpt
  else {
    data.excerpt = excerpt
    const date = text(it['wp:post_date_gmt']) || text(it['wp:post_date'])
    if (date && !date.startsWith('0000')) data.publishedAt = new Date(date.replace(' ', 'T') + 'Z').toISOString()
    const cats: (string | number)[] = []
    const tags: (string | number)[] = []
    for (const c of it.category ?? []) {
      const kind = c['@_domain'] === 'category' ? 'category' : c['@_domain'] === 'post_tag' ? 'tag' : null
      if (!kind) continue
      const tid = await ensureTerm(kind, c['@_nicename'] ?? slugify(text(c)), text(c))
      if (tid != null) (kind === 'category' ? cats : tags).push(tid)
    }
    data.categories = cats
    data.tags = tags
    const thumb = (it['wp:postmeta'] ?? []).find((m: any) => text(m['wp:meta_key']) === '_thumbnail_id')
    const thumbUrl = thumb ? attachments.get(text(thumb['wp:meta_value'])) : undefined
    if (thumbUrl) {
      const mid = await mediaId(thumbUrl)
      if (mid != null) data.cover = mid
      else if (!withMedia) warn('Ảnh đại diện bài viết cần --media để tải về')
    }
  }
  if (dry) {
    type === 'page' ? stats.pages++ : stats.posts++
    continue
  }
  const existing = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true, locale })
  const doc = existing.docs[0]
    ? await payload.update({ collection, id: existing.docs[0].id, data: data as any, locale })
    : await payload.create({ collection, data: data as any, locale })
  if (type === 'post') postIdBySlug.set(slug, doc.id)
  type === 'page' ? stats.pages++ : stats.posts++

  // Bình luận đã duyệt của bài viết
  if (type === 'post') {
    for (const c of it['wp:comment'] ?? []) {
      if (text(c['wp:comment_approved']) !== '1' || !['', 'comment'].includes(text(c['wp:comment_type']))) continue
      const body = plainFromHtml(text(c['wp:comment_content'])).slice(0, 2000)
      const author = text(c['wp:comment_author']).slice(0, 80) || 'Khách'
      if (!body) continue
      const dup = await payload.find({ collection: 'comments', where: { and: [{ post: { equals: doc.id } }, { authorName: { equals: author } }, { content: { equals: body } }] }, limit: 1, depth: 0 })
      if (dup.docs[0]) continue
      const email = text(c['wp:comment_author_email'])
      await payload.create({ collection: 'comments', data: { post: doc.id, authorName: author, authorEmail: /@/.test(email) ? email : undefined, content: body, status: 'approved', locale } })
      stats.comments++
    }
  }
}

stats.media = mediaCache.size
console.log(`${dry ? '[chạy thử, không ghi] ' : ''}Đã nhập: ${stats.pages} trang, ${stats.posts} bài viết, ${termIds.category.size} chuyên mục, ${termIds.tag.size} thẻ, ${stats.comments} bình luận, ${stats.media} tệp media.`)
if (warnings.size) {
  console.log('\nCần xem lại:')
  for (const [msg, n] of warnings) console.log(`  - ${msg}${n > 1 ? ` (×${n})` : ''}`)
}
console.log('\nGhi chú: đặt đường dẫn một trang thành "home" nếu muốn dùng làm trang chủ; menu và tiện ích của WordPress không được nhập, hãy dựng lại ở Cài đặt site.')
process.exit(0)
