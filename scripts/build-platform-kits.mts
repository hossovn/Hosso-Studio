import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { coreBlocks } from '../packages/blocks/src/core-blocks.ts'
import * as shop from '../packages/plugin-shop/src/blocks.ts'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { zipSync, strToU8 } = require('fflate')
const directory = new URL('../seed/sites/', import.meta.url)
await mkdir(directory, { recursive: true })
const schemas = [...coreBlocks, ...Object.values(shop)].filter((item: any) => item?.type)
let sequence = 0
const block = (type: string, props: Record<string, unknown> = {}) => ({ type, props: { ...(schemas.find((item: any) => item.type === type)?.defaultProps || {}), id: `kit-${++sequence}`, ...props } })
const page = (slug: string, title: string, blocks: any[], noindex = false) => ({ slug, status: 'draft', seo: { noindex }, translations: { vi: { title, description: `Thông tin ${title.toLowerCase()}, cách đăng ký và hỗ trợ từ đội ngũ của chúng tôi.`, content: { root: { props: {} }, content: blocks } } } })
const text = (heading: string, body: string) => block('Text', { heading, body })
const field = (name: string, label: string, type = 'text', required = true, extra = {}) => ({ name, type, required, translations: { vi: { label, ...extra } } })
const kitForm = (slug: string, title: string, extra: any[] = []) => ({ slug, successHref: `/${slug}-cam-on`, fields: [field('name', 'Họ và tên'), field('email', 'Email', 'email'), field('phone', 'Điện thoại', 'tel', false), ...extra], translations: { vi: { title, submitLabel: 'Gửi yêu cầu', successMessage: 'Đã nhận thông tin. Chúng tôi sẽ liên hệ xác nhận.' } } })
const footer = (slug: string) => block('Footer', { text: '[CẦN ĐIỀN: Tên đơn vị và thông tin liên hệ]', links: [{ label: 'Thông tin đăng ký', href: `/${slug}` }] })
const thanks = (slug: string) => page(`${slug}-cam-on`, 'Cảm ơn bạn đã đăng ký', [block('Hero', { title: 'Chúng tôi đã nhận thông tin', subtitle: 'Đội ngũ sẽ kiểm tra yêu cầu và liên hệ xác nhận. Vui lòng giữ email hoặc số điện thoại đã đăng ký.', ctaLabel: 'Quay lại', ctaHref: `/${slug}`, image: '' }), text('Bước tiếp theo', 'Bạn chưa cần thanh toán tại bước này. Nếu cần sửa thông tin, hãy liên hệ qua kênh chính thức của đơn vị.'), footer(slug)], true)
const checklist = ['Thay các phần [CẦN ĐIỀN] bằng nội dung đã xác minh.', 'Điền email nhận lead hoặc webhook trong cấu hình biểu mẫu.', 'Kiểm tra mobile, SEO và xuất bản cả trang chính lẫn trang cảm ơn.', 'Thiết lập thông tin liên hệ và quyền riêng tư phù hợp với hoạt động thực tế.']
async function save(id: string, title: string, category: string, pages: any[], forms: any[], plugins: string[] = [], extra: string[] = []) {
  const manifest = { format: 2, product: 'Hosso Studio', title, category, installMode: 'additive', startPage: pages[0].slug, locales: ['vi'], themes: [], plugins, checklist: [...checklist, ...extra], counts: { pages: pages.length, forms: forms.length, media: 0 } }
  const files = Object.fromEntries(Object.entries({ 'manifest.json': manifest, 'data/pages.json': pages, 'data/forms.json': forms }).map(([name, value]) => [name, strToU8(JSON.stringify(value, null, 2))]))
  await writeFile(new URL(`${id}.hosso-site.zip`, directory), zipSync(files, { level: 6, mtime: new Date('2026-11-17T00:00:00Z') }))
  console.log(`${id}: ${pages.length} draft pages, ${forms.length} forms`)
}
const goals = [
  { slug: 'nhan-tai-lieu', title: 'Thu lead · Tài liệu hữu ích', headline: 'Bắt đầu với hướng dẫn phù hợp nhu cầu của bạn', benefit: 'Bạn sẽ nhận được gì?', body: '[CẦN ĐIỀN: Tên tài liệu, nội dung thực tế và cách nhận sau đăng ký.]', offer: 'Nhận tài liệu', extra: [field('need', 'Bạn quan tâm nội dung nào?', 'textarea', false)] },
  { slug: 'tu-van', title: 'Đặt lịch tư vấn', headline: 'Trao đổi nhu cầu trước khi lựa chọn giải pháp', benefit: 'Buổi tư vấn diễn ra thế nào?', body: 'Gửi nhu cầu → đội ngũ liên hệ → xác nhận thời gian phù hợp.\n\n[CẦN ĐIỀN: Thời lượng, người phụ trách và phạm vi tư vấn.]', offer: 'Yêu cầu tư vấn', extra: [field('need', 'Nhu cầu cần tư vấn', 'textarea'), field('preferred_time', 'Khung giờ mong muốn', 'text', false)] },
  { slug: 'ra-mat', title: 'Ra mắt sản phẩm', headline: 'Khám phá sản phẩm sắp ra mắt', benefit: 'Điểm mới dành cho bạn', body: '[CẦN ĐIỀN: Tính năng đã xác nhận, ngày ra mắt và phạm vi cung cấp.]', offer: 'Nhận thông tin ra mắt', extra: [field('interest', 'Bạn muốn được cập nhật điều gì?', 'textarea', false)] },
  { slug: 'ban-san-pham', title: 'Landing bán một sản phẩm', headline: 'Chọn sản phẩm phù hợp với nhu cầu của bạn', benefit: 'Thông tin trước khi đặt mua', body: '[CẦN ĐIỀN: Lợi ích đã kiểm chứng, thông số và đối tượng phù hợp. Chọn sản phẩm bằng tham số ?p=ma-san-pham khi chia sẻ trang.]', offer: 'Nhờ tư vấn sản phẩm', extra: [field('question', 'Bạn cần hỗ trợ điều gì?', 'textarea', false)], commerce: true },
  { slug: 'su-kien', title: 'Đăng ký sự kiện', headline: 'Gặp gỡ, trao đổi và tìm cơ hội mới', benefit: 'Chương trình sự kiện', body: '[CẦN ĐIỀN: Ngày giờ, địa điểm, diễn giả đã xác nhận, lịch trình và số chỗ thực tế.]', offer: 'Đăng ký tham dự', extra: [field('organization', 'Đơn vị / tổ chức', 'text', false), field('attendees', 'Số người đăng ký', 'number')] },
]
for (const goal of goals) {
  const form = kitForm(goal.slug, goal.offer, goal.extra)
  const blocks = [block('Hero', { title: goal.headline, subtitle: goal.body, ctaLabel: goal.offer, ctaHref: '#hs-section-dang-ky', image: '' }),
    block('Features', { heading: goal.benefit, items: [{ title: 'Thông tin rõ ràng', description: '[CẦN ĐIỀN: Lợi ích thứ nhất có thể xác minh.]' }, { title: 'Phù hợp nhu cầu', description: '[CẦN ĐIỀN: Lợi ích thứ hai có thể xác minh.]' }, { title: 'Hỗ trợ trực tiếp', description: '[CẦN ĐIỀN: Cách hỗ trợ và phạm vi áp dụng.]' }] }),
    text('Minh chứng', '[CẦN ĐIỀN: Dự án thực tế, ảnh đã được phép sử dụng hoặc phản hồi đã được khách hàng cho phép công bố.]'),
    ...(goal.commerce ? [block('ShopProductDetail', { backPath: '/san-pham', cartPath: '/gio-hang' })] : [text('Thông tin đăng ký', goal.body)]),
    text('Câu hỏi thường gặp', '**Khi nào yêu cầu được xác nhận?**\nĐội ngũ sẽ liên hệ sau khi tiếp nhận. [CẦN ĐIỀN: Thời gian phản hồi thực tế.]\n\n**Tôi có thể thay đổi thông tin không?**\nCó. Liên hệ kênh hỗ trợ chính thức để yêu cầu chỉnh sửa.\n\n**Thông tin được dùng thế nào?**\n[CẦN ĐIỀN: Mục đích xử lý, thời hạn lưu và kênh liên hệ.]'),
    block('Form', { id: 'dang-ky', form: goal.slug, heading: goal.offer, _anchor: 'Đăng ký' }), footer(goal.slug)]
  await save(`hosso-${goal.slug}`, goal.title, 'Landing page', [page(goal.slug, goal.title, blocks), thanks(goal.slug)], [form], goal.commerce ? ['shop'] : [], goal.commerce ? ['Cài bộ Cửa hàng để có giỏ hàng, checkout và tra cứu đơn.', 'Tạo sản phẩm thật trong Cửa hàng; chia sẻ URL có ?p=ma-san-pham.'] : [])
}
const nav = () => block('NavMenu', { items: [{ label: 'Cửa hàng', href: '/cua-hang' }, { label: 'Sản phẩm', href: '/san-pham' }, { label: 'Giỏ hàng', href: '/gio-hang' }, { label: 'Tra cứu đơn', href: '/trang-thai-don' }, { label: 'Tài khoản', href: '/tai-khoan' }] })
const commercePage = (slug: string, title: string, blocks: any[], noindex = false) => page(slug, title, [nav(), ...blocks, block('Footer', { text: '[CẦN ĐIỀN: Tên cửa hàng và thông tin liên hệ]', links: [{ label: 'Giao hàng', href: '/chinh-sach-giao-hang' }, { label: 'Đổi trả', href: '/chinh-sach-doi-tra' }, { label: 'Quyền riêng tư', href: '/quyen-rieng-tu' }, { label: 'Liên hệ', href: '/lien-he-cua-hang' }] })], noindex)
const commercePages = [
  commercePage('cua-hang', 'Cửa hàng', [block('Hero', { title: 'Sản phẩm và hỗ trợ dành cho bạn', subtitle: '[CẦN ĐIỀN: Thông điệp và cam kết thực tế của cửa hàng.]', image: '', ctaLabel: 'Khám phá sản phẩm', ctaHref: '/san-pham' }), block('ShopCategories'), block('ShopProductGrid', { heading: 'Sản phẩm nổi bật', pageSize: 8, pager: 'no', columns: 4 })]),
  commercePage('san-pham', 'Sản phẩm', [block('ShopCategories'), block('ShopProductGrid', { columns: 4 })]),
  commercePage('chi-tiet', 'Chi tiết sản phẩm', [block('ShopProductDetail')]),
  commercePage('gio-hang', 'Giỏ hàng', [block('ShopCart')], true),
  commercePage('thanh-toan', 'Thanh toán', [block('ShopCheckout', { layout: 'split' })], true),
  commercePage('trang-thai-don', 'Tra cứu đơn và đổi trả', [block('ShopOrderStatus')], true),
  commercePage('tai-khoan', 'Tài khoản', [block('AccountPortal', { heading: 'Tài khoản của tôi', navigation: 'sidebar', showGarage: 'yes' })], true),
  commercePage('yeu-thich', 'Sản phẩm yêu thích', [block('ShopWishlist')], true),
  commercePage('chinh-sach-giao-hang', 'Chính sách giao hàng', [text('Giao hàng và nhận tại cửa hàng', '[CẦN ĐIỀN: Khu vực phục vụ, phí, thời gian xử lý, đơn vị vận chuyển và cách tra cứu. Nội dung phải khớp cấu hình giao vận.]')]),
  commercePage('chinh-sach-doi-tra', 'Chính sách đổi trả', [text('Yêu cầu đổi trả', '[CẦN ĐIỀN: Điều kiện áp dụng, thời hạn, phí và quy trình đã được đơn vị phê duyệt.]\n\nBạn có thể mở liên kết tra cứu đơn để gửi yêu cầu kèm ảnh. Đội ngũ sẽ xem xét và thông báo kết quả; việc gửi yêu cầu chưa đồng nghĩa với chấp thuận hoàn tiền.')]),
  commercePage('quyen-rieng-tu', 'Thông tin quyền riêng tư', [text('Dữ liệu và quyền lựa chọn', '[CẦN ĐIỀN: Đơn vị xử lý, loại dữ liệu, mục đích, thời hạn lưu, bên nhận dữ liệu và kênh yêu cầu. Rà soát theo hoạt động thực tế trước khi xuất bản.]')]),
  commercePage('lien-he-cua-hang', 'Liên hệ cửa hàng', [block('Form', { form: 'lien-he-cua-hang', heading: 'Gửi yêu cầu hỗ trợ' })]),
  thanks('lien-he-cua-hang'),
]
await save('hosso-cua-hang', 'Cửa hàng · Hành trình mua sắm đầy đủ', 'Cửa hàng', commercePages, [kitForm('lien-he-cua-hang', 'Liên hệ cửa hàng', [field('message', 'Nội dung', 'textarea')])], ['shop', 'accounts', 'payment'], ['Nhập catalog thật hoặc kết nối nguồn hàng hiện có.', 'Cấu hình COD / tài khoản nhận tiền, webhook và phương thức giao hàng.', 'Nghiệm thu đơn thử từ checkout đến thanh toán, giao hàng và đổi trả.', 'Chọn /cua-hang làm điểm đến menu; bộ mẫu không đổi trang chủ hiện có.'])
