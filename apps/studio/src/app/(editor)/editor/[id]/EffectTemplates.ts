import { makeElement, type FreeElement } from '@hosso/studio-blocks'
import type { SectionTemplate } from './SectionTemplates'

const mobile = (el: FreeElement, x: number, y: number, w: number, h: number, props: Record<string, unknown> = {}) => ({ ...el, responsive: { mobile: { x: x * 1200 / 390, y: y * 1200 / 390, w: w * 1200 / 390, h: h * 1200 / 390, props } } })
const entrance = (delay = 0) => ({ entrance: { preset: 'slide-up', duration: 600, delay } })
const heading = (text: string) => mobile(makeElement('heading', { x: 80, y: 52, w: 1040, h: 64, props: { text, size: 42, weight: 800, color: '#111827', font: 'Manrope' } }), 24, 32, 342, 80, { size: 30 * 1200 / 390 })
const description = (text: string) => mobile(makeElement('text', { x: 80, y: 124, w: 1000, h: 58, props: { text, size: 18, color: '#64748b', lh: 1.6 } }), 24, 112, 342, 72, { size: 16 * 1200 / 390 })

export const EFFECT_TEMPLATES: SectionTemplate[] = [
  {
    id: 'effect-comparison', label: 'Ảnh trước / sau kéo so sánh', height: 680, bg: '#ffffff',
    extraProps: { _responsive: { mobile: { height: 550 * 1200 / 390 } } },
    build: () => [
      heading('Nhìn thấy sự khác biệt'),
      description('Kéo thanh phân cách để khám phá hai hình ảnh và nhìn rõ sự khác biệt trong từng chi tiết.'),
      mobile(makeElement('comparison', { x: 80, y: 210, w: 1040, h: 410, props: { beforeSrc: '/editor-demo/mountain.jpg', afterSrc: '/editor-demo/trail.jpg', beforeAlt: 'Ảnh minh họa dãy núi', afterAlt: 'Ảnh minh họa đường mòn', radius: 20, _motion: entrance() } }), 24, 210, 342, 285),
    ],
  },
  {
    id: 'effect-statistics', label: 'Số liệu đếm tăng khi cuộn', height: 420, bg: '#f8fafc',
    extraProps: { _responsive: { mobile: { height: 650 * 1200 / 390 } } },
    build: () => [
      heading('Những con số tạo nên niềm tin'),
      description('Kinh nghiệm, sự tận tâm và chất lượng được thể hiện qua từng dự án.'),
      ...[
        { value: '5.000', suffix: '+', label: 'Khách hàng' },
        { value: '3.000', suffix: '+', label: 'Dự án hoàn thành' },
        { value: '5', suffix: '+', label: 'Năm kinh nghiệm' },
        { value: '100', suffix: '%', label: 'Tận tâm phục vụ' },
      ].map((props, index) => mobile(makeElement('number', { x: 80 + index * 265, y: 230, w: 245, h: 120, props: { ...props, countUp: true, countDuration: 1600, size: 58, color: '#d9232e', labelColor: '#475569', font: 'Manrope' } }), 24 + index % 2 * 177, 225 + Math.floor(index / 2) * 175, 165, 145, { size: 38 * 1200 / 390 })),
    ],
  },
  {
    id: 'effect-gallery', label: 'Ảnh và nút có hiệu ứng hover', height: 650, bg: '#ffffff',
    extraProps: { _responsive: { mobile: { height: 1100 * 1200 / 390 } } },
    build: () => [
      heading('Khám phá từng góc nhìn'),
      description('Khám phá những trải nghiệm, dự án và dấu ấn nổi bật của chúng tôi.'),
      ...['/editor-demo/mountain.jpg', '/editor-demo/trail.jpg'].flatMap((src, index) => [
        mobile(makeElement('image', { x: 80 + index * 540, y: 220, w: 500, h: 260, props: { src, alt: index ? 'Đường mòn trên núi' : 'Khung cảnh dãy núi', radius: 18, _motion: entrance(index * 150), _states: { normal: { desktop: { transitionMs: 220 } }, hover: { desktop: { scale: 1.03 } } } } }), 24, 225 + index * 400, 342, 240),
        mobile(makeElement('button', { x: 80 + index * 540, y: 510, w: 200, h: 52, props: { text: 'Xem chi tiết', href: '/lien-he', bg: '#d9232e', color: '#ffffff', radius: 10, size: 16, _states: { normal: { desktop: { transitionMs: 220 } }, hover: { desktop: { translateY: -4, boxShadow: '0px 12px 24px 0px rgba(0,0,0,0.2)' } }, focus: { desktop: { translateY: -4 } } } } }), 24, 490 + index * 400, 200, 52, { size: 16 * 1200 / 390 }),
      ]),
    ],
  },
]
