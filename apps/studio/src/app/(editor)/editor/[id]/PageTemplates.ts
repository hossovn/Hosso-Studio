import { makeElement, type Pattern } from '@hosso/studio-blocks'
import type { SectionTemplate } from './SectionTemplates'

export const TEMPLATE_CATEGORIES = [
  { id: 'business', label: 'Doanh nghiệp' },
  { id: 'shop', label: 'Cửa hàng' },
  { id: 'dining', label: 'Nhà hàng / Café' },
  { id: 'portfolio', label: 'Portfolio' },
] as const

export type PageTemplate = {
  id: string
  label: string
  category: (typeof TEMPLATE_CATEGORIES)[number]['id']
  sections: SectionTemplate[]
}
type Design = Pick<PageTemplate, 'id' | 'label' | 'category'> & {
  brand: string
  image: string
  accent: string
  centered: boolean
  intro: string
  heading: string
  items: [string, string][]
}

const designs: Design[] = [
  { id: 'nova-consulting', category: 'business', label: 'Tư vấn doanh nghiệp', brand: 'NOVA CONSULTING', image: 'workspace', accent: '#255d83', centered: false,
    intro: 'Chiến lược rõ ràng. Giải pháp thiết thực. Cùng doanh nghiệp xây dựng bước phát triển tiếp theo.', heading: 'Giải pháp cho doanh nghiệp',
    items: [['Chiến lược', 'Định hướng phát triển từ mục tiêu và nguồn lực của doanh nghiệp.'], ['Vận hành', 'Tinh gọn quy trình, kết nối đội ngũ và nâng cao hiệu quả.'], ['Thương hiệu', 'Xây dựng bản sắc nhất quán trong từng điểm chạm.']] },
  { id: 'orbit-team', category: 'business', label: 'Đội ngũ & startup', brand: 'ORBIT', image: 'workspace', accent: '#343f94', centered: true,
    intro: 'Một đội ngũ, nhiều góc nhìn. Biến những ý tưởng có giá trị thành sản phẩm thực tế.', heading: 'Từ ý tưởng đến thực thi',
    items: [['Khám phá', 'Hiểu bài toán, người dùng và cơ hội trước khi bắt đầu.'], ['Thiết kế', 'Thử nghiệm những giải pháp dễ hiểu và dễ sử dụng.'], ['Phát triển', 'Đồng hành cùng sản phẩm qua từng giai đoạn trưởng thành.']] },
  { id: 'meridian-watch', category: 'shop', label: 'Bộ sưu tập đồng hồ', brand: 'MERIDIAN', image: 'watch', accent: '#273b38', centered: false,
    intro: 'Dành thời gian cho những điều xứng đáng. Khám phá thiết kế thanh lịch cho mỗi ngày.', heading: 'Tinh tế trong từng chi tiết',
    items: [['Thiết kế tối giản', 'Những đường nét rõ ràng, dễ kết hợp cùng phong cách riêng.'], ['Chất liệu chọn lọc', 'Chú trọng cảm giác đeo và độ hoàn thiện của sản phẩm.'], ['Tư vấn cá nhân', 'Tìm một thiết kế phù hợp cho bạn hoặc người thân.']] },
  { id: 'form-collection', category: 'shop', label: 'Cửa hàng tối giản', brand: 'FORM COLLECTION', image: 'watch', accent: '#675176', centered: true,
    intro: 'Ít hơn, nhưng có chủ đích. Những thiết kế vượt qua mùa và xu hướng.', heading: 'Một bộ sưu tập có chọn lọc',
    items: [['Everyday', 'Những món đồ đồng hành cùng nhịp sống thường ngày.'], ['Signature', 'Một điểm nhấn riêng, không cần quá nhiều chi tiết.'], ['Gifting', 'Gửi gắm sự quan tâm qua những lựa chọn tinh tế.']] },
  { id: 'moc-coffee', category: 'dining', label: 'Quán café', brand: 'MỘC COFFEE', image: 'cafe', accent: '#34624a', centered: false,
    intro: 'Một tách cà phê ngon, một khoảng thời gian riêng. Hẹn bạn tại góc quen của thành phố.', heading: 'Một chút chậm lại',
    items: [['Cà phê', 'Hương vị quen thuộc, pha chế theo cách bạn yêu thích.'], ['Bánh trong ngày', 'Những chiếc bánh nhỏ dành cho cuộc hẹn bên tách cà phê.'], ['Không gian', 'Một góc yên tĩnh để đọc, làm việc và gặp gỡ.']] },
  { id: 'bep-bistro', category: 'dining', label: 'Nhà hàng & bistro', brand: 'BẾP BISTRO', image: 'restaurant', accent: '#873d4a', centered: true,
    intro: 'Một bàn ăn, nhiều câu chuyện. Hương vị theo mùa dành cho những cuộc gặp đáng nhớ.', heading: 'Từ căn bếp đến bàn ăn',
    items: [['Theo mùa', 'Thực đơn lấy cảm hứng từ những nguyên liệu trong mùa.'], ['Bữa tối', 'Những món ăn để cùng chia sẻ và thưởng thức.'], ['Cuộc hẹn riêng', 'Không gian dành cho gia đình, bạn bè và những dịp đặc biệt.']] },
  { id: 'an-photo', category: 'portfolio', label: 'Nhiếp ảnh gia', brand: 'AN PHOTOGRAPHY', image: '/editor-demo/mountain.jpg', accent: '#315572', centered: false,
    intro: 'Ghi lại ánh sáng, khoảng cách và những khoảnh khắc không lặp lại.', heading: 'Những góc nhìn khác',
    items: [['Phong cảnh', 'Một hành trình qua những vùng đất và nhịp sống.'], ['Câu chuyện', 'Những bộ ảnh bắt đầu từ một cuộc gặp gỡ.'], ['Hợp tác', 'Hình ảnh dành cho thương hiệu, ấn phẩm và dự án độc lập.']] },
  { id: 'field-studio', category: 'portfolio', label: 'Studio sáng tạo', brand: 'FIELD STUDIO', image: '/editor-demo/trail.jpg', accent: '#514873', centered: true,
    intro: 'Thiết kế từ quan sát. Tạo dựng bản sắc cho những ý tưởng muốn đi xa.', heading: 'Góc nhìn của chúng tôi',
    items: [['Identity', 'Hệ thống nhận diện nhất quán và có cá tính.'], ['Digital', 'Những trải nghiệm số rõ ràng và có chủ đích.'], ['Art direction', 'Kết nối câu chuyện, hình ảnh và cảm xúc trong một ngôn ngữ.']] },
]

export const PAGE_TEMPLATES: PageTemplate[] = designs.map((d) => {
  const image = d.image.startsWith('/') ? d.image : '/editor-templates/' + d.image + '.jpg'
  const heading = (text: string, x: number, y: number, w: number, h: number, size: number, color = '#202924', level = 2, align = 'left') => makeElement('heading', { x, y, w, h, props: { text, size, color, level, align } })
  const text = (value: string, x: number, y: number, w: number, h: number, color = '#5c6860', align = 'left') => makeElement('text', { x, y, w, h, props: { text: value, size: 19, lh: 1.6, color, align } })
  const align = d.centered ? 'center' : 'left'
  const hero: SectionTemplate = { id: d.id + '-hero', label: d.label, height: 560, bg: '#25332b', build: () => [
    makeElement('image', { x: 0, y: 0, w: 1200, h: 560, props: { src: image, alt: d.label, fit: 'cover' } }),
    makeElement('shape', { x: 0, y: 0, w: 1200, h: 560, props: { bg: 'rgba(14,24,19,0.43)' } }),
    heading(d.brand, 80, 154, 1040, 110, 62, '#ffffff', 1, align),
    text(d.intro, d.centered ? 260 : 80, 284, 680, 86, '#ffffff', align),
    makeElement('button', { x: d.centered ? 490 : 80, y: 410, w: 220, h: 54, props: { text: 'Liên hệ', href: 'mailto:hello@example.com', bg: '#ffffff', color: '#25332b', radius: 4, size: 17 } }),
  ] }
  const details: SectionTemplate = { id: d.id + '-details', label: d.heading, height: 500, bg: '#ffffff', build: () => d.centered ? [
    makeElement('image', { x: 64, y: 56, w: 440, h: 388, props: { src: image, alt: d.heading, fit: 'cover', radius: 4 } }),
    heading(d.heading, 560, 56, 576, 76, 34),
    ...d.items.flatMap(([title, body], i) => [heading(title, 560, 156 + i * 104, 576, 34, 22, d.accent, 3), text(body, 560, 192 + i * 104, 576, 64)]),
  ] : [
    heading(d.heading, 64, 56, 1072, 72, 38),
    ...d.items.flatMap(([title, body], i) => [
      makeElement('line', { x: 64 + i * 368, y: 186, w: 300, h: 4, props: { color: d.accent, thickness: 2 } }),
      heading(title, 64 + i * 368, 220, 336, 72, 27, '#202924', 3),
      text(body, 64 + i * 368, 310, 320, 112),
    ]),
  ] }
  const contact: SectionTemplate = { id: d.id + '-contact', label: 'Liên hệ', height: 280, bg: d.accent, build: () => [
    heading('Bắt đầu một cuộc trò chuyện', 64, 56, 760, 72, 38, '#ffffff'),
    text('hello@example.com', 64, 148, 650, 44, '#ffffff'),
    makeElement('button', { x: 880, y: 108, w: 256, h: 56, props: { text: 'Gửi lời nhắn', href: 'mailto:hello@example.com', bg: '#ffffff', color: d.accent, radius: 4, size: 17 } }),
  ] }
  return { id: d.id, label: d.label, category: d.category, sections: [hero, details, contact] }
})

export const pageTemplatePattern = (template: PageTemplate): Pattern => ({
  id: template.id, label: template.label, en: template.label,
  blocks: template.sections.map((section) => ({ type: 'FreeCanvas', props: { height: section.height, _bgHex: section.bg, _els: section.build() } })),
})
