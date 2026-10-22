// Dựng lại các trang tĩnh (trang chủ, giới thiệu, liên hệ, cẩm nang) và footer bằng phần tử của editor Canvas.
// Chạy: node .claude/rebuild-site.js  (đã sao lưu studio.db trước). Chỉ đụng bản tiếng Việt; widget động giữ nguyên.
const { execFileSync } = require('child_process')
const DB = 'C:/Code/Hosso-Studio/apps/studio/data/studio.db'
const q = (sql) => execFileSync('sqlite3', [DB], { input: sql, encoding: 'utf8', maxBuffer: 1 << 26 })
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`

let seq = 0
const id = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`
const E = (type, x, y, w, h, props) => ({ id: id(), type, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), props })
const section = (height, bg, els) => ({ type: 'FreeCanvas', props: { id: `FreeCanvas-${id()}`, height: Math.round(height), ...(bg ? { _bgHex: bg } : {}), _els: els } })

const ACC = '#f5a31a'
const INK = '#111111'
const H = (text, x, y, w, h, size, o = {}) => E('heading', x, y, w, h, { text, level: 2, size, weight: 800, color: INK, align: 'left', ...o })
const T = (text, x, y, w, h, size, o = {}) => E('text', x, y, w, h, { text, size, weight: 400, color: '#374151', align: 'left', lh: 1.55, ...o })
const rule = (x, y, w, c = ACC) => E('shape', x, y, w, 5, { bg: c, radius: 3 })

/** Ước lượng chiều cao khối chữ: số dòng sau khi tự xuống dòng × cỡ chữ × giãn dòng. */
const textH = (text, w, size, lh = 1.55) => {
  const cpl = Math.max(8, Math.floor(w / (size * 0.52)))
  const lines = String(text).split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0)
  return Math.ceil(lines * size * lh) + 8
}
const bullets = (s) => s.split('\n').map((l) => l.replace(/^- /, '• ')).join('\n')

const hero = (title, sub) =>
  section(250, INK, [
    H(title, 100, 70, 1000, 70, 48, { level: 1, color: '#ffffff', align: 'center' }),
    rule(570, 150, 60),
    T(sub, 200, 176, 800, 40, 19, { color: '#d1d5db', align: 'center' }),
  ])

const categories = (heading, items) => {
  const cols = 6, cw = 170, gap = 16, x0 = (1200 - (cols * cw + (cols - 1) * gap)) / 2
  const rowH = 214
  const els = [H(heading, 100, 50, 1000, 50, 32, { align: 'center', weight: 800 }), rule(570, 108, 60)]
  items.forEach((it, i) => {
    const x = x0 + (i % cols) * (cw + gap)
    const y = 150 + Math.floor(i / cols) * rowH
    els.push(E('shape', x, y, cw, 196, { bg: '#ffffff', radius: 14, borderW: 1, borderColor: '#e5e7eb', bshadow: 'sm' }))
    els.push(E('image', x + 20, y + 14, 130, 118, { src: it.image, alt: it.label, href: it.href, fit: 'contain', radius: 8 }))
    els.push(E('button', x + 8, y + 140, cw - 16, 44, { text: it.label, href: it.href, size: 14, weight: 700, color: INK, bg: 'transparent', radius: 0 }))
  })
  return section(150 + Math.ceil(items.length / cols) * rowH + 30, '#ffffff', els)
}

const about = (data, withHeading) => {
  const x = 560, w = 580
  const els = []
  let y = withHeading ? 150 : 70
  if (withHeading) els.push(H('Về chúng tôi', 100, 50, 1000, 50, 32, { align: 'center' }), rule(570, 108, 60))
  const top = y
  els.push(E('image', 60, top, 460, 340, { src: data.image, alt: data.title, radius: 18, fit: 'cover' }))
  for (const s of data.sections) {
    const body = bullets(s.body)
    const hh = 34
    els.push(H(s.heading, x, y, w, hh, 24, { level: 3, color: INK }))
    els.push(rule(x, y + hh + 4, 44))
    const bh = textH(body, w, 16)
    els.push(T(body, x, y + hh + 20, w, bh, 16))
    y += hh + 20 + bh + 22
  }
  return section(Math.max(y, top + 340) + 40, withHeading ? '#f9fafb' : '#ffffff', els)
}

const footer = (s) => {
  const els = []
  els.push(E('image', 80, 70, 220, 80, { src: '/api/media/file/logo-4.webp', alt: s.name, href: '/', fit: 'contain' }))
  els.push(T(s.address, 80, 170, 320, textH(s.address, 320, 15), 15, { color: '#d1d5db' }))
  els.push(H('Chính sách và hỗ trợ', 480, 70, 300, 32, 20, { level: 3, color: '#ffffff' }))
  els.push(rule(480, 110, 44))
  els.push(E('menu', 480, 130, 320, 8 * 36, { items: s.menu, vertical: true, gap: 13, size: 15, weight: 400, color: '#e5e5e5', align: 'left', variant: '' }))
  els.push(H('Liên hệ', 880, 70, 240, 32, 20, { level: 3, color: '#ffffff' }))
  els.push(rule(880, 110, 44))
  els.push(E('icon', 880, 134, 22, 22, { name: 'phone', color: ACC, stroke: 2 }))
  els.push(T(s.phone, 914, 134, 230, 26, 16, { color: '#ffffff', weight: 700 }))
  els.push(E('icon', 880, 180, 22, 22, { name: 'mail', color: ACC, stroke: 2 }))
  els.push(T(s.email, 914, 180, 260, 26, 15, { color: '#d1d5db' }))
  els.push(E('icon', 880, 226, 22, 22, { name: 'message-circle', color: ACC, stroke: 2 }))
  els.push(T(`Zalo: ${s.zalo}`, 914, 226, 230, 26, 15, { color: '#d1d5db' }))
  els.push(E('shape', 80, 420, 1040, 1, { bg: '#2f2f2f' }))
  els.push(T(s.text, 80, 440, 1040, textH(s.text, 1040, 13), 13, { color: '#9ca3af', align: 'center' }))
  return section(440 + textH(s.text, 1040, 13) + 40, '#161616', els)
}

// ---- Đọc dữ liệu hiện có ----
const jget = (sql) => { const r = q(`.mode json\n${sql}`).trim(); return r ? JSON.parse(r) : [] }
const content = (pid) => JSON.parse(jget(`select content from pages_locales where _parent_id=${pid} and _locale='vi'`)[0].content)
const set = jget("select * from site_settings_locales where _locale='vi'")[0]
const base = jget('select contact_phone, contact_email, contact_zalo from site_settings where id=1')[0]

const home = content(2)
const slider = home.content.find((b) => b.type === 'Slider')
const cat = home.content.find((b) => b.type === 'CategoryGrid')
const aboutB = home.content.find((b) => b.type === 'ImageSections')
const grids = home.content.filter((b) => b.type === 'WimProductGrid' || b.type === 'ShopProductGrid')

const pages = {}
// Trang chủ: slider, danh mục, 2 lưới sản phẩm, giới thiệu
pages[2] = { ...home, root: { props: { _float: [] } }, content: [] }
pages[2].content = [slider, categories(cat.props.heading.toUpperCase(), cat.props.items), ...grids, about(aboutB.props, true)]

const gt = content(1)
const gtAbout = gt.content.find((b) => b.type === 'ImageSections')
const gtHero = gt.content.find((b) => b.type === 'Hero')
pages[1] = { ...gt, content: [hero(gtHero.props.title, gtHero.props.subtitle), about(gtAbout.props, false), ...gt.content.filter((b) => b.type !== 'Hero' && b !== gtAbout)] }

for (const pid of [11, 12]) {
  const c = content(pid)
  const h = c.content.find((b) => b.type === 'Hero')
  pages[pid] = { ...c, content: [hero(h.props.title, h.props.subtitle), ...c.content.filter((b) => b.type !== 'Hero')] }
}

const footerData = {
  type: 'x',
  root: { props: {} },
  content: [footer({ name: set.site_name, address: set.contact_address, phone: base.contact_phone, email: base.contact_email, zalo: base.contact_zalo, menu: JSON.parse(set.footer_menu).map((i) => ({ label: i.label, href: i.href })), text: set.footer_text })],
  zones: {},
}
delete footerData.type

// ---- Ghi vào DB (bản đã xuất bản và phiên bản mới nhất, để editor mở ra thấy đúng) ----
let sql = 'begin;\n'
for (const [pid, data] of Object.entries(pages)) {
  const json = lit(JSON.stringify(data))
  sql += `update pages_locales set content=${json} where _parent_id=${pid} and _locale='vi';\n`
  sql += `update _pages_v_locales set version_content=${json} where _locale='vi' and _parent_id=(select id from _pages_v where parent_id=${pid} and latest=1);\n`
}
sql += `update site_areas_locales set site_footer=${lit(JSON.stringify(footerData))} where _locale='vi' and _parent_id=1;\n`
sql += 'commit;\n'
q(sql)
for (const pid of Object.keys(pages)) console.log('đã ghi trang', pid, pages[pid].content.map((b) => b.type).join(', '))
console.log('đã ghi footer')
