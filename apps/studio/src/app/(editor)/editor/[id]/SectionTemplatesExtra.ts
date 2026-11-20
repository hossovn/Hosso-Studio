import type { FreeElement } from '@hosso/studio-blocks'
import type { SectionTemplate } from './SectionTemplates'

type P = Record<string, unknown>
/** Bộ dựng dùng chung với SectionTemplates.ts (truyền vào để tránh import vòng). */
export type TemplateKit = {
  el: (type: FreeElement['type'], x: number, y: number, w: number, h: number, props?: P) => FreeElement
  Hd: (text: string, x: number, y: number, w: number, h: number, props?: P) => FreeElement
  B: (text: string, x: number, y: number, w: number, h: number, props?: P) => FreeElement
  Card: (x: number, y: number, w: number, h: number, props?: P) => FreeElement
  Ico: (name: string, x: number, y: number, s: number, color?: string) => FreeElement
}

const IMG = ['/editor-demo/mountain.jpg', '/editor-demo/trail.jpg', '/editor-templates/cafe.jpg', '/editor-templates/restaurant.jpg', '/editor-templates/workspace.jpg', '/editor-templates/watch.jpg']
const GLOW = { fillType: 'radial', bg2: 'transparent', radius: 999 }

export const extraTemplates = ({ el, Hd, B, Card, Ico }: TemplateKit): SectionTemplate[] => {
  const eyebrow = (text: string, x: number, y: number, w: number, color: string, bg: string, align = 'left') =>
    B(text, x, y, w, 32, { size: 12, weight: 700, spacing: 2, color, bg, radius: 999, padX: 16, padY: 8, vAlign: 'center', align })
  const btn = (text: string, x: number, y: number, w: number, { h = 56, ...props }: P & { h?: number } = {}) =>
    el('button', x, y, w, h, { text, bg: '#15803d', color: '#ffffff', radius: h / 2, size: 16, weight: 700, href: '#', ...props })
  const ghost = (text: string, x: number, y: number, w: number, color = '#111827', line = '#cbd5e1') =>
    btn(text, x, y, w, { bg: 'transparent', color, borderW: 1.5, borderColor: line, weight: 600 })

  return [
    // ---------- Chào đón & giới thiệu ----------
    {
      id: 'hero-split-image', label: 'Hero chia đôi có ảnh', height: 620, bg: '#f6faf7',
      build: () => [
        el('shape', 650, 80, 460, 460, { bg: '#bbf7d0', radius: 48 }),
        eyebrow('NỀN TẢNG QUẢN LÝ CỬA HÀNG', 100, 110, 300, '#15803d', '#dcfce7'),
        Hd('Bán hàng dễ dàng,\nphát triển bền vững', 100, 166, 540, 150, { level: 1, size: 56, weight: 800, lh: 1.1, font: 'Manrope' }),
        B('Quản lý đơn hàng, kho và khách hàng trên một nền tảng duy nhất. Bắt đầu trong vài phút.', 100, 340, 480, 84, { size: 19, lh: 1.55, color: '#475569' }),
        btn('Dùng thử miễn phí', 100, 452, 210, { bshadow: 'md' }), ghost('Xem demo', 326, 452, 170),
        el('image', 680, 110, 440, 440, { src: IMG[4], alt: 'Không gian làm việc', radius: 40, bshadow: 'lg' }),
        Card(620, 470, 260, 84, { radius: 22 }), Ico('star', 644, 492, 38, '#f59e0b'),
        Hd('4.9/5', 696, 488, 160, 30, { level: 3, size: 22 }), B('2.000+ đánh giá', 696, 518, 170, 22, { size: 13, color: '#64748b' }),
      ],
    },
    {
      id: 'hero-dark-spotlight', label: 'Hero tối có quầng sáng', height: 640, bg: '#070b14',
      build: () => [
        el('shape', 120, 40, 520, 420, { ...GLOW, bg: '#22d3ee', blur: 60, opacity: 26 }),
        el('shape', 560, 120, 540, 440, { ...GLOW, bg: '#a78bfa', blur: 60, opacity: 28 }),
        eyebrow('MỚI · PHIÊN BẢN 2.0', 450, 100, 300, '#67e8f9', 'rgba(103,232,249,0.12)', 'center'),
        Hd('Xây dựng nhanh hơn\nvới công cụ thông minh', 150, 160, 900, 170, { level: 1, size: 66, weight: 800, lh: 1.08, color: '#ffffff', align: 'center', font: 'Manrope' }),
        B('Tự động hóa quy trình, giảm thời gian thao tác và tập trung vào điều quan trọng.', 250, 350, 700, 60, { size: 20, lh: 1.5, color: '#94a3b8', align: 'center' }),
        btn('Bắt đầu ngay', 410, 440, 200, { bg: '#22d3ee', color: '#06232b' }),
        btn('Xem video', 626, 440, 170, { bg: 'rgba(255,255,255,0.08)', borderW: 1, borderColor: 'rgba(255,255,255,0.22)', weight: 600 }),
        ...[['12K+', 'Người dùng'], ['99.9%', 'Ổn định'], ['4.9★', 'Đánh giá']].flatMap(([n, l], i) => [
          Hd(n, 250 + i * 250, 540, 200, 36, { level: 3, size: 28, color: '#ffffff', align: 'center' }), B(l, 250 + i * 250, 578, 200, 24, { size: 14, color: '#64748b', align: 'center' }),
        ]),
      ],
    },
    {
      id: 'hero-minimal-type', label: 'Hero chữ lớn tối giản', height: 600, bg: '#f4efe6',
      build: () => [
        Hd('Thiết kế\ncó chủ đích.', 80, 80, 860, 300, { level: 1, size: 116, weight: 700, lh: 1, font: 'Playfair Display', color: '#2b2620' }),
        Hd('(Từ 2016)', 900, 100, 220, 30, { level: 4, size: 16, color: '#8a7d68', align: 'right' }),
        el('shape', 80, 450, 1040, 2, { bg: '#2b2620' }),
        B('Studio thiết kế thương hiệu và website cho doanh nghiệp nhỏ. Làm ít, làm kỹ.', 80, 484, 520, 70, { size: 18, lh: 1.55, color: '#6b5f4f' }),
        el('button', 990, 470, 110, 110, { text: 'Liên hệ', bg: '#2b2620', color: '#ffffff', radius: 55, size: 15, weight: 600, href: '#' }),
      ],
    },
    {
      id: 'welcome-video-card', label: 'Chào mừng kèm video', height: 640, bg: '#ffffff',
      build: () => [
        eyebrow('GIỚI THIỆU', 100, 150, 140, '#4f46e5', '#eef2ff'),
        Hd('Hiểu chúng tôi\ntrong 90 giây', 100, 206, 480, 130, { level: 1, size: 50, weight: 800, lh: 1.12, font: 'Manrope' }),
        B('Xem nhanh cách chúng tôi làm việc, các giá trị cốt lõi và những gì bạn có thể mong đợi.', 100, 360, 440, 90, { size: 18, lh: 1.6 }),
        btn('Đặt lịch trò chuyện', 100, 480, 230, { bg: '#4f46e5' }),
        el('image', 640, 100, 460, 440, { src: IMG[2], alt: 'Không gian quán cà phê', radius: 36, bshadow: 'lg' }),
        el('shape', 640, 100, 460, 440, { bg: '#0f172a', opacity: 30, radius: 36 }),
        Card(838, 278, 72, 72, { radius: 36, bg: '#ffffff' }), Ico('play', 858, 298, 32, '#4f46e5'),
        B('Phát video giới thiệu', 700, 476, 340, 30, { size: 15, weight: 600, color: '#ffffff', align: 'center' }),
      ],
    },

    // ---------- Nội dung & dịch vụ ----------
    {
      id: 'about-story', label: 'Câu chuyện thương hiệu', height: 600, bg: '#fffaf0',
      build: () => [
        el('image', 100, 70, 420, 460, { src: IMG[3], alt: 'Nhà hàng', radius: 28, bshadow: 'lg' }),
        eyebrow('CÂU CHUYỆN CỦA CHÚNG TÔI', 580, 80, 280, '#b45309', '#fef3c7'),
        Hd('Từ một tiệm nhỏ\nđến thương hiệu\nđược yêu thích', 580, 136, 520, 170, { level: 2, size: 44, lh: 1.15, font: 'Playfair Display', color: '#2b2620' }),
        B('Chúng tôi bắt đầu bằng một công thức gia truyền và niềm tin rằng món ăn ngon luôn bắt đầu từ nguyên liệu tử tế.', 580, 326, 520, 90, { size: 17, lh: 1.65, color: '#6b5f4f' }),
        ...[['8+', 'Năm kinh nghiệm'], ['120', 'Món trong thực đơn'], ['50K', 'Khách mỗi năm']].flatMap(([n, l], i) => [
          Hd(n, 580 + i * 180, 450, 170, 52, { level: 3, size: 40, color: '#b45309' }), B(l, 580 + i * 180, 502, 170, 26, { size: 13, color: '#8a7d68' }),
        ]),
      ],
    },
    {
      id: 'process-timeline', label: 'Quy trình 4 bước nối tiếp', height: 520, bg: '#ffffff',
      build: () => [
        Hd('Cách chúng tôi làm việc', 200, 50, 800, 70, { size: 42, align: 'center', font: 'Manrope', weight: 800 }),
        el('shape', 170, 232, 860, 3, { bg: '#e2e8f0' }),
        ...[['Lắng nghe', 'Tìm hiểu nhu cầu và mục tiêu của bạn.', '#2563eb'], ['Lên kế hoạch', 'Đề xuất giải pháp và lộ trình rõ ràng.', '#7c3aed'], ['Thực hiện', 'Triển khai nhanh, báo cáo từng tuần.', '#db2777'], ['Bàn giao', 'Hướng dẫn sử dụng và hỗ trợ sau triển khai.', '#15803d']].flatMap(([t, d, c], i) => {
          const cx = 170 + i * 287
          return [
            el('shape', cx - 34, 200, 68, 68, { bg: c, radius: 34, bshadow: 'md' }),
            Hd(String(i + 1), cx - 34, 214, 68, 40, { level: 3, size: 28, color: '#ffffff', align: 'center' }),
            Hd(t, cx - 120, 296, 240, 34, { level: 3, size: 22, align: 'center' }),
            B(d, cx - 120, 338, 240, 80, { size: 15, align: 'center', lh: 1.55 }),
          ]
        }),
      ],
    },
    {
      id: 'benefit-checklist', label: 'Lợi ích dạng danh sách tick', height: 580, bg: '#f0fdf4',
      build: () => [
        Hd('Tất cả những gì\nbạn cần để bắt đầu', 100, 130, 460, 140, { size: 46, lh: 1.15, font: 'Manrope', weight: 800 }),
        B('Không cần kiến thức kỹ thuật. Chọn mẫu, chỉnh nội dung và xuất bản chỉ trong một buổi chiều.', 100, 296, 440, 90, { size: 18, lh: 1.6 }),
        btn('Bắt đầu miễn phí', 100, 410, 220),
        Card(620, 70, 480, 440, { radius: 32 }),
        ...['Tên miền và hosting miễn phí năm đầu', 'Hơn 100 mẫu thiết kế sẵn', 'Tối ưu hiển thị trên điện thoại', 'Công cụ SEO cơ bản đi kèm', 'Hỗ trợ trực tuyến mỗi ngày'].flatMap((t, i) => [
          el('shape', 652, 108 + i * 76, 40, 40, { bg: '#dcfce7', radius: 20 }), Ico('check', 660, 116 + i * 76, 24),
          Hd(t, 710, 112 + i * 76, 360, 32, { level: 4, size: 18, weight: 600 }),
        ]),
      ],
    },
    {
      id: 'service-cards-3', label: '3 thẻ dịch vụ màu', height: 580, bg: '#ffffff',
      build: () => [
        Hd('Chúng tôi giúp bạn', 200, 50, 800, 70, { size: 42, align: 'center', font: 'Manrope', weight: 800 }),
        ...[['#fee2e2', '#dc2626', 'heart', 'Chăm sóc tận tâm', 'Đội ngũ luôn lắng nghe và hỗ trợ bạn từng bước.'], ['#dbeafe', '#2563eb', 'zap', 'Triển khai nhanh', 'Rút ngắn thời gian từ ý tưởng đến thực tế.'], ['#fef3c7', '#d97706', 'award', 'Chất lượng đảm bảo', 'Cam kết tiêu chuẩn cao trong mọi sản phẩm.']].flatMap(([tint, c, ic, t, d], i) => {
          const X = 100 + i * 340
          return [
            Card(X, 140, 320, 380, { bg: '#ffffff', bshadow: '', borderW: 1, borderColor: '#e5e7eb', radius: 28 }),
            el('shape', X + 28, 172, 68, 68, { bg: tint, radius: 22 }), Ico(ic, X + 44, 188, 36, c),
            Hd(t, X + 28, 268, 270, 34, { level: 3, size: 24 }), B(d, X + 28, 314, 264, 100, { size: 16, lh: 1.6 }),
            B('Tìm hiểu thêm  →', X + 28, 456, 260, 28, { size: 15, weight: 700, color: c }),
          ]
        }),
      ],
    },
    {
      id: 'compare-table', label: 'So sánh cách cũ và mới', height: 620, bg: '#f8fafc',
      build: () => [
        Hd('Vì sao nên chọn chúng tôi', 200, 40, 800, 70, { size: 42, align: 'center', font: 'Manrope', weight: 800 }),
        Card(100, 150, 480, 400, { bg: '#ffffff', bshadow: '', borderW: 1, borderColor: '#e5e7eb', radius: 32 }),
        Hd('Cách làm cũ', 140, 180, 400, 40, { level: 3, size: 26, color: '#64748b' }),
        ...['Tự quản lý nhiều bảng tính', 'Dễ sai sót khi nhập tay', 'Mất nhiều ngày để báo cáo', 'Khó mở rộng khi tăng đơn'].flatMap((t, i) => [Ico('x', 140, 252 + i * 66, 26, '#dc2626'), B(t, 184, 252 + i * 66, 360, 30, { size: 17, color: '#64748b' })]),
        Card(620, 130, 480, 440, { bg: '#14532d', bshadow: 'lg', radius: 32 }),
        Hd('Với chúng tôi', 660, 164, 400, 40, { level: 3, size: 26, color: '#ffffff' }),
        ...['Mọi dữ liệu trên một nơi', 'Tự động hóa, ít lỗi hơn', 'Báo cáo tức thì mỗi ngày', 'Mở rộng không giới hạn'].flatMap((t, i) => [Ico('check', 660, 244 + i * 66, 26, '#86efac'), B(t, 704, 244 + i * 66, 360, 30, { size: 17, color: '#ecfdf5', weight: 600 })]),
      ],
    },
    {
      id: 'usp-bar', label: 'Dải 4 điểm mạnh', height: 230, bg: '#111827',
      build: () => ['truck', 'shield-check', 'headset', 'gift'].flatMap((ic, i) => {
        const X = 70 + i * 270
        return [
          Ico(ic, X, 80, 44, '#86efac'),
          Hd(['Giao hàng miễn phí', 'Bảo hành 12 tháng', 'Hỗ trợ 24/7', 'Quà tặng kèm'][i], X + 62, 72, 200, 30, { level: 4, size: 18, color: '#ffffff' }),
          B(['Cho đơn từ 500K', 'Đổi trả trong 30 ngày', 'Luôn sẵn sàng giúp bạn', 'Mỗi đơn hàng đầu tiên'][i], X + 62, 104, 200, 44, { size: 13, color: '#94a3b8' }),
        ]
      }),
    },
    {
      id: 'stats-band', label: 'Dải số liệu lớn', height: 320, bg: '#14532d',
      build: () => [
        el('shape', 700, -40, 520, 420, { ...GLOW, bg: '#4ade80', blur: 60, opacity: 22 }),
        ...[['15K+', 'Khách hàng tin dùng'], ['98%', 'Hài lòng với dịch vụ'], ['24/7', 'Hỗ trợ liên tục'], ['40+', 'Quốc gia sử dụng']].flatMap(([n, l], i) => [
          Hd(n, 70 + i * 270, 100, 250, 84, { level: 2, size: 66, weight: 800, color: '#ffffff', font: 'Manrope' }), B(l, 70 + i * 270, 190, 250, 30, { size: 16, color: '#bbf7d0' }),
        ]),
      ],
    },
    {
      id: 'team-cards', label: 'Đội ngũ dạng thẻ', height: 580, bg: '#ffffff',
      build: () => [
        Hd('Gặp gỡ đội ngũ', 200, 50, 800, 70, { size: 42, align: 'center', font: 'Manrope', weight: 800 }),
        ...[['Nguyễn An', 'Giám đốc điều hành', '#dcfce7'], ['Trần Bình', 'Trưởng phòng thiết kế', '#dbeafe'], ['Lê Chi', 'Quản lý sản phẩm', '#fce7f3']].flatMap(([n, r, bg], i) => {
          const X = 100 + i * 340
          return [
            Card(X, 140, 320, 380, { bg: '#f8fafc', bshadow: '', radius: 32 }),
            el('shape', X + 20, 160, 280, 200, { bg, radius: 24 }),
            el('image', X + 110, 200, 100, 100, { src: `/editor-templates/portrait-${i + 1}.jpg`, alt: 'Chân dung minh họa', radius: 999 }),
            Hd(n, X + 20, 384, 280, 34, { level: 3, size: 24, align: 'center' }), B(r, X + 20, 426, 280, 28, { size: 15, align: 'center', color: '#64748b' }),
          ]
        }),
      ],
    },

    // ---------- Hình ảnh & chuyển động ----------
    {
      id: 'showcase-bento', label: 'Lưới ảnh bento', height: 680, bg: '#ffffff',
      build: () => [
        Hd('Khoảnh khắc nổi bật', 200, 36, 800, 70, { size: 40, align: 'center', font: 'Playfair Display' }),
        el('image', 100, 130, 440, 510, { src: IMG[0], alt: 'Núi', radius: 32, bshadow: 'md' }),
        el('image', 556, 130, 300, 240, { src: IMG[2], alt: 'Quán cà phê', radius: 32, bshadow: 'md' }),
        el('image', 872, 130, 228, 240, { src: IMG[5], alt: 'Đồng hồ', radius: 32, bshadow: 'md' }),
        el('image', 556, 386, 544, 254, { src: IMG[1], alt: 'Đường mòn', radius: 32, bshadow: 'md' }),
      ],
    },
    {
      id: 'portfolio-3-cards', label: 'Dự án nổi bật', height: 620, bg: '#f8fafc',
      build: () => [
        Hd('Dự án nổi bật', 100, 50, 600, 64, { size: 42, font: 'Manrope', weight: 800 }),
        ghost('Xem tất cả', 940, 56, 160),
        ...[['Nhà hàng Mộc', 'Thương hiệu · Website', IMG[3]], ['Orbit Studio', 'Nhận diện · In ấn', IMG[4]], ['Meridian', 'Sản phẩm · Chụp ảnh', IMG[5]]].flatMap(([t, tag, src], i) => {
          const X = 100 + i * 340
          return [
            el('image', X, 150, 320, 300, { src, alt: t, radius: 28, bshadow: 'md' }),
            Hd(t, X, 474, 260, 34, { level: 3, size: 24 }), B(tag, X, 514, 260, 26, { size: 15, color: '#64748b' }),
            Ico('arrow-right', X + 284, 480, 30, '#111827'),
          ]
        }),
      ],
    },
    {
      id: 'collage-quote', label: 'Ảnh ghép kèm trích dẫn', height: 620, bg: '#10251b',
      build: () => [
        Ico('quote', 100, 90, 64, '#86efac'),
        Hd('Những điều đơn giản nhất\nlại tạo nên khác biệt lớn nhất.', 100, 190, 560, 220, { level: 2, size: 42, lh: 1.25, font: 'Playfair Display', color: '#ecfdf5' }),
        B('Lê Thu Hà · Nhà sáng lập', 100, 450, 400, 28, { size: 16, color: '#86efac', weight: 600 }),
        el('image', 700, 70, 380, 300, { src: IMG[0], alt: 'Phong cảnh', radius: 32, bshadow: 'lg' }),
        el('image', 800, 320, 300, 240, { src: IMG[1], alt: 'Đường mòn', radius: 32, bshadow: 'lg' }),
      ],
    },

    // ---------- Bán hàng & đánh giá ----------
    {
      id: 'product-trio', label: '3 sản phẩm bán chạy', height: 660, bg: '#ffffff',
      build: () => [
        Hd('Bán chạy nhất tuần', 200, 40, 800, 70, { size: 42, align: 'center', font: 'Manrope', weight: 800 }),
        ...[['Đồng hồ Nova', '1.290.000₫', 'MỚI', IMG[5]], ['Cà phê rang xay', '189.000₫', '-20%', IMG[2]], ['Bộ bàn làm việc', '3.490.000₫', 'HOT', IMG[4]]].flatMap(([n, price, tag, src], i) => {
          const X = 100 + i * 340
          return [
            Card(X, 140, 320, 460, { bg: '#f8fafc', bshadow: '', radius: 28 }),
            el('image', X + 20, 160, 280, 220, { src, alt: n, radius: 20 }),
            B(tag, X + 34, 174, 64, 28, { size: 12, weight: 700, color: '#ffffff', bg: '#dc2626', radius: 999, padX: 10, padY: 6, vAlign: 'center', align: 'center' }),
            Hd(n, X + 24, 400, 272, 30, { level: 3, size: 22 }), Hd(price, X + 24, 438, 272, 36, { level: 4, size: 26, color: '#dc2626', weight: 800 }),
            el('button', X + 20, 514, 280, 50, { text: 'Thêm vào giỏ', bg: '#111827', color: '#ffffff', radius: 25, size: 15, weight: 600, href: '#' }),
          ]
        }),
      ],
    },
    {
      id: 'offer-banner', label: 'Banner siêu sale', height: 400, bg: '#fff7ed',
      build: () => [
        Card(100, 60, 1000, 280, { bg: '#ea580c', bg2: '#f59e0b', angle: 120, radius: 44, bshadow: 'lg' }),
        el('shape', 930, 90, 130, 130, { bg: '#ffffff', opacity: 14, radius: 999 }),
        Hd('-30%', 150, 100, 380, 150, { level: 1, size: 130, weight: 900, color: '#ffffff', font: 'Montserrat', lh: 1 }),
        Hd('Siêu sale cuối tuần', 540, 106, 520, 56, { level: 2, size: 42, color: '#ffffff', font: 'Manrope', weight: 800 }),
        B('Áp dụng cho toàn bộ sản phẩm đến hết Chủ nhật. Số lượng có hạn.', 540, 176, 480, 60, { size: 18, color: '#ffedd5', lh: 1.5 }),
        btn('Mua ngay', 540, 252, 180, { bg: '#ffffff', color: '#9a3412' }),
      ],
    },
    {
      id: 'price-single', label: 'Gói giá nổi bật', height: 620, bg: '#0b1220',
      build: () => [
        el('shape', 300, 40, 600, 400, { ...GLOW, bg: '#6366f1', blur: 60, opacity: 28 }),
        Card(250, 60, 700, 500, { bg: '#111b2e', bshadow: '', borderW: 1, borderColor: '#22304a', radius: 40 }),
        B('PHỔ BIẾN NHẤT', 290, 96, 150, 30, { size: 12, weight: 700, spacing: 2, color: '#a5b4fc', bg: 'rgba(99,102,241,0.18)', radius: 999, padX: 14, padY: 7, vAlign: 'center', align: 'center' }),
        Hd('Gói Pro', 290, 144, 300, 48, { level: 2, size: 38, color: '#ffffff', font: 'Manrope' }),
        Hd('499.000₫', 290, 204, 360, 80, { level: 2, size: 64, color: '#ffffff', weight: 800 }), B('/ tháng', 640, 236, 120, 30, { size: 18, color: '#94a3b8' }),
        ...['Không giới hạn dự án', 'Báo cáo nâng cao', 'Hỗ trợ ưu tiên', 'Xuất dữ liệu tự do', 'Tích hợp thanh toán', 'Tên miền riêng'].flatMap((t, i) => {
          const X = 290 + (i % 2) * 330, Y = 330 + Math.floor(i / 2) * 50
          return [Ico('check', X, Y, 24, '#86efac'), B(t, X + 36, Y - 2, 280, 28, { size: 16, color: '#e2e8f0' })]
        }),
        btn('Chọn gói Pro', 290, 484, 620, { bg: '#6366f1' }),
      ],
    },
    {
      id: 'review-summary', label: 'Điểm đánh giá tổng hợp', height: 600, bg: '#ffffff',
      build: () => [
        Hd('4.9', 100, 110, 260, 130, { level: 2, size: 120, weight: 800, font: 'Manrope' }),
        ...[0, 1, 2, 3, 4].map((i) => Ico('star', 100 + i * 40, 252, 32, '#f59e0b')),
        B('Dựa trên 2.340 đánh giá', 100, 298, 320, 28, { size: 15, color: '#64748b' }),
        ...[['5', 0.9], ['4', 0.06], ['3', 0.02], ['2', 0.01], ['1', 0.01]].flatMap(([s, v], i) => [
          B(`${s} ★`, 100, 350 + i * 40, 50, 24, { size: 14, color: '#475569' }),
          el('shape', 156, 356 + i * 40, 250, 12, { bg: '#e2e8f0', radius: 6 }),
          el('shape', 156, 356 + i * 40, Math.max(8, Number(v) * 250), 12, { bg: '#f59e0b', radius: 6 }),
        ]),
        ...[['Sản phẩm đúng mô tả, giao nhanh. Rất hài lòng!', 'Nguyễn Minh Anh'], ['Dịch vụ chuyên nghiệp, hỗ trợ nhiệt tình.', 'Trần Quốc Bảo']].flatMap(([t, n], i) => [
          Card(500, 90 + i * 230, 600, 200, { bg: '#f8fafc', bshadow: '', radius: 28 }),
          ...[0, 1, 2, 3, 4].map((k) => Ico('star', 536 + k * 28, 120 + i * 230, 22, '#f59e0b')),
          B(t, 536, 160 + i * 230, 530, 60, { size: 18, color: '#334155', lh: 1.5 }), B(n, 536, 232 + i * 230, 400, 26, { size: 14, color: '#64748b', weight: 600 }),
        ]),
      ],
    },
    {
      id: 'deal-strip', label: 'Dải khuyến mãi', height: 150, bg: '#fef3c7',
      build: () => [
        Ico('percent', 110, 52, 46, '#b45309'),
        Hd('Giảm thêm 10% cho đơn hàng đầu tiên', 180, 40, 640, 48, { level: 3, size: 28, color: '#78350f', font: 'Manrope' }),
        B('Nhập mã HOSSO10 khi thanh toán. Áp dụng đến hết tháng này.', 180, 92, 640, 28, { size: 16, color: '#92400e' }),
        btn('Nhận mã ngay', 880, 46, 220, { bg: '#b45309' }),
      ],
    },

    // ---------- Liên hệ & đăng ký ----------
    {
      id: 'contact-split-info', label: 'Liên hệ kèm thông tin', height: 660, bg: '#ffffff',
      build: () => [
        eyebrow('LIÊN HỆ', 100, 90, 120, '#15803d', '#dcfce7'),
        Hd('Hãy trò chuyện\ncùng chúng tôi', 100, 140, 460, 130, { size: 46, lh: 1.15, font: 'Manrope', weight: 800 }),
        B('Điền form hoặc liên hệ trực tiếp, chúng tôi phản hồi trong vòng 24 giờ làm việc.', 100, 290, 440, 80, { size: 17, lh: 1.6 }),
        ...[['map-pin', '123 Nguyễn Huệ, Quận 1, TP.HCM'], ['phone', '1900 1234'], ['mail', 'xinchao@hosso.vn'], ['clock', 'T2 – T7 · 8:00 – 18:00']].flatMap(([ic, t], i) => [
          el('shape', 100, 400 + i * 64, 46, 46, { bg: '#dcfce7', radius: 14 }), Ico(ic, 111, 411 + i * 64, 24),
          B(t, 164, 410 + i * 64, 380, 28, { size: 17, color: '#1f2937' }),
        ]),
        Card(620, 70, 480, 540, { bg: '#f8fafc', bshadow: '', radius: 36 }),
        Hd('Gửi tin nhắn', 660, 104, 400, 40, { level: 3, size: 28 }),
        ...['Họ và tên', 'Email của bạn', 'Bạn cần hỗ trợ điều gì?'].flatMap((ph, i) => {
          const h = i === 2 ? 130 : 56, y = 170 + (i === 2 ? 2 * 78 : i * 78)
          return [el('shape', 660, y, 400, h, { bg: '#ffffff', radius: 16, borderW: 1, borderColor: '#e2e8f0' }), B(ph, 684, y + 14, 340, 28, { size: 16, color: '#94a3b8' })]
        }),
        btn('Gửi tin nhắn', 660, 476, 400),
      ],
    },
    {
      id: 'booking-cta-dark', label: 'Đặt lịch hẹn', height: 440, bg: '#0f172a',
      build: () => [
        Card(100, 60, 1000, 320, { bg: '#4f46e5', bg2: '#7c3aed', angle: 120, radius: 44, bshadow: 'lg' }),
        el('shape', 860, 80, 200, 200, { bg: '#ffffff', opacity: 10, radius: 999 }), el('shape', 960, 220, 100, 100, { bg: '#ffffff', opacity: 8, radius: 999 }),
        Ico('calendar', 160, 110, 56, '#ffffff'),
        Hd('Đặt lịch tư vấn miễn phí', 160, 182, 640, 56, { level: 2, size: 44, color: '#ffffff', font: 'Manrope', weight: 800 }),
        B('Chọn khung giờ phù hợp, chuyên viên sẽ liên hệ và giải đáp mọi thắc mắc của bạn.', 160, 250, 560, 56, { size: 18, color: '#e0e7ff', lh: 1.5 }),
        btn('Đặt lịch ngay', 160, 312, 200, { bg: '#ffffff', color: '#4338ca', h: 52 }), ghost('Gọi 1900 1234', 376, 312, 200, '#ffffff', 'rgba(255,255,255,0.45)'),
      ],
    },
    {
      id: 'map-hours', label: 'Bản đồ và giờ mở cửa', height: 580, bg: '#f8fafc',
      build: () => [
        Card(100, 80, 560, 420, { bg: '#e2e8f0', bshadow: '', radius: 36 }),
        el('shape', 100, 230, 560, 3, { bg: '#cbd5e1' }), el('shape', 330, 80, 3, 420, { bg: '#cbd5e1' }),
        Ico('map-pin', 300, 214, 64, '#dc2626'),
        Card(240, 420, 280, 56, { radius: 28 }), B('Cửa hàng Hosso · Quận 1', 240, 434, 280, 28, { size: 15, weight: 600, align: 'center', color: '#111827' }),
        Hd('Giờ mở cửa', 720, 90, 380, 44, { level: 2, size: 36, font: 'Manrope', weight: 800 }),
        ...[['Thứ Hai – Thứ Sáu', '8:00 – 20:00'], ['Thứ Bảy', '9:00 – 21:00'], ['Chủ nhật', '9:00 – 18:00'], ['Ngày lễ', 'Liên hệ trước']].flatMap(([d, t], i) => [
          B(d, 720, 170 + i * 62, 220, 28, { size: 17, color: '#475569' }), B(t, 940, 170 + i * 62, 160, 28, { size: 17, weight: 700, color: '#111827', align: 'right' }),
          el('shape', 720, 206 + i * 62, 380, 1, { bg: '#e2e8f0' }),
        ]),
        btn('Chỉ đường', 720, 430, 200),
      ],
    },
    {
      id: 'social-follow', label: 'Theo dõi mạng xã hội', height: 340, bg: '#ffffff',
      build: () => [
        Hd('Theo dõi chúng tôi', 200, 50, 800, 56, { size: 38, align: 'center', font: 'Manrope', weight: 800 }),
        B('Cập nhật mẫu mới, mẹo thiết kế và ưu đãi mỗi tuần.', 300, 112, 600, 30, { size: 17, align: 'center' }),
        ...[['camera', 'Ảnh', '#db2777', '#f59e0b'], ['play', 'Video', '#dc2626', '#f97316'], ['music', 'Âm nhạc', '#0f172a', '#334155'], ['globe', 'Website', '#2563eb', '#06b6d4'], ['mail', 'Thư', '#15803d', '#84cc16']].flatMap(([ic, l, c1, c2], i) => [
          el('shape', 280 + i * 130, 180, 76, 76, { bg: c1, bg2: c2, angle: 135, radius: 26, bshadow: 'md' }), Ico(ic, 304 + i * 130, 204, 28, '#ffffff'),
          B(l, 270 + i * 130, 270, 96, 24, { size: 14, align: 'center', color: '#475569' }),
        ]),
      ],
    },
    {
      id: 'subscribe-minimal', label: 'Đăng ký tối giản', height: 240, bg: '#f1f5f9',
      build: () => [
        Hd('Đừng bỏ lỡ tin mới', 100, 70, 440, 44, { level: 3, size: 32, font: 'Manrope', weight: 800 }),
        B('Mỗi tuần một email, không thư rác.', 100, 120, 440, 28, { size: 16 }),
        el('shape', 580, 90, 350, 60, { bg: '#ffffff', radius: 30, bshadow: 'md' }), B('Email của bạn', 610, 104, 290, 30, { size: 16, color: '#94a3b8' }),
        btn('Đăng ký', 946, 90, 154, { h: 60, bg: '#0f172a' }),
      ],
    },
  ]
}
