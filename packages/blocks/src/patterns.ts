// Thư viện mẫu khối: mỗi mẫu là một dãy khối đã điền sẵn, chèn vào cuối trang rồi sửa lại trong trình dựng.
export type Pattern = { id: string; label: string; en: string; blocks: { type: string; props: Record<string, unknown> }[] }

const feat = (heading: string, items: [string, string][]) => ({ type: 'Features', props: { heading, items: items.map(([title, description]) => ({ title, description })) } })

export const patterns: Pattern[] = [
  {
    id: 'hero-benefits',
    label: 'Banner và 3 lợi ích',
    en: 'Banner with 3 benefits',
    blocks: [
      { type: 'Hero', props: { title: 'Tiêu đề thu hút khách hàng', subtitle: 'Một câu nêu rõ bạn mang lại điều gì cho khách.', ctaLabel: 'Xem ngay', ctaHref: '#', image: '' } },
      feat('Vì sao chọn chúng tôi', [['Chính hãng', 'Nguồn gốc rõ ràng, có hóa đơn.'], ['Giao nhanh', 'Giao toàn quốc, nhận hàng rồi trả tiền.'], ['Hỗ trợ tận tâm', 'Tư vấn đúng nhu cầu, đổi trả dễ dàng.']]),
    ],
  },
  {
    id: 'image-left',
    label: 'Ảnh trái, chữ phải',
    en: 'Image left, text right',
    blocks: [{ type: 'TwoColumns', props: { image: '', imageSide: 'left', imageFit: 'cover', heading: 'Giới thiệu ngắn', body: 'Viết 2 đến 3 câu về doanh nghiệp hoặc sản phẩm.\n\n- Điểm mạnh thứ nhất\n- Điểm mạnh thứ hai', ctaLabel: 'Liên hệ', ctaHref: '/lien-he' } }],
  },
  {
    id: 'image-right',
    label: 'Chữ trái, ảnh phải (nền xám)',
    en: 'Text left, image right (gray background)',
    blocks: [{ type: 'TwoColumns', props: { image: '', imageSide: 'right', imageFit: 'cover', heading: 'Dịch vụ nổi bật', body: 'Mô tả dịch vụ và lợi ích cho khách hàng.', ctaLabel: 'Tìm hiểu thêm', ctaHref: '#', _bg: 'surface' } }],
  },
  {
    id: 'cta-dark',
    label: 'Kêu gọi hành động (nền đen)',
    en: 'Call to action (dark)',
    blocks: [{ type: 'Hero', props: { title: 'Sẵn sàng bắt đầu?', subtitle: 'Gọi ngay hoặc để lại thông tin, chúng tôi phản hồi trong ngày.', ctaLabel: 'Liên hệ ngay', ctaHref: '/lien-he', image: '', _bg: 'dark', _align: 'center' } }],
  },
  {
    id: 'values-4',
    label: 'Bốn giá trị cốt lõi',
    en: 'Four core values',
    blocks: [feat('Giá trị cốt lõi', [['Tận tâm', 'Đặt khách hàng làm trung tâm.'], ['Trung thực', 'Minh bạch về giá và nguồn gốc.'], ['Trách nhiệm', 'Làm đúng cam kết.'], ['Đồng đội', 'Yêu thương và hỗ trợ nhau.']])],
  },
  {
    id: 'about-split',
    label: 'Về chúng tôi (ảnh dọc và các mục)',
    en: 'About us (tall image and sections)',
    blocks: [{ type: 'ImageSections', props: { image: '', title: 'Về chúng tôi', sections: [{ heading: 'Giới thiệu', body: 'Giới thiệu ngắn về công ty.' }, { heading: 'Tầm nhìn', body: 'Điều bạn hướng tới.' }, { heading: 'Cam kết', body: '- Cam kết thứ nhất\n- Cam kết thứ hai' }] } }],
  },
  {
    id: 'faq',
    label: 'Câu hỏi thường gặp',
    en: 'Frequently asked questions',
    blocks: [{ type: 'Text', props: { heading: 'Câu hỏi thường gặp', body: '**Giao hàng mất bao lâu?**\nTrong 1 đến 3 ngày tùy khu vực.\n\n**Có được đổi trả không?**\nCó, theo chính sách đổi trả của cửa hàng.\n\n**Thanh toán bằng cách nào?**\nTiền mặt khi nhận hàng hoặc chuyển khoản.' } }],
  },
  {
    id: 'trust-strip',
    label: 'Thanh cam kết',
    en: 'Trust bar',
    blocks: [{ type: 'TrustBar', props: { items: [{ text: 'Hỗ trợ 24/7' }, { text: 'Giao toàn quốc' }, { text: 'Hàng chính hãng' }, { text: 'Đổi trả trong 7 ngày' }] } }],
  },
]
