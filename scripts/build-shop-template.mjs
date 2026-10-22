// Sinh mẫu site bán phụ tùng ô tô (bản sao bố cục thanhcuongauto.com, dữ liệu bán hàng của plugin Cửa hàng, không dùng WIM)
// thành seed/sites/shop-template.hosso-site.zip. Header, footer và các trang là phần tử Canvas + block Slider/Shop*, nên sửa được trong editor.
// Ảnh và catalog lấy trước bằng scripts/fetch-shop-template-assets.mjs vào seed/template-assets/shop/. Chạy: node scripts/build-shop-template.mjs
import fs from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(root, 'seed/template-assets/shop')
const { zipSync, strToU8 } = createRequire(path.join(root, 'apps/studio/package.json'))('fflate')
const catalog = JSON.parse(fs.readFileSync(path.join(ASSETS, 'catalog.json'), 'utf8'))
const policies = JSON.parse(fs.readFileSync(path.join(ASSETS, 'policies.json'), 'utf8'))

const ACC = '#f5a623'
const BLACK = '#000000'
const INK = '#222222'
const SOFT = '#f4f5f4'
const LINE = '#e5e7eb'
const img = (f) => `/api/media/file/${f}`

// ---------- Phần tử Canvas ----------
let seq = 0
const id = () => `t${(seq++).toString(36)}`
const E = (type, x, y, w, h, props) => ({ id: id(), type, x, y, w, h, props })
const H = (text, x, y, w, h, size, o = {}) => E('heading', x, y, w, h, { text, level: 2, size, weight: 700, color: INK, align: 'left', lh: 1.2, ...o })
const T = (text, x, y, w, h, size, o = {}) => E('text', x, y, w, h, { text, size, weight: 400, color: '#374151', align: 'left', lh: 1.55, ...o })
const Btn = (text, href, x, y, w, o = {}) => E('button', x, y, w, 52, { text, href, size: 16, weight: 700, color: INK, bg: ACC, radius: 6, ...o })
const Box = (x, y, w, h, o = {}) => E('shape', x, y, w, h, { bg: '#ffffff', radius: 14, ...o })
const Icon = (name, x, y, s = 24, color = ACC) => E('icon', x, y, s, s, { name, color, stroke: 2 })
const Rule = (x, y, w, c = ACC) => E('shape', x, y, w, 4, { bg: c, radius: 2 })
const Pic = (f, x, y, w, h, o = {}) => E('image', x, y, w, h, { src: img(f), alt: '', fit: 'cover', radius: 0, ...o })
const section = (height, bg, els) => ({ type: 'FreeCanvas', props: { id: `FreeCanvas-${id()}`, height, ...(bg ? { _bgHex: bg } : {}), _els: els } })
const block = (type, props) => ({ type, props: { id: `${type}-${id()}`, ...props } })
const textH = (text, w, size, lh = 1.55) => {
  const cpl = Math.max(8, Math.floor(w / (size * 0.52)))
  return Math.ceil(String(text).split('\n').reduce((n, p) => n + Math.max(1, Math.ceil(p.length / cpl)), 0) * size * lh) + 8
}
const doc = (content) => ({ root: { props: {} }, content, zones: {} })
const decode = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&')

// ---------- Thông tin site ----------
const BRAND = 'Thanh Cường Auto Parts & Service'
const CONTACT = { phone: '0932 857 889', email: 'phutungotothanhcuong@gmail.com', address: '161 Hà Huy Giáp, P. Thạnh Lộc, Q.12, TP. Hồ Chí Minh', zalo: '0902763181' }
const LEGAL = 'CÔNG TY TNHH CƠ KHÍ Ô TÔ THANH CƯỜNG\nGPKD số 0315919580 cấp ngày 24/09/2019 tại Sở Kế hoạch và Đầu tư TP.HCM'
const COPYRIGHT = `© 2025 ${BRAND}. CÔNG TY TNHH CƠ KHÍ Ô TÔ THANH CƯỜNG, GPKD số 0315919580 cấp ngày 24/09/2019 tại Sở Kế hoạch và Đầu tư TP.HCM.`
const POLICY_LINKS = [
  { label: 'Chính sách đổi trả', href: '/chinh-sach-doi-tra-hang' },
  { label: 'Chính sách bảo mật', href: '/chinh-sach-bao-mat' },
  { label: 'Phương thức thanh toán', href: '/phuong-thuc-thanh-toan' },
  { label: 'Chính sách kiểm hàng', href: '/chinh-sach-kiem-hang' },
  { label: 'Chính sách giao hàng', href: '/chinh-sach-giao-hang' },
]
// Khung Facebook Page Plugin của site gốc; đổi href thành fanpage của bạn.
const FANPAGE = 'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FTHANHCUONGAUTO&tabs&width=210&height=180&small_facepile=false&adapt_container_width=true&hide_cover=false&show_facepile=false'
const PERKS = [['headset', 'Hỗ trợ 24/24'], ['truck', 'Giao toàn quốc'], ['shield-check', 'Chính hãng'], ['heart', 'Tận tâm phục vụ']]

// ---------- Media ----------
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
const media = []
const files = {}
const addMedia = (filename, alt) => {
  if (media.some((m) => m.filename === filename)) return
  media.push({ filename, alt, mimeType: MIME[path.extname(filename).toLowerCase()] })
  files[`media/${filename}`] = new Uint8Array(fs.readFileSync(path.join(ASSETS, filename)))
}
addMedia(catalog.logo, BRAND)
catalog.banners.forEach((b, i) => addMedia(b, `Banner ${i + 1}`))
catalog.categories.forEach((c) => addMedia(c.image, c.name))
catalog.products.forEach((p) => p.images.forEach((f) => addMedia(f, decode(p.name))))

// ---------- Danh mục, sản phẩm (dữ liệu của plugin Cửa hàng) ----------
const CATS = catalog.categories.map((c) => ({ ...c, name: c.name === 'DÂY CÁP ĐIỀU KHIỂN' ? 'Dây cáp điều khiển' : c.name }))
// Mỗi sản phẩm thuộc một danh mục nổi bật của trang chủ (tên trùng một trong hai nhãn của site gốc).
const catOf = (labels) => CATS.find((c) => labels.some((l) => l.toLowerCase() === c.name.toLowerCase())) ?? CATS[0]
const MAKES = ['kia', 'hyundai', 'toyota', 'honda', 'suzuki', 'nissan', 'mazda', 'ford', 'mitsubishi', 'chevrolet', 'vinfast', 'thaco']
const PRODUCTS = catalog.products.map((p, i) => {
  const name = decode(p.name).replace(/\s+/g, ' ').trim()
  return {
    code: p.sku || `PT${String(i + 1).padStart(3, '0')}`,
    name,
    slug: p.slug.replace(/-+$/, ''),
    active: true,
    price: 0,
    priceDisplay: 'hide',
    stock: 100,
    makes: MAKES.filter((m) => name.toLowerCase().includes(m)),
    description: decode(p.description),
    category: catOf(p.categories).slug,
    images: p.images,
  }
})

const MAKE_LINKS = ['KIA', 'HYUNDAI', 'TOYOTA', 'HONDA', 'SUZUKI', 'NISSAN', 'MAZDA', 'FORD', 'MITSUBISHI'].map((m) => ({ label: m, href: `/san-pham?make=${m.toLowerCase()}` }))
const CAT_LINKS = CATS.map((c) => ({ label: c.name, href: `/san-pham?category=${c.slug}` }))
// Menu thả xuống: mục có children mở danh sách con khi rê chuột (phần tử menu của Canvas).
const MENU = [
  { label: 'TRANG CHỦ', href: '/' },
  { label: 'PHỤ TÙNG THEO HÃNG', href: '/san-pham', children: MAKE_LINKS },
  { label: 'PHỤ TÙNG THEO CHỨC NĂNG', href: '/san-pham', children: CAT_LINKS },
  { label: 'LIÊN HỆ', href: '/lien-he' },
  { label: 'THÔNG TIN', href: '/gioi-thieu', children: [...POLICY_LINKS, { label: 'Giới thiệu', href: '/gioi-thieu' }] },
]

// ---------- Header, footer ----------
const siteHeader = doc([
  section(34, '#ffffff', [T('Ship COD toàn quốc', 100, 6, 1000, 22, 13, { color: INK, align: 'center', weight: 600 })]),
  section(84, BLACK, [
    E('image', 60, 14, 200, 57, { src: img(catalog.logo), alt: BRAND, href: '/', fit: 'contain' }),
    E('menu', 290, 22, 760, 42, { items: MENU, size: 14, weight: 700, color: '#ffffff', gap: 28, vertical: false, align: 'left', variant: 'underline', accent: ACC, active: 0 }),
    Btn('Tìm kiếm', '/san-pham', 1060, 16, 100, { bg: 'transparent', color: '#ffffff', borderW: 1, borderColor: '#525252', size: 14 }),
  ]),
  section(72, '#ffffff', [
    E('shape', 60, 10, 280, 52, { bg: ACC, radius: 6 }),
    E('menu', 60, 10, 280, 52, { items: [{ label: '☰  Danh mục sản phẩm', href: '/san-pham', children: CAT_LINKS }], size: 15, weight: 700, color: INK, gap: 0, vertical: false, align: 'center', variant: '' }),
    ...PERKS.flatMap(([icon, text], i) => {
      const x = 400 + i * 190
      return [E('shape', x, 16, 40, 40, { bg: ACC, radius: 999 }), Icon(icon, x + 9, 25, 22, '#ffffff'), T(text, x + 52, 24, 130, 24, 14, { color: INK, weight: 600 })]
    }),
    E('shape', 0, 71, 1200, 1, { bg: LINE }),
  ]),
])

const colTitle = (t, x) => [H(t, x, 56, 300, 30, 18, { level: 3, weight: 700 }), Rule(x, 92, 44)]
const siteFooter = doc([
  section(420, '#ffffff', [
    ...colTitle('Giới thiệu', 60),
    H(BRAND, 60, 112, 280, 52, 16, { level: 3, weight: 700 }),
    T(LEGAL, 60, 174, 280, 100, 14),
    T(CONTACT.email, 60, 284, 280, 22, 14, { color: INK }),
    ...colTitle('Liên kết', 380),
    E('menu', 380, 112, 240, 190, { items: POLICY_LINKS, vertical: true, gap: 12, size: 15, weight: 400, color: '#374151', align: 'left', variant: '' }),
    ...colTitle('Thông tin liên hệ', 660),
    Icon('map-pin', 660, 114, 20), T(CONTACT.address, 690, 112, 220, 70, 15, { color: INK }),
    Icon('phone', 660, 194, 20), T(`${CONTACT.phone}
0902 763 181`, 690, 192, 220, 50, 15, { color: INK, weight: 700 }),
    Icon('message-circle', 660, 258, 20), T(`Zalo: ${CONTACT.zalo}`, 690, 256, 220, 24, 15, { color: INK }),
    ...colTitle('Fanpage', 930),
    E('embed', 930, 112, 210, 180, { url: FANPAGE }),
    E('shape', 60, 350, 1080, 1, { bg: LINE }),
    T(COPYRIGHT, 60, 366, 1080, 44, 13, { color: '#6b7280', align: 'center' }),
  ]),
])
const beforeFooter = doc([block('Form', { heading: 'Đăng kí nhận tin', form: 'ban-tin' })])

// ---------- Trang ----------
const pageBanner = (title, sub) =>
  section(sub ? 210 : 170, BLACK, [
    H(title, 100, 50, 1000, 60, 42, { level: 1, color: '#ffffff', align: 'center', weight: 700 }),
    Rule(570, 124, 60),
    ...(sub ? [T(sub, 200, 148, 800, 36, 18, { color: '#d1d5db', align: 'center' })] : []),
  ])

const sectionTitle = (t) => [H(t, 100, 44, 1000, 50, 34, { align: 'center' }), Rule(570, 100, 60)]

const categories = () => {
  const cols = 6, cw = 170, gap = 16, x0 = (1200 - (cols * cw + (cols - 1) * gap)) / 2, rowH = 232
  const els = sectionTitle('DANH MỤC SẢN PHẨM')
  CATS.forEach((c, i) => {
    const x = x0 + (i % cols) * (cw + gap)
    const y = 140 + Math.floor(i / cols) * rowH
    const href = `/san-pham?category=${c.slug}`
    els.push(Box(x, y, cw, 212, { borderW: 1, borderColor: LINE, bshadow: 'sm' }))
    els.push(E('image', x + 15, y + 12, 140, 140, { src: img(c.image), alt: c.name, href, fit: 'contain', radius: 6 }))
    els.push(E('button', x + 6, y + 158, cw - 12, 44, { text: c.name, href, size: 14, weight: 700, color: INK, bg: 'transparent', radius: 0, lh: 1.25 }))
  })
  const y = 140 + Math.ceil(CATS.length / cols) * rowH
  els.push(Btn('Xem thêm', '/san-pham', 500, y, 200))
  return section(y + 52 + 44, '#ffffff', els)
}

const ABOUT = [
  ['GIỚI THIỆU', `${BRAND.toUpperCase()} là một trong những nhà bán lẻ hàng đầu về phụ tùng và dịch vụ ô tô tại Thành phố Hồ Chí Minh.\n\nTại đây, chúng tôi tập trung xây dựng dịch vụ khách hàng khác biệt với chất lượng vượt trội, phù hợp với văn hoá đặt khách hàng làm trung tâm trong mọi suy nghĩ và hành động của công ty.`],
  ['TẦM NHÌN', `${BRAND.toUpperCase()} trở thành nơi mang đến trải nghiệm mua sắm phụ tùng và dịch vụ bảo trì, chăm sóc, sửa chữa ô tô hoàn toàn mới lạ và hài lòng nhất.\n\nLiên tục cải tiến mang đến cho khách hàng trải nghiệm thú vị và hài lòng nhất dựa trên nền tảng văn hóa đặt khách hàng làm trọng tâm.`],
  ['CAM KẾT', '• Đặt khách hàng làm trung tâm trong mọi suy nghĩ và hành động.\n• Mang đến cho nhân viên một môi trường làm việc tôn trọng và công bằng.\n• Mang đến cho đối tác sự tôn trọng.\n• Mang đến cho nhà đầu tư giá trị doanh nghiệp gia tăng không ngừng.\n• Đóng góp cho cộng đồng thông qua việc tạo nhiều việc làm và đóng đầy đủ thuế cho ngân sách nhà nước.'],
  ['GIÁ TRỊ CỐT LÕI CỦA NHÂN VIÊN', '• Tận tâm với khách hàng\n• Làm đúng cam kết và nhận trách nhiệm\n• Yêu thương và hỗ trợ đồng đội\n• Trung thực về tiền bạc và các mối quan hệ\n• Máu lửa trong công việc'],
]
const about = (withTitle) => {
  const els = withTitle ? sectionTitle('VỀ CHÚNG TÔI') : []
  const w = 520, top = withTitle ? 140 : 60
  const heights = ABOUT.map(([, body]) => 64 + textH(body, w - 48, 15) + 24)
  const rows = [[0, 1], [2, 3]]
  let y = top
  for (const row of rows) {
    const rh = Math.max(...row.map((k) => heights[k]))
    row.forEach((k, c) => {
      const x = 60 + c * (w + 40)
      els.push(Box(x, y, w, rh, { borderW: 1, borderColor: LINE }))
      els.push(H(ABOUT[k][0], x + 24, y + 22, w - 48, 28, 18, { level: 3 }), Rule(x + 24, y + 54, 44))
      els.push(T(ABOUT[k][1], x + 24, y + 70, w - 48, textH(ABOUT[k][1], w - 48, 15), 15))
    })
    y += rh + 24
  }
  return section(y + 30, SOFT, els)
}

const grid = (heading, over = {}) => block('ShopProductGrid', { heading, pageSize: 10, category: '', brand: '', sort: 'new', detailPath: '/chi-tiet', pager: 'no', layout: 'grid', columns: 5, cardStyle: 'vertical', imageRatio: 'square', showCode: 'no', showBrand: 'no', ...over })

const home = [
  block('Slider', { seconds: 5, slides: catalog.banners.map((b, i) => ({ image: img(b), href: '/san-pham', alt: `Banner ${i + 1}` })) }),
  categories(),
  grid('SẢN PHẨM HOT'),
  section(260, '#ffffff', [Pic(catalog.banners[1], 60, 20, 1080, 220, { href: '/san-pham', alt: 'Ưu đãi', radius: 12 })]),
  grid('SẢN PHẨM BÁN CHẠY', { sort: 'priceAsc' }),
  about(true),
]

const aboutPage = [pageBanner('Giới thiệu', BRAND), about(false)]

const contactPage = [
  pageBanner('Liên hệ', 'Gửi yêu cầu, chúng tôi phản hồi nhanh'),
  section(380, '#ffffff', [
    H('Thông tin liên hệ', 100, 60, 460, 40, 28),
    Rule(100, 108, 44),
    Icon('map-pin', 100, 140, 24), T(CONTACT.address, 140, 138, 420, 50, 17, { color: INK }),
    Icon('phone', 100, 208, 24), T(`${CONTACT.phone}  ·  0902 763 181`, 140, 208, 420, 28, 17, { color: INK, weight: 700 }),
    Icon('mail', 100, 258, 24), T(CONTACT.email, 140, 258, 420, 28, 17, { color: INK }),
    Icon('message-circle', 100, 308, 24), T(`Zalo: ${CONTACT.zalo}`, 140, 308, 420, 28, 17, { color: INK }),
    E('map', 620, 60, 480, 290, { query: CONTACT.address, zoom: 15, radius: 12 }),
  ]),
  block('Form', { heading: 'Gửi yêu cầu tư vấn', form: 'lien-he' }),
]

const shopPage = (title, sub, ...blocks) => [pageBanner(title, sub), ...blocks]
const PAGES = {
  home: ['Trang chủ', 'Phụ tùng ô tô chính hãng và thay thế, giao hàng toàn quốc.', home],
  'san-pham': ['Cửa hàng', 'Tất cả phụ tùng', shopPage('Phụ tùng ô tô', 'Chọn danh mục hoặc tìm theo tên, mã sản phẩm', block('ShopCategories', { heading: 'Danh mục sản phẩm', parent: '', listPath: '/san-pham' }), grid('Tất cả sản phẩm', { pageSize: 15, pager: 'yes', showBrand: 'yes', showCode: 'yes' }))],
  'chi-tiet': ['Chi tiết sản phẩm', '', [block('ShopProductDetail', { backPath: '/san-pham', cartPath: '/gio-hang' })]],
  'gio-hang': ['Giỏ hàng', '', shopPage('Giỏ hàng', '', block('ShopCart', { heading: 'Giỏ hàng của bạn', checkoutPath: '/thanh-toan', shopPath: '/san-pham' }))],
  'thanh-toan': ['Thanh toán', '', shopPage('Thanh toán', '', block('ShopCheckout', { heading: 'Thông tin đặt hàng', statusPath: '/trang-thai-don', cartPath: '/gio-hang' }))],
  'trang-thai-don': ['Tra cứu đơn hàng', '', shopPage('Tra cứu đơn hàng', '', block('ShopOrderStatus', { heading: 'Tra cứu đơn hàng' }))],
  'gioi-thieu': ['Giới thiệu', BRAND, aboutPage],
  'lien-he': ['Liên hệ', 'Thông tin liên hệ cửa hàng.', contactPage],
  ...Object.fromEntries(Object.entries(policies).map(([slug, p]) => [slug, [p.title, p.title, [pageBanner(p.title, ''), ...p.content]]])),
}

const pages = Object.entries(PAGES).map(([slug, [title, description, content]]) => ({
  slug,
  status: 'published',
  seo: { noindex: false, image: null },
  translations: { vi: { title, description, content: doc(content) } },
}))

const field = (name, type, label, required, extra = {}) => ({ name, type, required, translations: { vi: { label, ...extra } } })
const forms = [
  {
    slug: 'lien-he',
    fields: [
      field('ho_va_ten', 'text', 'Họ và tên', true),
      field('so_dien_thoai', 'tel', 'Số điện thoại', true),
      field('nhu_cau', 'select', 'Nhu cầu', false, { options: 'Mua phụ tùng, Báo giá, Bảo hành, Khác' }),
      field('noi_dung', 'textarea', 'Nội dung', false, { placeholder: 'Mô tả phụ tùng hoặc dòng xe của bạn' }),
    ],
    translations: { vi: { title: 'Liên hệ tư vấn', submitLabel: 'Gửi yêu cầu', successMessage: 'Cảm ơn bạn! Nhân viên sẽ gọi lại trong giờ làm việc.' } },
  },
  {
    slug: 'ban-tin',
    fields: [field('email', 'email', 'Email của bạn', true, { placeholder: 'ten@email.com' })],
    translations: { vi: { title: 'Đăng kí nhận tin', submitLabel: 'Đăng kí', successMessage: 'Đã đăng kí. Cảm ơn bạn!' } },
  },
]

const settings = {
  shared: { logo: { filename: catalog.logo }, favicon: { filename: catalog.logo }, showSearch: true, contact: CONTACT, notifications: { to: null, onForm: true, onComment: true }, theme: 'auto' },
  translations: { vi: { siteName: BRAND, announcement: '', footerText: COPYRIGHT, headerMenu: MENU.map((m) => ({ ...m, label: m.label[0] + m.label.slice(1).toLowerCase() })), footerMenu: POLICY_LINKS, social: [], contact: CONTACT } },
}

const json = (v) => strToU8(JSON.stringify(v, null, 2))
Object.assign(files, {
  'manifest.json': json({ format: 2, product: 'Hosso Studio', exportedAt: new Date().toISOString(), locales: ['vi'], themes: ['auto@0.1.0'], plugins: ['shop'], counts: { pages: pages.length, posts: 0, media: media.length }, secretsOmitted: [] }),
  'data/pages.json': json(pages),
  'data/posts.json': json([]),
  'data/terms.json': json({ categories: [], tags: [] }),
  'data/forms.json': json(forms),
  'data/reusable-blocks.json': json([]),
  'data/redirects.json': json([]),
  'data/site-areas.json': json({ translations: { vi: { siteHeader, siteFooter, beforeFooter } } }),
  'data/site-settings.json': json(settings),
  // Site gốc ẩn giá, chỉ hiện chữ liên hệ; bật lại ở Admin → Cửa hàng → Cài đặt.
  'data/plugins/shop-settings.json': json({ showPrices: false, priceHiddenLabel: 'Liên hệ để biết giá' }),
  'data/plugins/shop-catalog.json': json({ categories: CATS.map((c, i) => ({ name: c.name, slug: c.slug, order: i, image: c.image })), products: PRODUCTS }),
  'data/media.json': json(media),
})

const out = path.join(root, 'seed/sites/shop-template.hosso-site.zip')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, zipSync(files, { level: 6 }))
console.log(`Đã ghi ${path.relative(root, out)}: ${pages.length} trang, ${PRODUCTS.length} sản phẩm, ${media.length} ảnh, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB`)
