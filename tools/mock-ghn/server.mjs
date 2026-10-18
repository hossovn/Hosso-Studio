// Mock GHN API v2 để thử cục bộ: node tools/mock-ghn/server.mjs  (đặt HOSSO_GHN_API_URL=http://localhost:4020, HOSSO_GHN_TOKEN=mock)
// Chỉ có vài tỉnh/quận/phường; POST /_mock/status {order_code,status} đổi trạng thái đơn.
import http from 'node:http'

const provinces = [{ ProvinceID: 201, ProvinceName: 'Hà Nội' }, { ProvinceID: 202, ProvinceName: 'Hồ Chí Minh' }]
const districts = { 201: [{ DistrictID: 1482, DistrictName: 'Quận Hai Bà Trưng' }, { DistrictID: 1485, DistrictName: 'Quận Ba Đình' }], 202: [{ DistrictID: 1442, DistrictName: 'Quận 1' }] }
const wards = { 1482: [{ WardCode: '1A0101', WardName: 'Phường Bạch Mai' }, { WardCode: '1A0102', WardName: 'Phường Phố Huế' }], 1485: [{ WardCode: '1A0201', WardName: 'Phường Điện Biên' }], 1442: [{ WardCode: '20107', WardName: 'Phường Bến Nghé' }] }
const orders = new Map()
let seq = 1

const send = (res, data, code = 200, message = 'Success') => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ code, message, data }))
}

http
  .createServer(async (req, res) => {
    let raw = ''
    for await (const c of req) raw += c
    const b = raw ? JSON.parse(raw) : {}
    const p = req.url.split('?')[0]
    if (req.headers.token !== 'mock' && !p.startsWith('/_mock')) return send(res, null, 401, 'Token invalid')
    if (p === '/master-data/province') return send(res, provinces)
    if (p === '/master-data/district') return send(res, districts[b.province_id] ?? [])
    if (p === '/master-data/ward') return send(res, wards[b.district_id] ?? null)
    if (p === '/v2/shipping-order/create') {
      for (const f of ['to_name', 'to_phone', 'to_address', 'to_district_id', 'to_ward_code', 'weight', 'service_type_id', 'payment_type_id', 'required_note']) if (b[f] === undefined || b[f] === '') return send(res, null, 400, `missing ${f}`)
      const code = `MOCK${String(seq++).padStart(5, '0')}`
      orders.set(code, { ...b, status: 'ready_to_pick' })
      return send(res, { order_code: code })
    }
    if (p === '/v2/shipping-order/fee') return b.to_district_id && b.to_ward_code ? send(res, { total: 22000 }) : send(res, null, 400, 'missing address')
    if (p === '/v2/shipping-order/detail') return orders.has(b.order_code) ? send(res, { order_code: b.order_code, status: orders.get(b.order_code).status }) : send(res, null, 400, 'order not found')
    if (p === '/_mock/status') { orders.get(b.order_code).status = b.status; return send(res, {}) }
    if (p === '/_mock/orders') return send(res, [...orders])
    send(res, null, 404, 'not found')
  })
  .listen(4020, () => console.log('Mock GHN chạy tại http://localhost:4020 (Token: mock)'))
