import { makeElement, type FreeElement } from '@hosso/studio-blocks'

/** Mẫu section (kiểu Webcake "Phần → Mẫu"): một canvas có sẵn chiều cao, nền và các phần tử đã bố trí; chèn xong vẫn kéo thả sửa tự do. */
export type SectionTemplate = { id: string; label: string; height: number; bg?: string; build: () => FreeElement[] }

const H = (text: string, over: { x: number; y: number; w: number; h: number; size: number; color?: string; align?: string; level?: number }): FreeElement =>
  makeElement('heading', { x: over.x, y: over.y, w: over.w, h: over.h, props: { text, size: over.size, color: over.color ?? '#111827', align: over.align ?? 'left', level: over.level ?? 2, weight: 700 } })
const P = (text: string, over: { x: number; y: number; w: number; h: number; size?: number; color?: string; align?: string }): FreeElement =>
  makeElement('text', { x: over.x, y: over.y, w: over.w, h: over.h, props: { text, size: over.size ?? 18, color: over.color ?? '#4b5563', align: over.align ?? 'left' } })
const Btn = (text: string, x: number, y: number, props: Record<string, unknown> = {}): FreeElement => makeElement('button', { x, y, w: 200, h: 56, props: { text, ...props } })

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'hero',
    label: 'Banner đầu trang',
    height: 560,
    bg: '#111827',
    build: () => [
      H('Tiêu đề thật ấn tượng cho trang của bạn', { x: 100, y: 140, w: 600, h: 150, size: 54, color: '#ffffff', level: 1 }),
      P('Mô tả ngắn gọn về điều bạn cung cấp và vì sao khách hàng nên chọn bạn.', { x: 100, y: 310, w: 520, h: 80, size: 20, color: '#d1d5db' }),
      Btn('Liên hệ ngay', 100, 420),
      makeElement('image', { x: 780, y: 100, w: 320, h: 360, props: { src: '/editor-demo/mountain.jpg', alt: 'Dãy núi dưới ánh nắng', radius: 24 } }),
    ],
  },
  {
    id: 'intro',
    label: 'Giới thiệu, ảnh và chữ',
    height: 480,
    build: () => [
      makeElement('image', { x: 100, y: 80, w: 480, h: 320, props: { src: '/editor-templates/workspace.jpg', alt: 'Không gian làm việc', radius: 16 } }),
      H('Về chúng tôi', { x: 640, y: 90, w: 460, h: 70, size: 40 }),
      P('Kể ngắn gọn câu chuyện, giá trị và kinh nghiệm của bạn. Nhấp đúp để sửa nội dung này.', { x: 640, y: 180, w: 460, h: 120 }),
      Btn('Xem thêm', 640, 330, { bg: '#111827' }),
    ],
  },
  {
    id: 'features',
    label: '3 lợi ích',
    height: 440,
    bg: '#f9fafb',
    build: () => [
      H('Vì sao chọn chúng tôi', { x: 200, y: 50, w: 800, h: 70, size: 36, align: 'center' }),
      ...[['check', 'Chất lượng', 100], ['star', 'Uy tín', 460], ['heart', 'Tận tâm', 820]].flatMap(([icon, title, x]) => [
        makeElement('icon', { x: Number(x), y: 170, w: 56, h: 56, props: { name: icon, color: '#15803d' } }),
        H(String(title), { x: Number(x), y: 250, w: 280, h: 40, size: 24, level: 3 }),
        P('Mô tả ngắn về lợi ích này, một hai câu là đủ.', { x: Number(x), y: 300, w: 280, h: 70, size: 16 }),
      ]),
    ],
  },
  {
    id: 'stats',
    label: 'Số liệu nổi bật',
    height: 280,
    bg: '#111827',
    build: () =>
      [['10+', 'Năm kinh nghiệm'], ['500+', 'Khách hàng'], ['24/7', 'Hỗ trợ'], ['100%', 'Hài lòng']].flatMap(([n, label], i) => [
        H(n, { x: 60 + i * 280, y: 80, w: 240, h: 80, size: 56, color: '#ffffff', align: 'center', level: 3 }),
        P(label, { x: 60 + i * 280, y: 170, w: 240, h: 40, size: 16, color: '#9ca3af', align: 'center' }),
      ]),
  },
  {
    id: 'cta',
    label: 'Kêu gọi hành động',
    height: 320,
    bg: '#15803d',
    build: () => [
      H('Sẵn sàng bắt đầu cùng chúng tôi?', { x: 150, y: 70, w: 900, h: 80, size: 40, color: '#ffffff', align: 'center' }),
      P('Để lại thông tin, đội ngũ sẽ liên hệ trong thời gian sớm nhất.', { x: 250, y: 160, w: 700, h: 50, size: 18, color: '#ffe4e6', align: 'center' }),
      Btn('Nhận tư vấn', 500, 230, { bg: '#ffffff', color: '#15803d' }),
    ],
  },
  {
    id: 'contact',
    label: 'Thông tin liên hệ',
    height: 400,
    build: () => [
      H('Liên hệ', { x: 100, y: 60, w: 500, h: 70, size: 40 }),
      ...[['phone', '0909 999 999'], ['mail', 'ten@congty.vn'], ['pin', 'Địa chỉ của bạn, Việt Nam']].flatMap(([icon, text], i) => [
        makeElement('icon', { x: 100, y: 160 + i * 64, w: 36, h: 36, props: { name: icon, color: '#15803d' } }),
        P(text, { x: 160, y: 163 + i * 64, w: 460, h: 36, size: 20, color: '#111827' }),
      ]),
      makeElement('image', { x: 680, y: 60, w: 420, h: 280, props: { src: '/editor-templates/cafe.jpg', alt: 'Không gian gặp gỡ tại quán café', radius: 16 } }),
    ],
  },
  {
    id: 'banner',
    label: 'Banner ảnh nền',
    height: 520,
    build: () => [
      makeElement('image', { x: 0, y: 0, w: 1200, h: 520, props: { src: '/editor-demo/trail.jpg', alt: 'Hành trình trên đường núi', radius: 0 } }),
      makeElement('shape', { x: 0, y: 0, w: 1200, h: 520, props: { bg: 'rgba(0,0,0,0.35)' } }),
      H('Tiêu đề trên ảnh', { x: 100, y: 200, w: 700, h: 90, size: 56, color: '#ffffff', level: 1 }),
      Btn('Khám phá', 100, 330),
    ],
  },
]

// ---- Mẫu header và footer dùng chung (chỉ hiện khi đang sửa Header/Footer của site) ----
/** Dữ liệu site để mẫu có sẵn logo, menu, liên hệ như đang cấu hình trong Cài đặt site. */
export type SiteCtx = { siteName?: string; logo?: string; announcement?: string; menu?: { label: string; href: string }[]; footerMenu?: { label: string; href: string }[]; contact?: { phone?: string; email?: string; address?: string } }
export type ChromeTemplate = { id: string; label: string; height: number; bg?: string; build: (ctx: SiteCtx) => FreeElement[] }

const menuItems = (m?: { label: string; href: string }[]) => (m?.length ? m.slice(0, 5).map((i) => ({ label: i.label, href: i.href })) : [{ label: 'Trang chủ', href: '/' }, { label: 'Giới thiệu', href: '/gioi-thieu' }, { label: 'Liên hệ', href: '/lien-he' }])

export const HEADER_TEMPLATES: ChromeTemplate[] = [
  {
    id: 'header-simple',
    label: 'Header: logo, menu, nút',
    height: 88,
    bg: '#ffffff',
    build: (c) => [
      c.logo ? makeElement('image', { x: 40, y: 18, w: 180, h: 52, props: { src: c.logo, alt: c.siteName ?? 'Logo', href: '/', fit: 'contain' } }) : H(c.siteName || 'STUDIO', { x: 40, y: 24, w: 180, h: 40, size: 24 }),
      makeElement('menu', { x: 260, y: 28, w: 650, h: 32, props: { items: menuItems(c.menu), size: 16, weight: 500, gap: 28 } }),
      Btn('Liên hệ', 980, 16, { href: '/lien-he' }),
    ],
  },
  {
    id: 'header-announce',
    label: 'Thanh thông báo trên cùng',
    height: 40,
    bg: '#15803d',
    build: (c) => [P(c.announcement || 'Miễn phí vận chuyển toàn quốc', { x: 100, y: 8, w: 1000, h: 26, size: 14, color: '#ffffff', align: 'center' })],
  },
]

export const FOOTER_TEMPLATES: ChromeTemplate[] = [
  {
    id: 'footer-3col',
    label: 'Footer 3 cột',
    height: 400,
    bg: '#111827',
    build: (c) => [
      H(c.siteName ?? 'Tên website', { x: 100, y: 60, w: 340, h: 44, size: 28, color: '#ffffff', level: 3 }),
      P('Một dòng giới thiệu ngắn về doanh nghiệp của bạn.', { x: 100, y: 116, w: 340, h: 80, size: 16, color: '#9ca3af' }),
      H('Liên kết', { x: 520, y: 60, w: 240, h: 32, size: 18, color: '#ffffff', level: 3 }),
      makeElement('menu', { x: 520, y: 108, w: 240, h: 170, props: { items: menuItems(c.footerMenu ?? c.menu), size: 16, weight: 400, color: '#d1d5db', gap: 12, vertical: true } }),
      H('Liên hệ', { x: 860, y: 60, w: 240, h: 32, size: 18, color: '#ffffff', level: 3 }),
      P(c.contact?.phone || '0909 999 999', { x: 860, y: 108, w: 260, h: 28, size: 16, color: '#d1d5db' }),
      P(c.contact?.email || 'ten@congty.vn', { x: 860, y: 148, w: 260, h: 28, size: 16, color: '#d1d5db' }),
      P(c.contact?.address || 'Địa chỉ của bạn, Việt Nam', { x: 860, y: 188, w: 260, h: 60, size: 16, color: '#d1d5db' }),
      makeElement('line', { x: 100, y: 310, w: 1000, h: 12, props: { color: '#374151', thickness: 1 } }),
      P(`© ${new Date().getFullYear()} ${c.siteName ?? 'Tên website'}. Bảo lưu mọi quyền.`, { x: 100, y: 336, w: 1000, h: 28, size: 14, color: '#9ca3af', align: 'center' }),
    ],
  },
  {
    id: 'footer-compact',
    label: 'Footer gọn',
    height: 150,
    bg: '#f9fafb',
    build: (c) => [
      makeElement('menu', { x: 100, y: 34, w: 1000, h: 28, props: { items: menuItems(c.footerMenu ?? c.menu), size: 15, weight: 500, gap: 28, align: 'center' } }),
      P(`© ${new Date().getFullYear()} ${c.siteName ?? 'Tên website'}`, { x: 100, y: 88, w: 1000, h: 28, size: 14, color: '#6b7280', align: 'center' }),
    ],
  },
]

// ---- Mẫu thiết kế sẵn (dùng font, gradient, bóng, icon của bộ phần tử mới) ----
const G = '#15803d'
const el = (type: Parameters<typeof makeElement>[0], x: number, y: number, w: number, h: number, props: Record<string, unknown> = {}) => makeElement(type, { x, y, w, h, props })
const Hd = (text: string, x: number, y: number, w: number, h: number, props: Record<string, unknown> = {}) => el('heading', x, y, w, h, { text, level: 2, weight: 700, color: '#111827', ...props })
const B = (text: string, x: number, y: number, w: number, h: number, props: Record<string, unknown> = {}) => el('text', x, y, w, h, { text, size: 17, color: '#4b5563', ...props })
const Card = (x: number, y: number, w: number, h: number, props: Record<string, unknown> = {}) => el('shape', x, y, w, h, { bg: '#ffffff', radius: 24, bshadow: 'md', ...props })
const Ico = (name: string, x: number, y: number, s: number, color = G) => el('icon', x, y, s, s, { name, color, stroke: 1.8 })

export const SECTION_TEMPLATES_MORE: SectionTemplate[] = [
  {
    id: 'hero-gradient',
    label: 'Banner ảnh, chữ serif',
    height: 600,
    bg: '#0f172a',
    build: () => [
      el('image', 0, 0, 1200, 600, { src: '/editor-templates/workspace.jpg', alt: 'Văn phòng sáng tạo' }),
      el('shape', 0, 0, 1200, 600, { bg: 'rgba(0,0,0,0.6)' }),
      Hd('NỀN TẢNG MỚI', 100, 130, 500, 30, { level: 3, size: 15, color: '#86efac', spacing: 6, weight: 700 }),
      Hd('Thiết kế tinh tế,\nbán hàng hiệu quả', 100, 180, 760, 220, { level: 1, size: 76, color: '#ffffff', font: 'Playfair Display', weight: 700, lh: 1.1 }),
      B('Mọi thứ bạn cần để xây dựng thương hiệu trực tuyến, gọn gàng và nhanh chóng.', 100, 420, 560, 70, { size: 20, color: '#cbd5e1' }),
      el('button', 100, 510, 220, 60, { text: 'Bắt đầu ngay', bg: G, bg2: '#16a34a', radius: 999, bshadow: 'lg', size: 18, weight: 700, color: '#ffffff', href: '#' }),
      el('button', 340, 510, 200, 60, { text: 'Xem demo', bg: 'transparent', radius: 999, borderW: 2, borderColor: '#ffffff', size: 18, weight: 600, color: '#ffffff', href: '#' }),
    ],
  },
  {
    id: 'hero-center',
    label: 'Banner căn giữa, chữ đậm',
    height: 520,
    bg: '#fef3c7',
    build: () => [
      Hd('FLASH SALE CUỐI TUẦN', 100, 90, 1000, 36, { level: 3, size: 16, color: '#b45309', align: 'center', spacing: 8 }),
      Hd('GIẢM ĐẾN 50%', 100, 140, 1000, 190, { level: 1, size: 150, color: '#111827', align: 'center', font: 'Anton', weight: 400, tshadow: 'hard' }),
      B('Áp dụng cho toàn bộ sản phẩm chính hãng. Số lượng có hạn.', 200, 340, 800, 50, { size: 22, align: 'center', color: '#78350f' }),
      el('button', 470, 420, 260, 64, { text: 'Mua ngay', bg: '#111827', radius: 999, size: 20, weight: 700, color: '#ffffff', bshadow: 'md', href: '#' }),
    ],
  },
  {
    id: 'pricing',
    label: 'Bảng giá 3 gói',
    height: 640,
    bg: '#f8fafc',
    build: () => [
      Hd('Chọn gói phù hợp', 200, 50, 800, 70, { size: 44, align: 'center', font: 'Montserrat', weight: 800 }),
      B('Nâng cấp hoặc hủy bất cứ lúc nào, không phí ẩn.', 300, 125, 600, 40, { align: 'center' }),
      ...[
        ['Cơ bản', '199.000₫', ['1 website', 'Hỗ trợ email'], '#ffffff', '#111827', 100],
        ['Phổ biến', '499.000₫', ['5 website', 'Hỗ trợ ưu tiên', 'Tên miền riêng'], G, '#ffffff', 440],
        ['Doanh nghiệp', '999.000₫', ['Không giới hạn', 'Quản lý riêng'], '#ffffff', '#111827', 780],
      ].flatMap(([name, price, feats, bg, fg, x]) => {
        const X = Number(x)
        const dark = bg !== '#ffffff'
        return [
          Card(X, 200, 320, 380, { bg: String(bg), borderW: dark ? 0 : 1, borderColor: '#e5e7eb' }),
          Hd(String(name), X + 32, 232, 256, 36, { level: 3, size: 22, color: String(fg) }),
          Hd(String(price), X + 32, 280, 256, 64, { level: 3, size: 44, color: String(fg), weight: 800 }),
          B('/ tháng', X + 32, 346, 256, 24, { size: 14, color: dark ? '#bbf7d0' : '#6b7280' }),
          ...(feats as string[]).flatMap((f, i) => [Ico('check', X + 32, 395 + i * 36, 22, dark ? '#bbf7d0' : G), B(f, X + 64, 395 + i * 36, 220, 26, { size: 16, color: dark ? '#ffffff' : '#374151' })]),
          el('button', X + 32, 500, 256, 52, { text: 'Chọn gói', bg: dark ? '#ffffff' : '#111827', color: dark ? G : '#ffffff', radius: 14, weight: 700, href: '#' }),
        ]
      }),
    ],
  },
  {
    id: 'testimonials',
    label: 'Đánh giá khách hàng',
    height: 520,
    bg: '#ffffff',
    build: () => [
      Hd('Khách hàng nói gì', 200, 50, 800, 70, { size: 44, align: 'center', font: 'Playfair Display' }),
      ...[0, 1, 2].flatMap((i) => {
        const X = 100 + i * 340
        return [
          Card(X, 160, 320, 300, { bg: '#f8fafc', bshadow: '', radius: 24 }),
          Ico('quote', X + 28, 188, 40),
          B('Dịch vụ rất chuyên nghiệp, giao hàng nhanh và sản phẩm đúng như mô tả. Sẽ tiếp tục ủng hộ!', X + 28, 244, 264, 120, { size: 16, color: '#374151', lh: 1.5 }),
          el('image', X + 28, 388, 48, 48, { src: '/editor-templates/portrait-' + (i + 1) + '.jpg', alt: 'Chân dung minh họa', radius: 999 }),
          Hd(['Nguyễn Minh Anh', 'Trần Quốc Bảo', 'Lê Thu Hà'][i], X + 92, 390, 220, 26, { level: 4, size: 17 }),
          B('Khách hàng thân thiết', X + 92, 416, 220, 22, { size: 13, color: '#6b7280' }),
        ]
      }),
    ],
  },
  {
    id: 'steps',
    label: '3 bước thực hiện',
    height: 440,
    bg: '#f0fdf4',
    build: () => [
      Hd('Chỉ 3 bước đơn giản', 200, 50, 800, 70, { size: 42, align: 'center', font: 'Be Vietnam Pro', weight: 800 }),
      ...['Đăng ký tài khoản', 'Chọn sản phẩm', 'Nhận hàng tận nơi'].flatMap((t, i) => {
        const X = 100 + i * 340
        return [
          el('shape', X, 170, 72, 72, { bg: G, bg2: '#4ade80', radius: 999, bshadow: 'md' }),
          Hd(String(i + 1), X, 182, 72, 48, { level: 3, size: 36, color: '#ffffff', align: 'center', weight: 800 }),
          Hd(t, X, 262, 300, 40, { level: 3, size: 24 }),
          B('Mô tả ngắn gọn bước này để khách hàng dễ hình dung.', X, 312, 290, 70, { size: 16 }),
        ]
      }),
    ],
  },
  {
    id: 'faq',
    label: 'Câu hỏi thường gặp',
    height: 560,
    bg: '#ffffff',
    build: () => [
      Hd('Câu hỏi thường gặp', 100, 60, 500, 70, { size: 40, font: 'Montserrat', weight: 800 }),
      B('Không tìm thấy câu trả lời? Hãy liên hệ để được hỗ trợ trực tiếp.', 100, 140, 380, 80, { size: 17 }),
      el('button', 100, 240, 200, 52, { text: 'Liên hệ hỗ trợ', radius: 999, href: '/lien-he' }),
      ...[0, 1, 2, 3].flatMap((i) => [
        Hd(['Chính sách đổi trả thế nào?', 'Thời gian giao hàng bao lâu?', 'Có hỗ trợ lắp đặt không?', 'Thanh toán bằng hình thức nào?'][i], 560, 70 + i * 120, 540, 32, { level: 3, size: 20 }),
        B('Câu trả lời ngắn gọn, rõ ràng cho thắc mắc phổ biến của khách hàng.', 560, 108 + i * 120, 540, 50, { size: 15 }),
        el('line', 560, 168 + i * 120, 540, 12, { color: '#e5e7eb', thickness: 1 }),
      ]),
    ],
  },
  {
    id: 'gallery',
    label: 'Thư viện ảnh',
    height: 560,
    bg: '#ffffff',
    build: () => [
      Hd('Hình ảnh nổi bật', 200, 40, 800, 70, { size: 40, align: 'center', font: 'Playfair Display' }),
      el('image', 100, 140, 480, 380, { src: '/editor-demo/mountain.jpg', alt: 'Dãy núi hùng vĩ', radius: 20 }),
      el('image', 600, 140, 240, 182, { src: '/editor-templates/cafe.jpg', alt: 'Góc café', radius: 20 }),
      el('image', 860, 140, 240, 182, { src: '/editor-templates/restaurant.jpg', alt: 'Bàn ăn nhà hàng', radius: 20 }),
      el('image', 600, 338, 500, 182, { src: '/editor-demo/trail.jpg', alt: 'Đường mòn trên núi', radius: 20 }),
    ],
  },
  {
    id: 'team',
    label: 'Đội ngũ 4 người',
    height: 500,
    bg: '#f8fafc',
    build: () => [
      Hd('Đội ngũ của chúng tôi', 200, 50, 800, 70, { size: 40, align: 'center' }),
      ...[0, 1, 2, 3].flatMap((i) => {
        const X = 60 + i * 280
        return [
          el('image', X + 20, 160, 200, 200, { src: '/editor-templates/portrait-' + (i + 1) + '.jpg', alt: 'Chân dung thành viên mẫu', radius: 999 }),
          Hd(['Nguyễn An', 'Trần Bình', 'Lê Chi', 'Phạm Dũng'][i], X, 380, 240, 32, { level: 3, size: 22, align: 'center' }),
          B(['Giám đốc', 'Kinh doanh', 'Thiết kế', 'Kỹ thuật'][i], X, 416, 240, 26, { size: 15, align: 'center', color: '#6b7280' }),
        ]
      }),
    ],
  },
  {
    id: 'promo-product',
    label: 'Sản phẩm nổi bật + giá',
    height: 520,
    bg: '#f1f5f9',
    build: () => [
      el('shape', 600, 60, 500, 400, { bg: '#e2e8f0', radius: 32 }),
      el('image', 640, 90, 420, 340, { src: '/editor-templates/watch.jpg', alt: 'Đồng hồ thiết kế tối giản', radius: 24, fit: 'contain' }),
      Hd('SẢN PHẨM MỚI', 100, 100, 400, 28, { level: 3, size: 14, color: '#dc2626', spacing: 5 }),
      Hd('Tên sản phẩm\nnổi bật nhất', 100, 140, 480, 150, { level: 1, size: 54, font: 'Montserrat', weight: 800, lh: 1.15 }),
      B('Mô tả ngắn các điểm mạnh: bền bỉ, chính hãng, bảo hành dài hạn.', 100, 310, 440, 70, { size: 18 }),
      Hd('1.290.000₫', 100, 392, 300, 56, { level: 3, size: 40, color: '#dc2626', weight: 800 }),
      el('button', 330, 394, 220, 56, { text: 'Thêm vào giỏ', bg: '#111827', radius: 999, bshadow: 'md', href: '#' }),
    ],
  },
  {
    id: 'newsletter',
    label: 'Đăng ký nhận tin',
    height: 320,
    bg: '#111827',
    build: () => [
      el('shape', 100, 50, 1000, 220, { bg: G, bg2: '#14b8a6', angle: 110, radius: 32 }),
      Hd('Nhận ưu đãi mới nhất', 160, 90, 520, 60, { size: 36, color: '#ffffff', font: 'Be Vietnam Pro', weight: 800 }),
      B('Đăng ký email để không bỏ lỡ khuyến mãi.', 160, 160, 520, 40, { size: 17, color: '#d1fae5' }),
      el('shape', 700, 112, 250, 56, { bg: '#ffffff', radius: 999 }),
      B('Email của bạn…', 724, 126, 210, 28, { size: 16, color: '#9ca3af' }),
      el('button', 960, 112, 100, 56, { text: 'Gửi', bg: '#111827', radius: 999, href: '#' }),
    ],
  },
  {
    id: 'logos',
    label: 'Đối tác tin dùng',
    height: 260,
    bg: '#ffffff',
    build: () => [
      Hd('ĐƯỢC TIN DÙNG BỞI', 200, 50, 800, 28, { level: 3, size: 14, align: 'center', color: '#6b7280', spacing: 6 }),
      ...['NOVA', 'ORBIT', 'FORM', 'MỘC', 'FIELD'].map((name, i) => Hd(name, 80 + i * 210, 130, 170, 50, { size: 28, align: 'center', color: ['#255d83', '#343f94', '#675176', '#34624a', '#873d4a'][i] })),
    ],
  },
  {
    id: 'icon-grid',
    label: 'Lưới 6 dịch vụ',
    height: 600,
    bg: '#ffffff',
    build: () => [
      Hd('Dịch vụ của chúng tôi', 200, 50, 800, 70, { size: 42, align: 'center', font: 'Montserrat', weight: 800 }),
      ...['truck', 'shield-check', 'headset', 'rocket', 'wrench', 'gift'].flatMap((ic, i) => {
        const X = 100 + (i % 3) * 340
        const Y = 160 + Math.floor(i / 3) * 210
        return [
          Card(X, Y, 320, 190, { bg: '#f8fafc', bshadow: '', borderW: 1, borderColor: '#e5e7eb', radius: 20 }),
          el('shape', X + 24, Y + 24, 56, 56, { bg: '#dcfce7', radius: 16 }),
          Ico(ic, X + 36, Y + 36, 32),
          Hd(['Giao hàng nhanh', 'Bảo hành chính hãng', 'Hỗ trợ 24/7', 'Triển khai nhanh', 'Lắp đặt tận nơi', 'Quà tặng kèm'][i], X + 24, Y + 98, 270, 32, { level: 3, size: 20 }),
          B('Mô tả ngắn gọn về dịch vụ này.', X + 24, Y + 134, 270, 40, { size: 15 }),
        ]
      }),
    ],
  },
]

// ---- Container: khung chia ô (hàng x cột). Mỗi ô là một thẻ bo góc có sẵn tiêu đề và chữ để thay nội dung. ----
const grid = (id: string, label: string, rows: number, cols: number): SectionTemplate => {
  const cellH = rows === 1 ? 300 : 210
  const gap = 24
  const cellW = (1000 - gap * (cols - 1)) / cols
  return {
    id,
    label,
    height: 100 + rows * cellH + (rows - 1) * gap,
    bg: '#f3f4f6',
    build: () =>
      Array.from({ length: rows * cols }, (_, i) => {
        const x = 100 + (i % cols) * (cellW + gap)
        const y = 50 + Math.floor(i / cols) * (cellH + gap)
        return [
          Card(x, y, cellW, cellH, { radius: 20 }),
          Hd(`Ô ${i + 1}`, x + 28, y + 28, cellW - 56, 44, { level: 3, size: 26 }),
          B('Kéo thả thêm phần tử vào ô này, hoặc sửa nội dung có sẵn.', x + 28, y + 84, cellW - 56, 70, { size: 16 }),
        ]
      }).flat(),
  }
}
SECTION_TEMPLATES_MORE.unshift(grid('container-1x1', 'Container 1x1', 1, 1), grid('container-1x2', 'Container 1x2 (2 hàng)', 2, 1), grid('container-2x1', 'Container 2x1 (2 cột)', 1, 2), grid('container-1x3', 'Container 1x3 (3 cột)', 1, 3), grid('container-2x2', 'Container 2x2', 2, 2))
SECTION_TEMPLATES.push(...SECTION_TEMPLATES_MORE)
