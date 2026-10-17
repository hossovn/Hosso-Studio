// Kiểm tra tính năng nội dung qua site đang chạy (pnpm dev): phân quyền theo vai trò, chuyên mục/thẻ, bình luận,
// biểu mẫu, khối dùng lại, vùng giao diện, đa ngôn ngữ. Cần tài khoản admin trong apps/studio/.env. Dữ liệu thử tự dọn.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const SITE = process.env.SITE_URL || 'http://localhost:3000'
const env = Object.fromEntries(readFileSync(new URL('../apps/studio/.env', import.meta.url), 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const run = randomBytes(3).toString('hex')
let n = 0
const ok = (m) => console.log(`  ✓ ${m}`, ++n && '')

const api = async (token, method, path, body, headers = {}) => {
  const r = await fetch(SITE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `JWT ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, body: await r.json().catch(() => ({})) }
}
const login = async (email, password) => (await api(null, 'POST', '/api/users/login', { email, password })).body.token

const admin = await login(process.env.HOSSO_ADMIN_EMAIL || env.HOSSO_ADMIN_EMAIL, process.env.HOSSO_ADMIN_PASSWORD || env.HOSSO_ADMIN_PASSWORD)
assert.ok(admin, 'không đăng nhập được admin')

// ---- tạo người dùng cho từng vai trò ----
const pw = `T-${randomBytes(6).toString('hex')}`
const users = {}
for (const role of ['publisher', 'editor', 'author', 'moderator']) {
  const email = `${role}-${run}@test.local`
  const r = await api(admin, 'POST', '/api/users', { email, password: pw, roles: [role] })
  assert.equal(r.status, 201, `tạo ${role}: ${JSON.stringify(r.body).slice(0, 150)}`)
  users[role] = { id: r.body.doc.id, token: await login(email, pw) }
}
const T = (role) => users[role].token
const cleanup = []
const del = (token, path) => cleanup.push(() => api(token, 'DELETE', path))
const emptyContent = { root: { props: {} }, content: [] }
const block = (type, props) => ({ type, props: { id: `${type}-${run}`, ...props } })
const page = (slug, content = emptyContent, extra = {}) => ({ title: `Thử ${slug}`, slug, content, _status: 'draft', ...extra })

console.log('Phân quyền')
const pEd = await api(T('editor'), 'POST', '/api/pages', page(`ed-${run}`))
assert.equal(pEd.status, 201); del(admin, `/api/pages/${pEd.body.doc.id}`); ok('editor tạo trang nháp')
assert.equal((await api(T('editor'), 'PATCH', `/api/pages/${pEd.body.doc.id}`, { _status: 'published' })).status, 403); ok('editor không xuất bản được')
assert.equal((await api(T('editor'), 'DELETE', `/api/pages/${pEd.body.doc.id}`)).status, 403); ok('editor không xóa được')
assert.equal((await api(T('editor'), 'POST', '/api/globals/site-settings', { siteName: 'x' })).status, 403); ok('editor không sửa cài đặt site')
assert.equal((await api(T('publisher'), 'PATCH', `/api/pages/${pEd.body.doc.id}`, { _status: 'published' })).status, 200); ok('publisher xuất bản được')
assert.equal((await api(T('publisher'), 'POST', '/api/globals/site-settings', { siteName: 'x' })).status, 403); ok('publisher không sửa cài đặt site')
assert.equal((await api(T('publisher'), 'POST', '/api/users', { email: `x-${run}@t.local`, password: pw, roles: ['editor'] })).status, 403); ok('publisher không tạo người dùng')

const post1 = await api(T('author'), 'POST', '/api/posts', { title: `Bài ${run}`, slug: `bai-${run}`, _status: 'draft', content: emptyContent })
assert.equal(post1.status, 201); del(admin, `/api/posts/${post1.body.doc.id}`); ok('author tạo bài nháp')
assert.equal(post1.body.doc.createdBy?.id ?? post1.body.doc.createdBy, users.author.id); ok('bài của author gắn createdBy')
assert.equal((await api(T('author'), 'PATCH', `/api/posts/${post1.body.doc.id}?draft=true`, { title: 'Sửa', _status: 'draft' })).status, 200); ok('author sửa bài của mình')
assert.equal((await api(T('author'), 'PATCH', `/api/posts/${post1.body.doc.id}`, { _status: 'published' })).status, 403); ok('author không xuất bản được')
const postE = await api(T('editor'), 'POST', '/api/posts', { title: `Bài ed ${run}`, slug: `bai-ed-${run}`, _status: 'draft', content: emptyContent })
del(admin, `/api/posts/${postE.body.doc.id}`)
assert.notEqual((await api(T('author'), 'PATCH', `/api/posts/${postE.body.doc.id}?draft=true`, { title: 'Chiếm', _status: 'draft' })).status, 200); ok('author không sửa được bài người khác')
assert.equal((await api(T('author'), 'POST', '/api/pages', page(`au-${run}`))).status, 403); ok('author không tạo được trang')

assert.equal((await api(T('moderator'), 'GET', '/api/comments')).status, 200); ok('moderator xem được bình luận')
assert.equal((await api(T('moderator'), 'POST', '/api/pages', page(`mo-${run}`))).status, 403); ok('moderator không tạo được trang')
assert.equal((await api(null, 'GET', '/api/comments')).status, 403); ok('khách không đọc được bình luận')
assert.equal((await api(null, 'GET', '/api/form-submissions')).status, 403); ok('khách không đọc được biểu mẫu đã gửi')
const areaSave = await api(T('publisher'), 'POST', '/api/globals/site-areas?locale=vi', { beforeFooter: emptyContent })
assert.equal(areaSave.status, 200); ok('publisher sửa được vùng giao diện')
assert.equal((await api(T('editor'), 'POST', '/api/globals/site-areas?locale=vi', { beforeFooter: emptyContent })).status, 403); ok('editor không sửa được vùng giao diện')

console.log('Chuyên mục, thẻ')
const cat = await api(T('editor'), 'POST', '/api/post-categories', { name: `Chuyên mục ${run}`, slug: `cm-${run}` })
const tag = await api(T('editor'), 'POST', '/api/post-tags', { name: `Thẻ ${run}`, slug: `the-${run}` })
assert.equal(cat.status, 201); assert.equal(tag.status, 201); del(admin, `/api/post-categories/${cat.body.doc.id}`); del(admin, `/api/post-tags/${tag.body.doc.id}`)
const postPub = await api(T('publisher'), 'POST', '/api/posts', {
  title: `Công khai ${run}`, slug: `cong-khai-${run}`, excerpt: 'Tóm tắt thử', _status: 'published', categories: [cat.body.doc.id], tags: [tag.body.doc.id],
  content: { root: { props: {} }, content: [block('Text', { heading: '', body: 'Nội dung **đậm** và [liên kết](/gioi-thieu)\n\n- mục một\n- mục hai' })] },
})
assert.equal(postPub.status, 201); del(admin, `/api/posts/${postPub.body.doc.id}`)
let html = await (await fetch(`${SITE}/bai-viet/danh-muc/cm-${run}`)).text()
assert.match(html, new RegExp(`cong-khai-${run}`)); ok('trang chuyên mục liệt kê bài')
html = await (await fetch(`${SITE}/bai-viet/the/the-${run}`)).text()
assert.match(html, new RegExp(`cong-khai-${run}`)); ok('trang thẻ liệt kê bài')
html = await (await fetch(`${SITE}/bai-viet/cong-khai-${run}`)).text()
assert.match(html, /<strong>đậm<\/strong>/); assert.match(html, /<li>mục một<\/li>/); assert.match(html, new RegExp(`danh-muc/cm-${run}`)); ok('bài hiện định dạng nhẹ, danh sách và liên kết chuyên mục')

console.log('Bình luận')
const submitComment = (extra = {}) => api(null, 'POST', '/api/site/comments', { postId: String(postPub.body.doc.id), name: 'Khách', email: 'k@example.com', content: 'Bình luận thử nghiệm', locale: 'vi', ...extra }, { 'x-forwarded-for': `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })
const c1 = await submitComment()
assert.equal(c1.status, 200); assert.equal(c1.body.status, 'pending'); ok('bình luận mới chờ duyệt')
const list = await api(T('moderator'), 'GET', `/api/comments?where[post][equals]=${postPub.body.doc.id}&limit=50&depth=0`)
const mine = list.body.docs.find((d) => d.content === 'Bình luận thử nghiệm'); assert.ok(mine); del(admin, `/api/comments/${mine.id}`)
assert.doesNotMatch(await (await fetch(`${SITE}/bai-viet/cong-khai-${run}`)).text(), /Bình luận thử nghiệm/); ok('chưa duyệt thì không hiển thị')
assert.equal((await api(T('moderator'), 'PATCH', `/api/comments/${mine.id}`, { status: 'approved' })).status, 200)
assert.match(await (await fetch(`${SITE}/bai-viet/cong-khai-${run}`)).text(), /Bình luận thử nghiệm/); ok('moderator duyệt xong thì hiển thị')
assert.equal((await submitComment({ website: 'bot' })).status, 400); ok('ô bẫy bot bị chặn')
const spam = await submitComment({ content: 'mua http://a.com http://b.com http://c.com' })
assert.equal(spam.status, 200)
const spamList = (await api(T('moderator'), 'GET', `/api/comments?where[status][equals]=spam&limit=20&depth=0`)).body.docs
spamList.filter((d) => d.content.includes('http://a.com')).forEach((d) => del(admin, `/api/comments/${d.id}`))
assert.ok(spamList.some((d) => d.content.includes('http://a.com'))); ok('nhiều liên kết bị đánh dấu spam')
const sameIp = { 'x-forwarded-for': '203.0.113.9' }
let limited = 0
for (let i = 0; i < 7; i++) if ((await api(null, 'POST', '/api/site/comments', { postId: String(postPub.body.doc.id), name: 'A', content: 'abc def' + i }, sameIp)).status === 429) limited++
assert.ok(limited >= 1); ok('giới hạn tần suất bình luận (429)')
;(await api(T('moderator'), 'GET', `/api/comments?where[authorName][equals]=A&limit=50&depth=0`)).body.docs.forEach((d) => del(admin, `/api/comments/${d.id}`))

console.log('Biểu mẫu')
const form = await api(T('publisher'), 'POST', '/api/forms', {
  title: 'Báo giá', slug: `bg-${run}`, submitLabel: 'Gửi báo giá', successMessage: 'Đã nhận!',
  fields: [{ label: 'Họ tên', type: 'text', required: true }, { label: 'Email', type: 'email', required: true }, { label: 'Loại xe', type: 'select', options: 'Sedan, SUV', required: false }, { label: 'Đồng ý', type: 'checkbox', required: true }],
})
assert.equal(form.status, 201, JSON.stringify(form.body).slice(0, 200)); del(admin, `/api/forms/${form.body.doc.id}`)
const names = form.body.doc.fields.map((f) => f.name); assert.deepEqual(names, ['ho_ten', 'email', 'loai_xe', 'dong_y']); ok('tên trường tự tạo từ nhãn')
const submit = (values, extra = {}) => api(null, 'POST', `/api/site/forms/bg-${run}`, { values, locale: 'vi', ...extra }, { 'x-forwarded-for': `10.1.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })
const bad = await submit({ ho_ten: '', email: 'sai', dong_y: false })
assert.equal(bad.status, 400); assert.equal(bad.body.errors.ho_ten, 'required'); assert.equal(bad.body.errors.email, 'invalid'); assert.equal(bad.body.errors.dong_y, 'required'); ok('kiểm tra bắt buộc, email, ô đánh dấu')
assert.equal((await submit({ ho_ten: 'An', email: 'an@example.com', loai_xe: 'Xe tải', dong_y: true })).status, 400); ok('lựa chọn ngoài danh sách bị từ chối')
assert.equal((await submit({ ho_ten: 'An', email: 'an@example.com', loai_xe: 'SUV', dong_y: true })).status, 200); ok('gửi hợp lệ được lưu')
assert.equal((await submit({ ho_ten: 'An', email: 'an@example.com', dong_y: true }, { website: 'bot' })).status, 400); ok('ô bẫy bot bị chặn')
const subs = await api(T('moderator'), 'GET', `/api/form-submissions?where[form][equals]=${form.body.doc.id}&depth=0`)
assert.equal(subs.body.totalDocs, 1); subs.body.docs.forEach((d) => del(admin, `/api/form-submissions/${d.id}`)); ok('moderator xem được dữ liệu đã gửi')
const csvRes = await fetch(`${SITE}/api/site/forms-export/${form.body.doc.id}`, { headers: { Authorization: `JWT ${T('moderator')}` } })
const csvText = await csvRes.text(); assert.equal(csvRes.status, 200); assert.match(csvText, /an@example\.com/); ok('xuất CSV')
assert.equal((await fetch(`${SITE}/api/site/forms-export/${form.body.doc.id}`)).status, 403); ok('khách không tải được CSV')
const fpage = await api(T('publisher'), 'POST', '/api/pages', page(`bm-${run}`, { root: { props: {} }, content: [block('Form', { heading: 'Nhận báo giá', form: `bg-${run}` })] }, { _status: 'published' }))
del(admin, `/api/pages/${fpage.body.doc.id}`)
html = await (await fetch(`${SITE}/bm-${run}`)).text()
assert.match(html, /Nhận báo giá/); assert.match(html, /Gửi báo giá/); assert.match(html, /name="ho_ten"/); ok('block Biểu mẫu hiển thị trên trang')

console.log('Khối dùng lại và vùng giao diện')
const rb = await api(T('publisher'), 'POST', '/api/reusable-blocks', { title: 'Khuyến mãi', slug: `km-${run}`, _status: 'published', content: { root: { props: {} }, content: [block('Text', { heading: 'KHUYẾN MÃI DÙNG LẠI', body: 'Giảm 10%' })] } })
assert.equal(rb.status, 201); del(admin, `/api/reusable-blocks/${rb.body.doc.id}`)
const rpage = await api(T('publisher'), 'POST', '/api/pages', page(`rb-${run}`, { root: { props: {} }, content: [block('Reusable', { slug: `km-${run}` })] }, { _status: 'published' }))
del(admin, `/api/pages/${rpage.body.doc.id}`)
assert.match(await (await fetch(`${SITE}/rb-${run}`)).text(), /KHUYẾN MÃI DÙNG LẠI/); ok('khối dùng lại được chèn vào trang')
const area = { root: { props: {} }, content: [block('Text', { heading: `VÙNG-${run}`, body: 'widget chân trang' })] }
assert.equal((await api(T('publisher'), 'POST', '/api/globals/site-areas?locale=vi', { beforeFooter: area })).status, 200)
assert.match(await (await fetch(`${SITE}/`)).text(), new RegExp(`VÙNG-${run}`)); ok('vùng "trước chân trang" hiện trên mọi trang')
assert.equal((await api(T('publisher'), 'POST', '/api/globals/site-areas?locale=vi', { beforeFooter: null })).status, 200)
assert.doesNotMatch(await (await fetch(`${SITE}/`)).text(), new RegExp(`VÙNG-${run}`)); ok('xóa vùng thì biến mất')

console.log('Đa ngôn ngữ')
const ml = await api(T('publisher'), 'POST', '/api/pages?locale=vi', page(`ml-${run}`, { root: { props: {} }, content: [block('Text', { heading: 'Xin chào', body: 'nội dung tiếng Việt' })] }, { title: 'Trang vi', _status: 'published' }))
del(admin, `/api/pages/${ml.body.doc.id}`)
assert.match(await (await fetch(`${SITE}/en/ml-${run}`)).text(), /Xin chào/); ok('chưa có bản dịch thì /en dùng nội dung tiếng Việt')
await api(T('publisher'), 'PATCH', `/api/pages/${ml.body.doc.id}?locale=en`, { title: 'Page en', content: { root: { props: {} }, content: [block('Text', { heading: 'Hello', body: 'english content' })] }, _status: 'published' })
html = await (await fetch(`${SITE}/en/ml-${run}`)).text()
assert.match(html, /Hello/); assert.doesNotMatch(html, /Xin chào/); ok('có bản dịch thì /en hiện tiếng Anh')
assert.match(await (await fetch(`${SITE}/ml-${run}`)).text(), /Xin chào/); ok('tiếng Việt không bị ảnh hưởng')
assert.match(html, /<html lang="en"/); assert.match(html, /hrefLang="vi"/); ok('html lang và hreflang')
assert.match(await (await fetch(`${SITE}/en/tim-kiem?q=zzzz`)).text(), /No matching results|Search/); ok('trang tìm kiếm có giao diện tiếng Anh')
assert.match(await (await fetch(`${SITE}/en/khong-ton-tai-${run}`)).text(), /Page not found/); ok('404 theo ngôn ngữ')
assert.match(await (await fetch(`${SITE}/sitemap.xml`)).text(), new RegExp(`/en/ml-${run}`)); ok('sitemap có URL theo ngôn ngữ')

console.log('Xem trước chia sẻ, chuyển hướng, SEO')
const dr = await api(T('editor'), 'POST', '/api/pages', page(`dr-${run}`, { root: { props: {} }, content: [block('Text', { heading: `BẢN-NHÁP-${run}`, body: 'chưa xuất bản' })] }))
del(admin, `/api/pages/${dr.body.doc.id}`)
assert.equal((await fetch(`${SITE}/dr-${run}`)).status, 404); ok('trang nháp không xem được công khai')
assert.equal((await fetch(`${SITE}/api/site/share-link?c=pages&id=${dr.body.doc.id}`)).status, 403); ok('không đăng nhập thì không tạo được link chia sẻ')
const sl = await fetch(`${SITE}/api/site/share-link?c=pages&id=${dr.body.doc.id}`, { headers: { Authorization: `JWT ${T('editor')}` } })
const shareUrl = (await sl.json()).url
const local = (u) => SITE + new URL(u).pathname + new URL(u).search
assert.match(shareUrl, /[?]share=/)
const sh = await fetch(local(shareUrl))
const shHtml = await sh.text()
assert.equal(sh.status, 200); assert.match(shHtml, new RegExp(`BẢN-NHÁP-${run}`)); assert.match(shHtml, /noindex/); ok('link chia sẻ xem được bản nháp, có noindex')
assert.equal((await fetch(local(shareUrl).replace(/.$/, 'x'))).status, 404); ok('link bị sửa chữ ký thì không xem được')
const dr2 = await api(T('editor'), 'POST', '/api/pages', page(`dr2-${run}`)); del(admin, `/api/pages/${dr2.body.doc.id}`)
assert.equal((await fetch(local(shareUrl).replace(`dr-${run}`, `dr2-${run}`))).status, 404); ok('link của trang này không mở được trang khác')

const empty = await api(T('publisher'), 'POST', '/api/pages', { title: 'Trống', slug: 'trong-' + run, _status: 'published' })
assert.equal(empty.status, 201); del(admin, '/api/pages/' + empty.body.doc.id)
assert.equal((await fetch(SITE + '/trong-' + run)).status, 200); ok('trang xuất bản chưa có nội dung vẫn hiển thị (không lỗi 500)')
const rd = await api(T('publisher'), 'POST', '/api/redirects', { from: `/cu-${run}`, to: `/ml-${run}`, permanent: true })
assert.equal(rd.status, 201); del(admin, `/api/redirects/${rd.body.doc.id}`)
const rr = await fetch(`${SITE}/cu-${run}`, { redirect: 'manual' })
assert.equal(rr.status, 308); assert.match(rr.headers.get('location') ?? '', new RegExp(`/ml-${run}`)); ok('đường dẫn cũ chuyển hướng vĩnh viễn')
assert.equal((await api(T('editor'), 'POST', '/api/redirects', { from: `/x-${run}`, to: '/' })).status, 403); ok('chỉ publisher trở lên tạo chuyển hướng')
const home = await (await fetch(`${SITE}/`)).text()
assert.match(home, /"@type":"Organization"/); assert.match(home, /"@type":"WebSite"/); ok('trang chủ có schema Organization + WebSite')
assert.match(await (await fetch(`${SITE}/ml-${run}`)).text(), /"@type":"BreadcrumbList"/); ok('trang có breadcrumb schema')

console.log('Công cụ: sao lưu, khôi phục, mẫu site')
const raw = (token, method, path, body, type) => fetch(SITE + path, { method, headers: { Authorization: 'JWT ' + token, ...(type ? { 'Content-Type': type } : {}) }, body })
assert.equal((await raw(T('publisher'), 'GET', '/api/site/backup')).status, 403); ok('chỉ admin tải được gói site')
assert.equal((await raw(T('publisher'), 'POST', '/api/site/backups')).status, 403); ok('chỉ admin sao lưu trên máy chủ')
const bk = await raw(admin, 'GET', '/api/site/backup')
const zipBytes = Buffer.from(await bk.arrayBuffer())
assert.equal(bk.status, 200); assert.equal(zipBytes.subarray(0, 2).toString(), 'PK'); ok('admin tải được gói site (zip)')
const mk = await (await raw(admin, 'POST', '/api/site/backups')).json()
assert.ok(mk.ok && /^hosso-backup-.*\.zip$/.test(mk.name)); ok('sao lưu ngay: ' + mk.name)
assert.equal((await raw(admin, 'GET', '/api/site/backup?name=' + mk.name)).status, 200); ok('tải lại bản sao lưu đã lưu')
assert.equal((await raw(admin, 'GET', '/api/site/backup?name=..%2F..%2Fpackage.json')).status, 404); ok('tên sao lưu không thoát được thư mục')
const imp = await (await raw(admin, 'POST', '/api/site/package-import', zipBytes, 'application/octet-stream')).json()
assert.ok(imp.ok, JSON.stringify(imp)); ok('khôi phục từ chính gói vừa tải (idempotent)')
assert.equal((await raw(admin, 'POST', '/api/site/package-import', Buffer.from('không phải zip'), 'application/octet-stream')).status, 400); ok('gói hỏng bị từ chối')
assert.equal((await raw(admin, 'POST', '/api/site/template-install', JSON.stringify({ id: '../x' }), 'application/json')).status, 404); ok('id mẫu không hợp lệ bị từ chối')

console.log('Khóa sửa')
const lockApi = (token, body) => api(token, 'POST', '/api/site/lock', body)
const lk = 'pages:99999:vi'
assert.equal((await lockApi(T('editor'), { key: lk })).body.ok, true); ok('editor nhận khóa')
const l2 = await lockApi(T('publisher'), { key: lk })
assert.equal(l2.body.ok, false); assert.match(l2.body.holder, /editor-/); ok('người thứ hai bị báo ai đang sửa')
assert.equal((await lockApi(T('editor'), { key: lk })).body.ok, true); ok('người giữ khóa gia hạn được')
assert.equal((await lockApi(T('publisher'), { key: lk, takeover: true })).body.ok, true); ok('tiếp quản khóa')
assert.equal((await lockApi(T('editor'), { key: lk })).body.ok, false); ok('khóa đã chuyển sang người tiếp quản')
await lockApi(T('publisher'), { key: lk, release: true })
assert.equal((await lockApi(T('editor'), { key: lk })).body.ok, true); ok('nhả khóa thì người khác nhận được')
await lockApi(T('editor'), { key: lk, release: true })
assert.equal((await lockApi(T('moderator'), { key: lk })).status, 403); ok('moderator không dùng khóa sửa')
assert.equal((await lockApi(T('editor'), { key: '../x' })).status, 400); ok('khóa sai định dạng bị từ chối')

for (const f of cleanup.reverse()) await f()
for (const u of Object.values(users)) await api(admin, 'DELETE', `/api/users/${u.id}`)
console.log(`\nTính năng OK (${n} kiểm tra).`)
