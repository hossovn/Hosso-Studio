import { makeElement, newId, type FreeElement } from '@hosso/studio-blocks'
import { captureFrameVariant } from '../../../../../../../packages/blocks/src/design-presets'
import { createFrameLayout } from '../../../../../../../packages/blocks/src/frame-layout'

/** Mẫu section (kiểu Webcake "Phần → Mẫu"): một canvas có sẵn chiều cao, nền và các phần tử đã bố trí; chèn xong vẫn kéo thả sửa tự do. */
export type SectionTemplate = { id: string; label: string; height: number; bg?: string; extraProps?: Record<string, unknown>; build: () => FreeElement[] }

const H = (text: string, over: { x: number; y: number; w: number; h: number; size: number; color?: string; align?: string; level?: number }): FreeElement =>
  makeElement('heading', { x: over.x, y: over.y, w: over.w, h: over.h, props: { text, size: over.size, color: over.color ?? '#111827', align: over.align ?? 'left', level: over.level ?? 2, weight: 700 } })
const P = (text: string, over: { x: number; y: number; w: number; h: number; size?: number; color?: string; align?: string }): FreeElement =>
  makeElement('text', { x: over.x, y: over.y, w: over.w, h: over.h, props: { text, size: over.size ?? 18, color: over.color ?? '#4b5563', align: over.align ?? 'left' } })
const Btn = (text: string, x: number, y: number, props: Record<string, unknown> = {}): FreeElement => makeElement('button', { x, y, w: 200, h: 56, props: { text, ...props } })

export const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'hero-svh',
    label: 'Hero tràn màn hình (100svh)',
    height: 700,
    bg: '#0f172a',
    extraProps: {
      heightMode: 'svh',
      svh: 100,
      svhOffset: 82,
      minHeightPx: 620,
      bgImage: '/editor-templates/restaurant.jpg',
      bgOverlay: 85,
      bgOverlayColor: '#0f172a',
      bgOverlayColor2: 'transparent',
      bgOverlayAngle: 95,
    },
    build: () => [
      makeElement('shape', { x: 700, y: 120, w: 420, h: 420, props: { bg: '#facc15', bg2: 'transparent', fillType: 'radial', blur: 36, opacity: 32, radius: 999 } }),
      makeElement('text', { x: 88, y: 128, w: 340, h: 36, props: { text: 'GIẢI PHÁP VẬN HÀNH NHÀ HÀNG HIỆN ĐẠI', size: 13, weight: 700, spacing: 2, color: '#fde047', bg: 'rgba(250,204,21,0.14)', radius: 999, padX: 16, padY: 8, vAlign: 'center', font: 'Manrope' } }),
      makeElement('heading', { x: 88, y: 184, w: 590, h: 168, props: { text: 'Gọi món tại bàn nhanh gấp 3 lần bằng Tablet', level: 1, size: 54, weight: 800, lh: 1.12, color: '#ffffff', font: 'Manrope' } }),
      makeElement('text', { x: 88, y: 368, w: 530, h: 84, props: { text: 'Đồng bộ đơn xuống bếp và thu ngân trong 0.5 giây. Triển khai trọn gói phần cứng lẫn phần mềm chỉ trong 24 giờ.', size: 19, lh: 1.55, color: '#cbd5e1', font: 'Inter' } }),
      makeElement('button', { x: 88, y: 478, w: 224, h: 56, props: { text: 'Nhận tư vấn miễn phí', bg: '#facc15', color: '#111827', radius: 999, size: 16, weight: 700, font: 'Manrope', href: '/lien-he' } }),
      makeElement('button', { x: 328, y: 478, w: 196, h: 56, props: { text: 'Xem quy trình', bg: 'transparent', color: '#ffffff', borderW: 1.5, borderColor: 'rgba(255,255,255,0.42)', radius: 999, size: 16, weight: 600, font: 'Manrope', href: '#' } }),
      makeElement('image', { x: 716, y: 132, w: 400, h: 436, props: { src: '/editor-templates/cafe.jpg', alt: 'Không gian trải nghiệm gọi món tại bàn', radius: 28, bshadow: 'lg' } }),
    ],
  },
  {
    id: 'interactive-tabs',
    label: 'Tab tương tác đổi khung',
    height: 640,
    bg: '#f8fafc',
    build: () => {
      const frameId = newId()
      const badgeId = newId(), headId = newId(), descId = newId(), ctaId = newId(), imgId = newId()
      const frame: FreeElement = makeElement('container', {
        id: frameId,
        x: 80,
        y: 196,
        w: 1040,
        h: 384,
        props: { _frame: true, name: 'Khung nội dung Tab', bg: '#ffffff', radius: 24, borderW: 1, borderColor: '#e2e8f0', bshadow: 'md' },
      })
      const makeChildren = (badge: string, heading: string, desc: string, cta: string, src: string): FreeElement[] => [
        makeElement('text', { id: badgeId, parentId: frameId, x: 128, y: 242, w: 240, h: 32, props: { text: badge, size: 12, weight: 700, spacing: 1.5, color: '#a16207', bg: '#fef9c3', radius: 999, padX: 14, padY: 6, vAlign: 'center', font: 'Manrope' } }),
        makeElement('heading', { id: headId, parentId: frameId, x: 128, y: 290, w: 460, h: 96, props: { text: heading, level: 3, size: 32, weight: 800, lh: 1.2, color: '#0f172a', font: 'Manrope' } }),
        makeElement('text', { id: descId, parentId: frameId, x: 128, y: 398, w: 450, h: 78, props: { text: desc, size: 16, lh: 1.55, color: '#475569', font: 'Inter' } }),
        makeElement('button', { id: ctaId, parentId: frameId, x: 128, y: 492, w: 196, h: 48, props: { text: cta, bg: '#111827', color: '#ffffff', radius: 999, size: 15, weight: 700, font: 'Manrope', href: '/lien-he' } }),
        makeElement('image', { id: imgId, parentId: frameId, x: 628, y: 228, w: 456, h: 320, props: { src, alt: heading, radius: 18 } }),
      ]
      const tabs = [
        { id: 'tab_order', tabLabel: '1. Gọi món tại bàn', badge: 'TRẢI NGHIỆM THỰC KHÁCH', heading: 'Thực đơn hình ảnh trực quan ngay tại bàn', desc: 'Khách tự chọn món, tùy chỉnh khẩu vị và gửi đơn trực tiếp không cần chờ nhân viên ghi giấy.', cta: 'Dùng thử thực đơn', src: '/editor-templates/restaurant.jpg' },
        { id: 'tab_pos', tabLabel: '2. Đồng bộ bếp & POS', badge: 'VẬN HÀNH TỨC THÌ', heading: 'Phiếu chế biến in tự động tại quầy bếp trong 0.5s', desc: 'Loại bỏ hoàn toàn sai sót nhầm bàn, sót món giờ cao điểm và tối ưu 40% nhân sự chạy bàn.', cta: 'Xem luồng đồng bộ', src: '/editor-templates/cafe.jpg' },
        { id: 'tab_report', tabLabel: '3. Quản trị doanh thu', badge: 'DỮ LIỆU THỜI GIAN THỰC', heading: 'Báo cáo doanh thu, món bán chạy theo từng ca', desc: 'Theo dõi hiệu suất từng chi nhánh trên điện thoại mọi lúc mọi nơi với biểu đồ trực quan.', cta: 'Khám phá báo cáo', src: '/editor-templates/workspace.jpg' },
      ]
      const variants = tabs.map((t) => captureFrameVariant([frame, ...makeChildren(t.badge, t.heading, t.desc, t.cta, t.src)], frame, t.id, t.tabLabel))
      const hydratedFrame: FreeElement = { ...frame, props: { ...frame.props, _variants: variants, _variant: variants[0].id } }
      const triggers = tabs.map((t, i) =>
        makeElement('button', {
          x: 228 + i * 252,
          y: 122,
          w: 236,
          h: 48,
          props: {
            text: t.tabLabel,
            href: `#state:${frameId}:${t.id}`,
            bg: '#ffffff',
            color: '#475569',
            borderW: 1,
            borderColor: '#cbd5e1',
            radius: 999,
            size: 15,
            weight: 700,
            font: 'Manrope',
            _states: {
              desktop: {
                active: { backgroundColor: '#111827', color: '#ffffff', borderColor: '#111827', transitionMs: 160 },
                hover: { borderColor: '#64748b', transitionMs: 150 },
              },
            },
          },
        }),
      )
      return [
        makeElement('heading', { x: 200, y: 44, w: 800, h: 56, props: { text: 'Một hệ sinh thái khép kín từ bàn ăn tới bếp', level: 2, size: 38, weight: 800, align: 'center', color: '#0f172a', font: 'Manrope' } }),
        ...triggers,
        hydratedFrame,
        ...makeChildren(tabs[0].badge, tabs[0].heading, tabs[0].desc, tabs[0].cta, tabs[0].src),
      ]
    },
  },
  {
    id: 'interactive-steps',
    label: 'Quy trình 3 bước đổi màn hình',
    height: 600,
    bg: '#ffffff',
    build: () => {
      const frameId = newId()
      const stepBadgeId = newId(), previewImgId = newId(), captionId = newId()
      const frame: FreeElement = makeElement('container', {
        id: frameId,
        x: 580,
        y: 96,
        w: 540,
        h: 432,
        props: { _frame: true, name: 'Màn hình bước quy trình', bg: '#0f172a', radius: 28, bshadow: 'lg' },
      })
      const makeStepChildren = (badge: string, caption: string, src: string): FreeElement[] => [
        makeElement('text', { id: stepBadgeId, parentId: frameId, x: 612, y: 124, w: 220, h: 30, props: { text: badge, size: 12, weight: 700, spacing: 1.4, color: '#fde047', font: 'Manrope' } }),
        makeElement('image', { id: previewImgId, parentId: frameId, x: 612, y: 166, w: 476, h: 286, props: { src, alt: caption, radius: 18 } }),
        makeElement('text', { id: captionId, parentId: frameId, x: 612, y: 468, w: 476, h: 36, props: { text: caption, size: 15, weight: 600, color: '#e2e8f0', font: 'Inter' } }),
      ]
      const steps = [
        { id: 'step_1', btnText: 'Bước 01 · Khảo sát & chuẩn hóa thực đơn', badge: 'BƯỚC 01 / KHỞI TẠO', caption: 'Đội ngũ nhập liệu món ăn, phân nhóm combo và thiết kế hình ảnh chuẩn nhận diện.', src: '/editor-templates/restaurant.jpg' },
        { id: 'step_2', btnText: 'Bước 02 · Lắp đặt Tablet & kết nối POS', badge: 'BƯỚC 02 / LẮP ĐẶT TẬN NƠI', caption: 'Cấu hình mạng nội bộ ổn định, đế sạc bàn ăn và máy in nhiệt tại bếp.', src: '/editor-templates/cafe.jpg' },
        { id: 'step_3', btnText: 'Bước 03 · Đào tạo 15 phút & vận hành ngay', badge: 'BƯỚC 03 / ĐỒNG HÀNH 24/7', caption: 'Nhân viên sử dụng thành thạo ngay ca đầu tiên, hỗ trợ kỹ thuật xuyên suốt.', src: '/editor-templates/workspace.jpg' },
      ]
      const variants = steps.map((s) => captureFrameVariant([frame, ...makeStepChildren(s.badge, s.caption, s.src)], frame, s.id, s.btnText))
      const hydratedFrame: FreeElement = { ...frame, props: { ...frame.props, _variants: variants, _variant: variants[0].id } }
      const stepButtons = steps.map((s, i) =>
        makeElement('button', {
          x: 80,
          y: 210 + i * 106,
          w: 460,
          h: 88,
          props: {
            text: s.btnText,
            href: `#state:${frameId}:${s.id}`,
            bg: '#f8fafc',
            color: '#1e293b',
            borderW: 1.5,
            borderColor: '#e2e8f0',
            radius: 18,
            size: 16,
            weight: 700,
            font: 'Manrope',
            _states: {
              desktop: {
                active: { backgroundColor: '#fefce8', borderColor: '#eab308', color: '#0f172a', transitionMs: 160 },
                hover: { borderColor: '#94a3b8', transitionMs: 150 },
              },
            },
          },
        }),
      )
      return [
        makeElement('heading', { x: 80, y: 88, w: 460, h: 96, props: { text: 'Triển khai trọn gói chỉ trong 3 bước', level: 2, size: 38, weight: 800, lh: 1.18, color: '#0f172a', font: 'Manrope' } }),
        ...stepButtons,
        hydratedFrame,
        ...makeStepChildren(steps[0].badge, steps[0].caption, steps[0].src),
      ]
    },
  },
  {
    id: 'faq-accordion',
    label: 'Câu hỏi thu gọn (Accordion FAQ)',
    height: 540,
    bg: '#f8fafc',
    build: () => [
      makeElement('text', { x: 80, y: 76, w: 220, h: 30, props: { text: 'HỎI ĐÁP NHANH', size: 12, weight: 700, spacing: 1.8, color: '#15803d', font: 'Manrope' } }),
      makeElement('heading', { x: 80, y: 114, w: 390, h: 108, props: { text: 'Giải đáp mọi thắc mắc trước khi triển khai', level: 2, size: 38, weight: 800, lh: 1.18, color: '#0f172a', font: 'Manrope' } }),
      makeElement('text', { x: 80, y: 236, w: 380, h: 72, props: { text: 'Chưa thấy câu hỏi của bạn? Đội ngũ tư vấn luôn sẵn sàng hỗ trợ trực tiếp trong 5 phút.', size: 16, lh: 1.55, color: '#475569', font: 'Inter' } }),
      makeElement('button', { x: 80, y: 328, w: 210, h: 52, props: { text: 'Chat với chuyên viên', bg: '#111827', color: '#ffffff', radius: 999, size: 15, weight: 700, font: 'Manrope', href: '/lien-he' } }),
      makeElement('accordion', {
        x: 516,
        y: 72,
        w: 604,
        h: 404,
        props: {
          exclusive: true,
          iconStyle: 'plus',
          accent: '#eab308',
          openBg: '#fefce8',
          radius: 16,
          gap: 12,
          font: 'Manrope',
          items: [
            { question: 'Chi phí thuê trọn gói đã bao gồm phần mềm POS chưa?', answer: 'Đã bao gồm đầy đủ máy tính bảng tại bàn, chân đế chống trộm, phần mềm gọi món và đồng bộ máy in bếp, không phát sinh phụ phí ẩn.', defaultOpen: true },
            { question: 'Khi mạng Wi-Fi chập chờn thì gọi món có bị gián đoạn không?', answer: 'Hệ thống ưu tiên đồng bộ qua mạng nội bộ (LAN) tại nhà hàng, đảm bảo đơn gọi món vẫn chuyển xuống bếp tức thì và ổn định.', defaultOpen: false },
            { question: 'Thiết bị rơi vỡ hoặc hư hỏng trong quá trình sử dụng xử lý thế nào?', answer: 'Gói bảo hành 1 đổi 1 tận nơi trong 24 giờ giúp nhà hàng luôn duy trì đủ số lượng máy phục vụ khách.', defaultOpen: false },
            { question: 'Nhà hàng có thể tự cập nhật món hết hàng hoặc đổi giá ngay không?', answer: 'Quản lý có thể bật/tắt món tạm hết hoặc cập nhật giá theo khung giờ chỉ với 1 chạm, đồng bộ lên toàn bộ tablet trong 1 giây.', defaultOpen: false },
          ],
        },
      }),
    ],
  },
  {
    id: 'motion-hero', label: 'Hero ảnh nổi', height: 560, bg: '#eff6f2',
    build: () => [
      makeElement('heading', { x: 90, y: 120, w: 550, h: 140, props: { text: 'Chạm vào\ncảm hứng mới', size: 58, color: '#17251e', _motion: { entrance: { preset: 'text-lines', duration: 600, delay: 0 } } } }),
      P('Ảnh nổi nhẹ sau khi xuất hiện. Mọi chi tiết đều chỉnh được trong bảng Hiệu ứng.', { x: 90, y: 300, w: 490, h: 90, size: 22 }),
      Btn('Khám phá', 90, 420),
      makeElement('image', { x: 700, y: 90, w: 390, h: 370, props: { src: '/editor-demo/mountain.jpg', alt: 'Dãy núi', radius: 32, _motion: { entrance: { preset: 'pop', duration: 600, delay: 0 }, loop: { preset: 'float', duration: 2000, delay: 0, iterations: 3, amount: 12 } } } }),
    ],
  },
  {
    id: 'motion-gallery', label: 'Bộ ảnh xuất hiện nối tiếp', height: 500, bg: '#f8fafc',
    build: () => [
      H('Những góc nhìn mới', { x: 90, y: 50, w: 900, h: 70, size: 42 }),
      ...['/editor-demo/trail.jpg', '/editor-templates/workspace.jpg', '/editor-templates/cafe.jpg'].map((src, i) => makeElement('image', { x: 90 + i * 350, y: 160, w: 320, h: 270, props: { src, alt: ['Đường núi', 'Không gian làm việc', 'Quán café'][i], radius: 20, _motion: { entrance: { preset: i % 2 ? 'reveal-up' : 'reveal-left', duration: 600, delay: i * 180 } } } })),
    ],
  },
  {
    id: 'motion-orbit', label: 'Quỹ đạo và vòng sóng', height: 520, bg: '#10251b',
    build: () => [
      H('Chuyển động theo cách của bạn', { x: 90, y: 100, w: 590, h: 150, size: 52, color: '#fff' }),
      P('Chọn từng hình hoặc biểu tượng để thay màu, đổi vị trí và chỉnh nhịp chuyển động.', { x: 90, y: 290, w: 530, h: 100, size: 22, color: '#bbd5c6' }),
      ...[0, 1].map((i) => makeElement('shape', { x: 820, y: 190, w: 120, h: 120, props: { bg: 'transparent', radius: 999, borderW: 2, borderColor: '#86efac', _motion: { entrance: { preset: 'fade', duration: 600, delay: 0 }, loop: { preset: 'ripple', duration: 2000, delay: i * 600, iterations: 3, amount: 40 } } } })),
      makeElement('icon', { x: 848, y: 218, w: 64, h: 64, props: { name: 'star', color: '#bbf7d0', _motion: { entrance: { preset: 'zoom', duration: 600, delay: 0 }, loop: { preset: 'orbit', duration: 4000, delay: 0, iterations: 3, amount: 80 } } } }),
    ],
  },
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

// Real frame hierarchies: cells accept arbitrary elements and registered widgets.
const grid = (id: string, label: string, rows: number, cols: number): SectionTemplate => {
  return {
    id,
    label,
    height: rows === 2 ? 720 : 440,
    bg: '#f3f4f6',
    build: () => createFrameLayout(rows === 2 && cols === 2 ? 'grid' : rows === 2 ? 'rows' : cols === 3 ? 'thirds' : cols === 2 ? 'halves' : 'single'),
  }
}
SECTION_TEMPLATES_MORE.unshift(grid('container-1x1', 'Container 1x1', 1, 1), grid('container-1x2', 'Container 1x2 (2 hàng)', 2, 1), grid('container-2x1', 'Container 2x1 (2 cột)', 1, 2), grid('container-1x3', 'Container 1x3 (3 cột)', 1, 3), grid('container-2x2', 'Container 2x2', 2, 2))
SECTION_TEMPLATES.push(...SECTION_TEMPLATES_MORE)
