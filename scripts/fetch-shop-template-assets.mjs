// Một lần: lấy ảnh và dữ liệu mẫu từ thanhcuongauto.com (site của chính chủ) vào seed/template-assets/shop/ cho template cửa hàng.
// Chạy: node scripts/fetch-shop-template-assets.mjs. Kết quả (ảnh và catalog.json) được commit; build-shop-template.mjs chỉ đọc thư mục này, không cần mạng.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'seed/template-assets/shop')
fs.mkdirSync(out, { recursive: true })
const BASE = 'https://thanhcuongauto.com'
const UP = `${BASE}/wp-content/uploads/`

const get = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (HossoStudio template fetch)' } })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r
}
const text = async (url) => (await get(url)).text()
const strip = (s) => s.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|li|div|h\d)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&quot;/g, '"').replace(/&#038;/g, '&').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim()
const base = (u) => decodeURIComponent(u.split('/').pop())
const save = async (url, name) => {
  const file = path.join(out, name)
  if (!fs.existsSync(file)) fs.writeFileSync(file, Buffer.from(await (await get(url)).arrayBuffer()))
  return name
}
/** Ưu tiên bản 300x300 của WordPress cho ảnh lớn (nhỏ hơn nhiều); không có thì lấy bản gốc. */
const clean = (h) => strip(h).replace(/^[^>\n]*>\s*/, '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).slice(0, 1500)
const small = async (url, name) => {
  const m = url.match(/^(.*)(\.\w+)$/)
  try {
    return await save(`${m[1]}-300x300${m[2]}`, name)
  } catch {
    return save(url, name)
  }
}
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const home = await text(`${BASE}/`)

// Banner trượt và logo
const banners = []
for (const m of home.matchAll(/<img[^>]+src="([^"]*uploads\/2025\/01\/[^"]+\.webp)"[^>]*>/g)) if (!banners.includes(m[1]) && !/3c116572/.test(m[1])) banners.push(m[1])
const bannerFiles = []
for (const [i, u] of banners.slice(0, 4).entries()) bannerFiles.push(await save(u, `banner-${i + 1}${path.extname(u)}`))
const logo = await save(`${UP}2025/01/3c116572e90713594a16_6a4f47f046684291bfa9620a689a451d.webp`, 'logo.webp')

// Danh mục nổi bật ở trang chủ (ô ảnh lớn kèm tên)
const cats = []
for (const m of home.matchAll(/<div class="product-category[\s\S]*?<div class="box-text/g)) {
  const tag = m[0]
  const src = tag.match(/<img[^>]+src="([^"]+)"/)?.[1]
  const name = strip(tag.match(/<img[^>]+alt="([^"]*)"/)?.[1] ?? '')
  const slug = tag.match(/href="[^"]*\/danh-muc-san-pham\/([^\/"]+)\//)?.[1]
  if (src && name && !cats.some((c) => c.name === name)) cats.push({ name, slug, src: src.replace(/ /g, '%20') })
}
const catOut = []
for (const c of cats) catOut.push({ name: c.name, slug: slugify(c.name), siteSlug: c.slug, image: await small(c.src, `cat-${slugify(c.name)}${path.extname(c.src.split('?')[0])}`) })

// Sản phẩm: các liên kết sản phẩm đầu tiên ở trang chủ (mục Hot), lấy chi tiết từ từng trang
const links = [...new Set([...home.matchAll(/href="(https:\/\/thanhcuongauto\.com\/san-pham\/[^"#?]+\/)"/g)].map((m) => m[1]))].slice(0, 20)
const products = []
for (const [i, u] of links.entries()) {
  const html = await text(u)
  const h1 = strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '').replace(/\n/g, ' ')
  const tail = h1.slice(h1.lastIndexOf(' / ') + 3)
  // Tiêu đề trong h1 bị lặp hai lần ("TÊN TÊN"): lấy một nửa.
  const mid = Math.floor(tail.length / 2)
  const title = tail.slice(0, mid).trim() === tail.slice(mid + 1).trim() ? tail.slice(0, mid).trim() : tail
  const cat = [...(html.match(/class="posted_in"[\s\S]*?<\/span>/)?.[0] ?? '').matchAll(/<a[^>]*>([^<]+)<\/a>/g)].map((m) => strip(m[1]))
  const desc = clean(html.match(/id="tab-description"[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? html.match(/class="product-short-description"[\s\S]*?<\/div>/)?.[0] ?? '')
  const sku = strip(html.match(/class="sku"[^>]*>([^<]+)</)?.[1] ?? '')
  const gallery = [...new Set([...html.matchAll(/data-large_image="([^"]+)"/g)].map((m) => m[1]))].slice(0, 2)
  const images = []
  for (const [k, g] of gallery.entries()) images.push(await small(g, `sp-${i + 1}-${k + 1}${path.extname(g.split('?')[0])}`))
  products.push({ name: title, slug: u.split('/').filter(Boolean).pop().slice(0, 80), sku: sku && sku !== 'N/A' ? sku : '', categories: cat, description: desc, images })
  console.log(`${i + 1}/${links.length}`, title.slice(0, 60))
}

fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify({ logo, banners: bannerFiles, categories: catOut, products }, null, 2))
console.log(`Xong: ${bannerFiles.length} banner, ${catOut.length} danh mục, ${products.length} sản phẩm → ${path.relative(root, out)}`)
