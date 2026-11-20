import type { SectionTemplate } from './SectionTemplates'
import type { TemplateKit } from './SectionTemplatesExtra'

type P = Record<string, unknown>
const IMG = ['/editor-demo/mountain.jpg', '/editor-demo/trail.jpg', '/editor-templates/cafe.jpg', '/editor-templates/restaurant.jpg', '/editor-templates/workspace.jpg', '/editor-templates/watch.jpg']
const GLOW = { fillType: 'radial', bg2: 'transparent', radius: 999 }

/** Đợt mẫu thứ hai: ứng dụng, sự kiện, danh sách, dải đánh giá, flash sale, CTA... */
export const extraTemplates2 = ({ el, Hd, B, Card, Ico }: TemplateKit): SectionTemplate[] => {
  const eyebrow = (text: string, x: number, y: number, w: number, color: string, bg: string, align = 'left') =>
    B(text, x, y, w, 32, { size: 12, weight: 700, spacing: 2, color, bg, radius: 999, padX: 16, padY: 8, vAlign: 'center', align })
  const btn = (text: string, x: number, y: number, w: number, { h = 56, ...props }: P & { h?: number } = {}) =>
    el('button', x, y, w, h, { text, bg: '#15803d', color: '#ffffff', radius: h / 2, size: 16, weight: 700, href: '#', ...props })
  const ghost = (text: string, x: number, y: number, w: number, color = '#111827', line = '#cbd5e1') =>
    btn(text, x, y, w, { bg: 'transparent', color, borderW: 1.5, borderColor: line, weight: 600 })
  const stars = (x: number, y: number, s = 22) => [0, 1, 2, 3, 4].map((i) => Ico('star', x + i * (s + 4), y, s, '#f59e0b'))

  return [
    // ---------- Chào đón & giới thiệu ----------
    {
      id: 'hero-app-showcase', label: 'Hero giới thiệu ứng dụng', height: 680, bg: '#eef2ff',
      build: () => [
        el('shape', 640, 40, 520, 520, { ...GLOW, bg: '#818cf8', blur: 60, opacity: 36 }),
        eyebrow('ỨNG DỤNG DI ĐỘNG', 100, 120, 200, '#4338ca', '#e0e7ff'),
        Hd('Quản lý công việc\nngay trong túi bạn', 100, 176, 520, 150, { level: 1, size: 56, weight: 800, lh: 1.1, font: 'Manrope' }),
        B('Theo dõi tiến độ, nhận nhắc việc thông minh và làm việc nhóm ở bất cứ đâu.', 100, 350, 460, 80, { size: 19, lh: 1.55, color: '#475569' }),
        btn('Tải trên App Store', 100, 460, 210, { bg: '#111827' }), btn('Google Play', 326, 460, 170, { bg: '#ffffff', color: '#111827', borderW: 1.5, borderColor: '#cbd5e1' }),
        Card(780, 50, 300, 580, { bg: '#111827', radius: 48, bshadow: 'lg' }),
        el('shape', 794, 66, 272, 548, { bg: '#ffffff', radius: 36 }),
        Hd('Hôm nay', 820, 100, 200, 34, { level: 3, size: 24 }),
        ...[['#dcfce7', '#15803d'], ['#dbeafe', '#2563eb'], ['#fef3c7', '#d97706'], ['#fce7f3', '#db2777']].flatMap(([bg, c], i) => [
          el('shape', 818, 154 + i * 100, 224, 84, { bg, radius: 20 }), el('shape', 834, 172 + i * 100, 38, 38, { bg: c, radius: 12 }),
          el('shape', 888, 176 + i * 100, 120, 10, { bg: c, radius: 5, opacity: 70 }), el('shape', 888, 198 + i * 100, 84, 8, { bg: c, radius: 4, opacity: 35 }),
        ]),
        Card(580, 380, 230, 84, { radius: 22 }), Ico('trending-up', 602, 402, 38, '#15803d'), Hd('+24%', 652, 398, 140, 30, { level: 3, size: 22 }), B('Năng suất tuần này', 652, 430, 150, 22, { size: 12, color: '#64748b' }),
      ],
    },
    {
      id: 'hero-gradient-center', label: 'Hero gradient nhiều màu', height: 600, bg: '#4f46e5',
      build: () => [
        el('shape', 0, 0, 1200, 600, { bg: '#4f46e5', bg2: '#ec4899', angle: 135, radius: 0 }),
        el('shape', 80, 340, 340, 340, { bg: '#ffffff', opacity: 10, radius: 999 }), el('shape', 820, -80, 380, 380, { bg: '#ffffff', opacity: 8, radius: 999 }),
        eyebrow('MỞ ĐĂNG KÝ ĐỢT 2', 480, 96, 240, '#ffffff', 'rgba(255,255,255,0.18)', 'center'),
        Hd('Biến ý tưởng\nthành sản phẩm thật', 150, 150, 900, 170, { level: 1, size: 66, weight: 800, lh: 1.08, color: '#ffffff', align: 'center', font: 'Manrope' }),
        B('Chương trình ươm tạo 12 tuần dành cho nhà sáng lập trẻ, có cố vấn đồng hành.', 250, 346, 700, 60, { size: 20, lh: 1.5, color: '#e0e7ff', align: 'center' }),
        btn('Đăng ký tham gia', 400, 440, 220, { bg: '#ffffff', color: '#4338ca' }), ghost('Tìm hiểu thêm', 636, 440, 170, '#ffffff', 'rgba(255,255,255,0.5)'),
      ],
    },
    {
      id: 'hero-event-save-date', label: 'Hero sự kiện có ngày giờ', height: 620, bg: '#0f172a',
      build: () => [
        el('shape', 700, 60, 420, 420, { ...GLOW, bg: '#f59e0b', blur: 70, opacity: 24 }),
        Card(100, 110, 150, 150, { bg: '#f59e0b', radius: 32, bshadow: 'lg' }),
        Hd('12', 100, 126, 150, 80, { level: 2, size: 72, weight: 800, color: '#0f172a', align: 'center', font: 'Manrope' }), B('THÁNG 12', 100, 212, 150, 28, { size: 14, weight: 700, spacing: 2, color: '#0f172a', align: 'center' }),
        Hd('Hội thảo Thiết kế\nSản phẩm 2026', 100, 290, 560, 130, { level: 1, size: 52, weight: 800, lh: 1.12, color: '#ffffff', font: 'Manrope' }),
        Ico('map-pin', 100, 452, 24, '#fbbf24'), B('GEM Center, Quận 1, TP.HCM', 138, 450, 420, 28, { size: 17, color: '#cbd5e1' }),
        Ico('clock', 100, 492, 24, '#fbbf24'), B('8:30 – 17:30 · Có phục vụ ăn trưa', 138, 490, 420, 28, { size: 17, color: '#cbd5e1' }),
        btn('Giữ chỗ miễn phí', 100, 540, 220, { bg: '#f59e0b', color: '#0f172a' }),
        el('image', 700, 90, 400, 460, { src: IMG[4], alt: 'Không gian hội thảo', radius: 36, bshadow: 'lg' }),
        B('Còn 48 chỗ', 724, 114, 120, 30, { size: 13, weight: 700, color: '#0f172a', bg: '#fbbf24', radius: 999, padX: 12, padY: 6, vAlign: 'center', align: 'center' }),
      ],
    },
    {
      id: 'welcome-stats-strip', label: 'Chào mừng kèm số liệu', height: 560, bg: '#fffbeb',
      build: () => [
        eyebrow('XIN CHÀO', 100, 110, 110, '#b45309', '#fef3c7'),
        Hd('Chúng tôi giúp doanh nghiệp\nnhỏ lớn nhanh hơn', 100, 166, 560, 150, { level: 1, size: 46, weight: 800, lh: 1.15, font: 'Manrope', color: '#451a03' }),
        B('Từ chiến lược đến vận hành, đội ngũ đồng hành cùng bạn ở mọi giai đoạn tăng trưởng.', 100, 336, 480, 80, { size: 18, lh: 1.6, color: '#78350f' }),
        btn('Nói chuyện với chúng tôi', 100, 440, 260, { bg: '#b45309' }),
        ...[['250+', 'Doanh nghiệp đã đồng hành', '#dcfce7', '#15803d'], ['92%', 'Khách hàng quay lại', '#dbeafe', '#2563eb'], ['8 năm', 'Kinh nghiệm thực chiến', '#fce7f3', '#db2777']].flatMap(([n, l, bg, c], i) => [
          Card(700, 80 + i * 150, 400, 130, { bg, bshadow: '', radius: 28 }),
          Hd(n, 736, 108 + i * 150, 160, 60, { level: 2, size: 48, weight: 800, color: c, font: 'Manrope' }), B(l, 736, 170 + i * 150, 320, 28, { size: 16, color: '#475569' }),
        ]),
      ],
    },

    // ---------- Nội dung & dịch vụ ----------
    {
      id: 'faq-split-contact', label: 'Hỏi đáp kèm thẻ hỗ trợ', height: 620, bg: '#ffffff',
      build: () => [
        Card(100, 80, 380, 440, { bg: '#14532d', bshadow: 'lg', radius: 36 }),
        el('shape', 380, 360, 180, 180, { bg: '#ffffff', opacity: 8, radius: 999 }),
        Ico('headset', 140, 124, 52, '#86efac'),
        Hd('Vẫn còn thắc mắc?', 140, 204, 300, 100, { level: 2, size: 34, lh: 1.2, color: '#ffffff', font: 'Manrope' }),
        B('Đội ngũ hỗ trợ luôn sẵn sàng trả lời bạn trong vòng vài phút.', 140, 306, 300, 80, { size: 16, lh: 1.55, color: '#bbf7d0' }),
        btn('Chat với chúng tôi', 140, 410, 220, { bg: '#ffffff', color: '#14532d' }),
        Hd('Câu hỏi thường gặp', 560, 84, 540, 50, { level: 2, size: 36, font: 'Manrope', weight: 800 }),
        ...['Tôi có thể dùng thử miễn phí không?', 'Làm sao để đổi hoặc hủy gói?', 'Dữ liệu của tôi có được bảo mật?', 'Có hỗ trợ xuất hóa đơn công ty?'].flatMap((q, i) => [
          Hd(q, 560, 160 + i * 96, 480, 30, { level: 4, size: 19, weight: 600 }), Ico('plus', 1066, 162 + i * 96, 26, '#15803d'),
          B('Có, bạn có thể bắt đầu ngay và không cần nhập thẻ thanh toán.', 560, 196 + i * 96, 480, 26, { size: 14, color: '#64748b' }),
          el('shape', 560, 236 + i * 96, 540, 1, { bg: '#e2e8f0' }),
        ]),
      ],
    },
    {
      id: 'features-alternating', label: 'Tính năng ảnh trái phải', height: 860, bg: '#ffffff',
      build: () => [
        el('image', 100, 80, 480, 320, { src: IMG[4], alt: 'Làm việc nhóm', radius: 32, bshadow: 'md' }),
        eyebrow('CỘNG TÁC', 650, 100, 120, '#2563eb', '#dbeafe'),
        Hd('Làm việc nhóm\nmượt mà hơn', 650, 154, 450, 120, { level: 2, size: 40, weight: 800, lh: 1.15, font: 'Manrope' }),
        B('Chia sẻ, bình luận và chỉnh sửa cùng lúc. Mọi thay đổi được đồng bộ tức thì.', 650, 292, 440, 80, { size: 17, lh: 1.6 }),
        B('Tìm hiểu thêm  →', 650, 380, 240, 28, { size: 16, weight: 700, color: '#2563eb' }),
        eyebrow('TỰ ĐỘNG HÓA', 100, 520, 150, '#15803d', '#dcfce7'),
        Hd('Để máy làm\nviệc lặp lại', 100, 574, 450, 120, { level: 2, size: 40, weight: 800, lh: 1.15, font: 'Manrope' }),
        B('Thiết lập quy trình một lần, hệ thống tự chạy mỗi ngày và báo cáo kết quả cho bạn.', 100, 712, 440, 80, { size: 17, lh: 1.6 }),
        el('image', 620, 460, 480, 320, { src: IMG[2], alt: 'Quán cà phê', radius: 32, bshadow: 'md' }),
      ],
    },
    {
      id: 'service-list-numbered', label: 'Danh sách dịch vụ đánh số', height: 640, bg: '#fafaf9',
      build: () => [
        Hd('Dịch vụ', 100, 60, 400, 70, { level: 2, size: 48, font: 'Playfair Display' }),
        B('Những gì chúng tôi có thể làm cho bạn.', 100, 132, 420, 28, { size: 17, color: '#78716c' }),
        ...[['01', 'Nhận diện thương hiệu', 'Logo, bảng màu và bộ quy chuẩn hình ảnh.'], ['02', 'Thiết kế website', 'Giao diện đẹp, tải nhanh, dễ quản trị.'], ['03', 'Chụp ảnh sản phẩm', 'Ảnh chuyên nghiệp cho cửa hàng và quảng cáo.'], ['04', 'Chiến dịch truyền thông', 'Kế hoạch nội dung và quảng cáo đa kênh.']].flatMap(([n, t, d], i) => [
          el('shape', 100, 190 + i * 110, 1000, 1, { bg: '#d6d3d1' }),
          Hd(n, 100, 214 + i * 110, 90, 56, { level: 3, size: 40, color: '#a8a29e', font: 'Playfair Display' }),
          Hd(t, 230, 210 + i * 110, 420, 40, { level: 3, size: 28, font: 'Manrope', weight: 700 }), B(d, 230, 252 + i * 110, 480, 26, { size: 16, color: '#78716c' }),
          Ico('arrow-right', 1050, 224 + i * 110, 34, '#1c1917'),
        ]),
      ],
    },
    {
      id: 'about-values', label: '4 giá trị cốt lõi', height: 560, bg: '#f8fafc',
      build: () => [
        Hd('Giá trị chúng tôi theo đuổi', 200, 50, 800, 70, { size: 42, align: 'center', font: 'Manrope', weight: 800 }),
        ...[['heart', 'Tận tâm', '#e11d48'], ['shield-check', 'Tin cậy', '#2563eb'], ['sparkles', 'Sáng tạo', '#d97706'], ['leaf', 'Bền vững', '#15803d']].flatMap(([ic, t, c], i) => {
          const X = 80 + i * 262
          return [
            Card(X, 150, 244, 320, { bg: '#ffffff', bshadow: '', borderW: 1, borderColor: '#e5e7eb', radius: 28 }),
            el('shape', X, 150, 244, 8, { bg: c, radius: 4 }),
            Ico(ic, X + 28, 196, 48, c), Hd(t, X + 28, 268, 190, 36, { level: 3, size: 26 }),
            B('Chúng tôi đặt giá trị này vào mọi quyết định và mọi sản phẩm.', X + 28, 316, 192, 110, { size: 15, lh: 1.6 }),
          ]
        }),
      ],
    },
    {
      id: 'process-milestones', label: 'Cột mốc phát triển', height: 560, bg: '#0f172a',
      build: () => [
        Hd('Hành trình của chúng tôi', 200, 50, 800, 70, { size: 42, align: 'center', color: '#ffffff', font: 'Manrope', weight: 800 }),
        el('shape', 100, 300, 1000, 3, { bg: '#334155' }),
        ...[['2016', 'Thành lập', 'Văn phòng đầu tiên với 3 người.'], ['2018', 'Ra mắt sản phẩm', 'Khách hàng đầu tiên sử dụng.'], ['2021', 'Mở rộng khu vực', 'Có mặt tại 5 quốc gia.'], ['2024', '15.000 khách hàng', 'Cột mốc người dùng lớn nhất.']].flatMap(([y, t, d], i) => {
          const cx = 160 + i * 293, up = i % 2 === 0
          return [
            el('shape', cx - 12, 290, 24, 24, { bg: '#22d3ee', radius: 12, bshadow: 'md' }),
            Hd(y, cx - 110, up ? 190 : 340, 220, 44, { level: 3, size: 34, color: '#22d3ee', align: 'center', font: 'Manrope' }),
            Hd(t, cx - 120, up ? 238 : 388, 240, 30, { level: 4, size: 19, color: '#ffffff', align: 'center' }),
            B(d, cx - 120, up ? 272 : 422, 240, 40, { size: 14, color: '#94a3b8', align: 'center' }),
          ]
        }),
      ],
    },
    {
      id: 'team-founder-note', label: 'Lời nhắn từ nhà sáng lập', height: 560, bg: '#fdf4ff',
      build: () => [
        el('shape', 90, 90, 380, 380, { bg: '#f5d0fe', radius: 999 }),
        el('image', 110, 110, 340, 340, { src: '/editor-templates/portrait-3.jpg', alt: 'Nhà sáng lập', radius: 999, bshadow: 'lg' }),
        Ico('quote', 540, 90, 60, '#c026d3'),
        Hd('Chúng tôi không bán sản phẩm.\nChúng tôi giúp bạn thành công.', 540, 170, 560, 150, { level: 2, size: 38, lh: 1.25, font: 'Playfair Display', color: '#4a044e' }),
        B('Mỗi dự án là một lời hứa. Tôi tin rằng khi khách hàng thắng, chúng tôi mới thắng.', 540, 340, 540, 80, { size: 18, lh: 1.6, color: '#701a75' }),
        Hd('Lê Chi', 540, 440, 300, 32, { level: 4, size: 22 }), B('Nhà sáng lập & CEO', 540, 474, 300, 24, { size: 15, color: '#a21caf' }),
      ],
    },
    {
      id: 'benefit-icons-row', label: '3 lợi ích có icon lớn', height: 400, bg: '#ffffff',
      build: () => [
        ...[['zap', 'Nhanh chóng', 'Hoàn thành trong vài phút thay vì vài ngày.', '#f59e0b'], ['lock', 'An toàn', 'Mã hóa dữ liệu và sao lưu mỗi ngày.', '#2563eb'], ['users', 'Dễ hợp tác', 'Mời cả nhóm làm việc cùng lúc.', '#15803d']].flatMap(([ic, t, d, c], i) => {
          const X = 80 + i * 360
          return [
            el('shape', X + 120, 70, 100, 100, { bg: c, opacity: 14, radius: 32 }), Ico(ic, X + 146, 96, 48, c),
            Hd(t, X, 204, 340, 36, { level: 3, size: 26, align: 'center' }), B(d, X + 20, 252, 300, 70, { size: 16, align: 'center', lh: 1.55 }),
          ]
        }),
      ],
    },

    // ---------- Hình ảnh ----------
    {
      id: 'gallery-film-strip', label: 'Dải ảnh nhiều chiều cao', height: 620, bg: '#fafaf9',
      build: () => [
        Hd('Từ thư viện ảnh của chúng tôi', 100, 40, 700, 56, { size: 36, font: 'Playfair Display' }),
        ...[[340, 0], [420, 1], [300, 2], [460, 3], [360, 4]].map(([h, i]) => el('image', 70 + Number(i) * 212, 560 - Number(h), 196, Number(h), { src: IMG[Number(i)], alt: 'Ảnh minh họa', radius: 24, bshadow: 'md' })),
      ],
    },
    {
      id: 'showcase-fullbleed', label: 'Ảnh toàn khổ kèm chú thích', height: 600, bg: '#0f172a',
      build: () => [
        el('image', 0, 0, 1200, 600, { src: IMG[0], alt: 'Phong cảnh', radius: 0 }),
        el('shape', 0, 260, 1200, 340, { bg: '#0f172a', bg2: 'transparent', angle: 0, opacity: 90, radius: 0 }),
        eyebrow('BỘ SƯU TẬP MÙA ĐÔNG', 100, 380, 250, '#ffffff', 'rgba(255,255,255,0.18)'),
        Hd('Hành trình về phía núi', 100, 430, 780, 80, { level: 2, size: 62, weight: 800, color: '#ffffff', font: 'Playfair Display' }),
        btn('Khám phá bộ sưu tập', 100, 520, 250, { bg: '#ffffff', color: '#0f172a', h: 52 }),
      ],
    },
    {
      id: 'portfolio-masonry', label: 'Lưới dự án hai hàng', height: 760, bg: '#ffffff',
      build: () => [
        Hd('Dự án gần đây', 100, 40, 600, 60, { size: 40, font: 'Manrope', weight: 800 }),
        el('image', 100, 130, 520, 320, { src: IMG[3], alt: 'Dự án 1', radius: 28, bshadow: 'md' }),
        el('image', 636, 130, 230, 320, { src: IMG[5], alt: 'Dự án 2', radius: 28, bshadow: 'md' }),
        el('image', 882, 130, 218, 320, { src: IMG[2], alt: 'Dự án 3', radius: 28, bshadow: 'md' }),
        el('image', 100, 466, 230, 260, { src: IMG[1], alt: 'Dự án 4', radius: 28, bshadow: 'md' }),
        el('image', 346, 466, 230, 260, { src: IMG[4], alt: 'Dự án 5', radius: 28, bshadow: 'md' }),
        el('image', 592, 466, 508, 260, { src: IMG[0], alt: 'Dự án 6', radius: 28, bshadow: 'md' }),
      ],
    },

    // ---------- Bán hàng & đánh giá ----------
    {
      id: 'product-spotlight-dark', label: 'Sản phẩm nổi bật nền tối', height: 640, bg: '#0b0f1a',
      build: () => [
        el('shape', 380, 100, 440, 440, { ...GLOW, bg: '#38bdf8', blur: 70, opacity: 30 }),
        Hd('Nova One', 200, 50, 800, 70, { size: 48, align: 'center', color: '#ffffff', font: 'Manrope', weight: 800 }),
        el('image', 410, 150, 380, 380, { src: IMG[5], alt: 'Đồng hồ Nova One', radius: 40, fit: 'contain' }),
        ...[['zap', 'Pin 14 ngày', 'Sạc đầy chỉ trong 45 phút.'], ['shield-check', 'Chống nước 5ATM', 'Dùng thoải mái khi bơi.']].flatMap(([ic, t, d], i) => [
          Ico(ic, 90, 200 + i * 150, 40, '#38bdf8'), Hd(t, 150, 196 + i * 150, 230, 32, { level: 4, size: 22, color: '#ffffff' }), B(d, 150, 232 + i * 150, 220, 50, { size: 15, color: '#94a3b8', lh: 1.5 }),
        ]),
        ...[['heart', 'Theo dõi sức khỏe', 'Nhịp tim, giấc ngủ, SpO2.'], ['sparkles', 'Màn hình AMOLED', 'Sắc nét ngoài trời nắng.']].flatMap(([ic, t, d], i) => [
          Ico(ic, 830, 200 + i * 150, 40, '#38bdf8'), Hd(t, 890, 196 + i * 150, 230, 32, { level: 4, size: 22, color: '#ffffff' }), B(d, 890, 232 + i * 150, 220, 50, { size: 15, color: '#94a3b8', lh: 1.5 }),
        ]),
        btn('Đặt trước · 1.290.000₫', 440, 560, 320, { bg: '#38bdf8', color: '#04293a' }),
      ],
    },
    {
      id: 'offer-flash-timer', label: 'Flash sale đếm ngược', height: 460, bg: '#111827',
      build: () => [
        el('shape', 60, 40, 1080, 380, { bg: '#7f1d1d', bg2: '#dc2626', angle: 120, radius: 44, bshadow: 'lg' }),
        B('FLASH SALE', 120, 84, 140, 32, { size: 13, weight: 800, spacing: 3, color: '#fecaca', bg: 'rgba(0,0,0,0.25)', radius: 999, padX: 16, padY: 8, vAlign: 'center', align: 'center' }),
        Hd('Giảm đến 50%\ntrong 24 giờ', 120, 134, 480, 140, { level: 2, size: 48, weight: 800, lh: 1.12, color: '#ffffff', font: 'Manrope' }),
        btn('Mua ngay', 120, 306, 200, { bg: '#ffffff', color: '#991b1b' }),
        ...[['02', 'Ngày'], ['14', 'Giờ'], ['35', 'Phút'], ['08', 'Giây']].flatMap(([n, l], i) => [
          el('shape', 660 + i * 112, 130, 96, 120, { bg: '#ffffff', opacity: 16, radius: 24 }),
          Hd(n, 660 + i * 112, 148, 96, 60, { level: 3, size: 48, weight: 800, color: '#ffffff', align: 'center', font: 'Manrope' }), B(l, 660 + i * 112, 212, 96, 24, { size: 14, color: '#fecaca', align: 'center' }),
        ]),
        B('Ưu đãi kết thúc lúc 23:59 hôm nay.', 660, 290, 440, 26, { size: 15, color: '#fecaca' }),
      ],
    },
    {
      id: 'price-3-tier-dark', label: 'Bảng giá 3 gói nền tối', height: 680, bg: '#0b1220',
      build: () => [
        Hd('Chọn gói phù hợp', 200, 40, 800, 70, { size: 42, align: 'center', color: '#ffffff', font: 'Manrope', weight: 800 }),
        ...[['Khởi đầu', '0₫', ['1 dự án', 'Hỗ trợ email'], false], ['Chuyên nghiệp', '499.000₫', ['Dự án không giới hạn', 'Báo cáo nâng cao', 'Hỗ trợ ưu tiên'], true], ['Doanh nghiệp', 'Liên hệ', ['Tùy chỉnh quy trình', 'Quản lý tài khoản riêng'], false]].flatMap(([name, price, items, hot], i) => {
          const X = 100 + i * 340, hl = Boolean(hot)
          return [
            Card(X, hl ? 130 : 160, 320, hl ? 500 : 440, { bg: hl ? '#4f46e5' : '#111b2e', bshadow: hl ? 'lg' : '', borderW: hl ? 0 : 1, borderColor: '#22304a', radius: 32 }),
            Hd(String(name), X + 28, (hl ? 130 : 160) + 30, 260, 34, { level: 3, size: 24, color: '#ffffff' }),
            Hd(String(price), X + 28, (hl ? 130 : 160) + 80, 270, 60, { level: 2, size: 42, weight: 800, color: '#ffffff' }),
            ...(items as string[]).flatMap((t, k) => [Ico('check', X + 28, (hl ? 130 : 160) + 172 + k * 46, 22, hl ? '#c7d2fe' : '#86efac'), B(t, X + 60, (hl ? 130 : 160) + 170 + k * 46, 240, 26, { size: 15, color: '#e2e8f0' })]),
            btn(hl ? 'Chọn gói này' : 'Bắt đầu', X + 28, (hl ? 130 : 160) + (hl ? 420 : 360), 264, { bg: hl ? '#ffffff' : 'transparent', color: hl ? '#4338ca' : '#ffffff', borderW: hl ? 0 : 1.5, borderColor: '#334155', h: 52 }),
          ]
        }),
      ],
    },
    {
      id: 'review-wall', label: 'Tường đánh giá so le', height: 700, bg: '#f8fafc',
      build: () => [
        Hd('Được yêu thích bởi hàng nghìn khách hàng', 150, 40, 900, 64, { size: 38, align: 'center', font: 'Manrope', weight: 800 }),
        ...[0, 1, 2].flatMap((col) => [0, 1].map((row) => {
          const X = 100 + col * 340, Y = 140 + row * 270 + (col === 1 ? 40 : 0), k = col * 2 + row
          return [
            Card(X, Y, 320, 240, { bg: '#ffffff', bshadow: '', borderW: 1, borderColor: '#e5e7eb', radius: 26 }), ...stars(X + 24, Y + 24, 20),
            B(['Dùng rất thích, giao diện đẹp và dễ hiểu.', 'Hỗ trợ cực nhanh, giải quyết ngay trong ngày.', 'Tiết kiệm cho tôi nhiều giờ làm việc mỗi tuần.', 'Chất lượng vượt kỳ vọng, sẽ giới thiệu bạn bè.', 'Từ khi dùng, doanh thu của tôi tăng rõ rệt.', 'Đội ngũ nhiệt tình, sản phẩm rất ổn định.'][k], X + 24, Y + 64, 272, 100, { size: 16, lh: 1.55, color: '#334155' }),
            el('image', X + 24, Y + 176, 40, 40, { src: `/editor-templates/portrait-${(k % 4) + 1}.jpg`, alt: 'Chân dung minh họa', radius: 999 }),
            B(['Nguyễn An', 'Trần Bình', 'Lê Chi', 'Phạm Dũng', 'Võ Hà', 'Đỗ Minh'][k], X + 76, Y + 184, 220, 24, { size: 15, weight: 600, color: '#111827' }),
          ]
        }).flat()),
      ],
    },
    {
      id: 'deal-free-shipping', label: 'Dải miễn phí vận chuyển', height: 120, bg: '#0f172a',
      build: () => [
        Ico('truck', 120, 38, 44, '#86efac'),
        Hd('Miễn phí vận chuyển cho đơn từ 500.000₫', 190, 28, 640, 40, { level: 3, size: 26, color: '#ffffff', font: 'Manrope' }),
        B('Giao nhanh 2 giờ nội thành · Đổi trả trong 30 ngày', 190, 72, 640, 26, { size: 15, color: '#94a3b8' }),
        btn('Mua sắm ngay', 900, 32, 200, { bg: '#86efac', color: '#052e16', h: 56 }),
      ],
    },

    // ---------- Liên hệ & đăng ký ----------
    {
      id: 'contact-cards-3', label: '3 cách liên hệ', height: 460, bg: '#ffffff',
      build: () => [
        Hd('Liên hệ với chúng tôi', 200, 40, 800, 60, { size: 40, align: 'center', font: 'Manrope', weight: 800 }),
        ...[['phone', 'Gọi cho chúng tôi', '1900 1234', '#dcfce7', '#15803d'], ['mail', 'Gửi email', 'xinchao@hosso.vn', '#dbeafe', '#2563eb'], ['map-pin', 'Ghé thăm', '123 Nguyễn Huệ, Q.1', '#fce7f3', '#db2777']].flatMap(([ic, t, v, bg, c], i) => {
          const X = 100 + i * 340
          return [
            Card(X, 140, 320, 250, { bg: '#ffffff', bshadow: '', borderW: 1, borderColor: '#e5e7eb', radius: 28 }),
            el('shape', X + 28, 172, 64, 64, { bg, radius: 22 }), Ico(ic, X + 44, 188, 32, c),
            Hd(t, X + 28, 262, 270, 32, { level: 4, size: 22 }), B(v, X + 28, 304, 270, 28, { size: 18, weight: 600, color: c }),
          ]
        }),
      ],
    },
    {
      id: 'cta-split-image', label: 'Lời kêu gọi chia đôi có ảnh', height: 520, bg: '#f1f5f9',
      build: () => [
        Card(100, 60, 1000, 400, { bg: '#ffffff', bshadow: 'lg', radius: 40 }),
        eyebrow('ƯU ĐÃI THÀNH VIÊN', 150, 110, 200, '#b45309', '#fef3c7'),
        Hd('Tham gia câu lạc bộ\nvà nhận quà chào mừng', 150, 166, 460, 130, { level: 2, size: 38, weight: 800, lh: 1.15, font: 'Manrope' }),
        B('Đăng ký miễn phí để nhận voucher 100K, ưu đãi sinh nhật và quyền mua sớm.', 150, 312, 440, 70, { size: 17, lh: 1.55 }),
        btn('Tham gia ngay', 150, 392, 200, { bg: '#b45309', h: 52 }),
        el('image', 640, 80, 440, 360, { src: IMG[2], alt: 'Quán cà phê', radius: 32 }),
      ],
    },
    {
      id: 'subscribe-with-benefits', label: 'Đăng ký kèm quyền lợi', height: 520, bg: '#0f172a',
      build: () => [
        el('shape', 700, 60, 420, 380, { ...GLOW, bg: '#6366f1', blur: 60, opacity: 30 }),
        Hd('Nhận bản tin\nmỗi thứ Hai', 100, 100, 500, 130, { level: 2, size: 46, weight: 800, lh: 1.12, color: '#ffffff', font: 'Manrope' }),
        ...['Mẹo thiết kế và marketing ngắn gọn', 'Ưu đãi dành riêng cho người đăng ký', 'Hủy đăng ký bất cứ lúc nào'].flatMap((t, i) => [Ico('check', 100, 262 + i * 52, 24, '#86efac'), B(t, 138, 260 + i * 52, 440, 28, { size: 17, color: '#cbd5e1' })]),
        Card(660, 100, 440, 320, { bg: '#111b2e', bshadow: 'lg', borderW: 1, borderColor: '#22304a', radius: 36 }),
        Hd('Đăng ký miễn phí', 700, 136, 360, 36, { level: 3, size: 26, color: '#ffffff' }),
        el('shape', 700, 200, 360, 56, { bg: '#0b1220', radius: 16, borderW: 1, borderColor: '#334155' }), B('Email của bạn', 722, 214, 300, 28, { size: 16, color: '#64748b' }),
        btn('Nhận bản tin', 700, 276, 360, { bg: '#6366f1', h: 56, radius: 16 }), B('Hơn 12.000 người đã đăng ký.', 700, 352, 360, 24, { size: 13, color: '#64748b', align: 'center' }),
      ],
    },
    {
      id: 'cta-gradient-wide', label: 'Lời kêu gọi gradient toàn rộng', height: 320, bg: '#059669',
      build: () => [
        el('shape', 0, 0, 1200, 320, { bg: '#059669', bg2: '#0ea5e9', angle: 100, radius: 0 }),
        el('shape', 940, -60, 320, 320, { bg: '#ffffff', opacity: 10, radius: 999 }), el('shape', 60, 190, 220, 220, { bg: '#ffffff', opacity: 8, radius: 999 }),
        Hd('Sẵn sàng bắt đầu?', 100, 80, 700, 70, { level: 2, size: 52, weight: 800, color: '#ffffff', font: 'Manrope' }),
        B('Dùng thử miễn phí 14 ngày, không cần thẻ tín dụng.', 100, 160, 600, 32, { size: 20, color: '#d1fae5' }),
        btn('Bắt đầu ngay', 100, 220, 210, { bg: '#ffffff', color: '#047857' }), ghost('Nói chuyện với tư vấn', 326, 220, 260, '#ffffff', 'rgba(255,255,255,0.55)'),
      ],
    },
  ]
}
