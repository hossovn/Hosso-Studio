// Sinh dữ liệu mock cho WIM (xe, tương thích, danh mục, chi nhánh, sản phẩm, tồn kho). Chạy: node seed/wim/generate.mjs
// Dữ liệu cố định (không ngẫu nhiên thật) để kết quả lặp lại được.
import { writeFileSync } from 'node:fs'

const dir = new URL('./', import.meta.url)
const out = (name, data) => writeFileSync(new URL(name, dir), JSON.stringify(data, null, 2) + '\n')

// ---- Xe ----
const vehicles = {
  toyota: { name: 'Toyota', models: { vios: ['Vios', 2008, 2023], camry: ['Camry', 2006, 2023], innova: ['Innova', 2006, 2023], fortuner: ['Fortuner', 2009, 2023] } },
  honda: { name: 'Honda', models: { city: ['City', 2009, 2023], civic: ['Civic', 2006, 2023], crv: ['CR-V', 2007, 2023] } },
  hyundai: { name: 'Hyundai', models: { accent: ['Accent', 2011, 2023], i10: ['Grand i10', 2014, 2023], santafe: ['Santa Fe', 2012, 2023] } },
  kia: { name: 'Kia', models: { morning: ['Morning', 2011, 2023], cerato: ['Cerato', 2009, 2023] } },
  ford: { name: 'Ford', models: { ranger: ['Ranger', 2012, 2023], everest: ['Everest', 2015, 2023] } },
}
const makes = Object.entries(vehicles).map(([id, v]) => ({ id, name: v.name }))
const models = Object.fromEntries(
  Object.entries(vehicles).map(([make, v]) => [make, Object.entries(v.models).map(([id, [name]]) => ({ id: `${make}-${id}`, name }))]),
)
const years = Object.fromEntries(
  Object.entries(vehicles).flatMap(([make, v]) =>
    Object.entries(v.models).map(([id, [, from, to]]) => [`${make}-${id}`, Array.from({ length: to - from + 1 }, (_, i) => to - i)]),
  ),
)
out('vehicles.json', { makes, models, years })

const categories = [
  { id: 'phanh', name: 'Hệ thống phanh' },
  { id: 'loc', name: 'Lọc' },
  { id: 'dau-nhot', name: 'Dầu nhớt' },
  { id: 'dong-co', name: 'Động cơ' },
  { id: 'treo', name: 'Hệ thống treo' },
  { id: 'dien', name: 'Điện và đèn' },
]
out('categories.json', categories)

const branches = [
  { id: 'hn', name: 'Chi nhánh Hà Nội', address: '12 Phố Huế, Hai Bà Trưng, Hà Nội', phone: '0243 000 0001' },
  { id: 'hcm', name: 'Chi nhánh TP.HCM', address: '45 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', phone: '0283 000 0002' },
  { id: 'dn', name: 'Chi nhánh Đà Nẵng', address: '88 Nguyễn Văn Linh, Hải Châu, Đà Nẵng', phone: '0236 000 0003' },
]
out('branches.json', branches)

// ---- Sản phẩm ----
// Nhóm xe: các dòng dùng chung một phụ tùng.
const groups = [
  { key: 'TY', brand: 'Toyota', oem: 'Toyota Genuine', fit: [['toyota', 'vios', 2013, 2022], ['toyota', 'camry', 2012, 2019]], tag: 'Toyota Vios / Camry' },
  { key: 'HD', brand: 'Honda', oem: 'Honda Genuine', fit: [['honda', 'city', 2014, 2020], ['honda', 'civic', 2016, 2021]], tag: 'Honda City / Civic' },
  { key: 'HY', brand: 'Hyundai', oem: 'Hyundai Mobis', fit: [['hyundai', 'accent', 2011, 2020], ['hyundai', 'i10', 2014, 2021]], tag: 'Hyundai Accent / Grand i10' },
  { key: 'KI', brand: 'Kia', oem: 'Kia Mobis', fit: [['kia', 'morning', 2011, 2019], ['kia', 'cerato', 2013, 2018]], tag: 'Kia Morning / Cerato' },
  { key: 'FD', brand: 'Ford', oem: 'Ford Motorcraft', fit: [['ford', 'ranger', 2012, 2022], ['ford', 'everest', 2015, 2022]], tag: 'Ford Ranger / Everest' },
]
const parts = [
  { key: 'MP', cat: 'phanh', name: 'Má phanh trước', base: 780000, alt: ['Akebono', 'Bosch'], eng: null },
  { key: 'LD', cat: 'loc', name: 'Lọc dầu', base: 120000, alt: ['Denso', 'Mann'], eng: null },
  { key: 'LG', cat: 'loc', name: 'Lọc gió động cơ', base: 210000, alt: ['Denso', 'Mahle'], eng: null },
  { key: 'BG', cat: 'dong-co', name: 'Bugi (bộ 4)', base: 480000, alt: ['NGK', 'Denso'], eng: '1.5L' },
  { key: 'DC', cat: 'dong-co', name: 'Dây curoa tổng', base: 390000, alt: ['Gates', 'Bando'], eng: null },
  { key: 'BN', cat: 'dong-co', name: 'Bơm nước', base: 950000, alt: ['Aisin', 'GMB'], eng: null },
  { key: 'GX', cat: 'treo', name: 'Giảm xóc trước', base: 1650000, alt: ['KYB', 'Monroe'], eng: null },
  { key: 'DP', cat: 'dien', name: 'Bóng đèn pha LED', base: 890000, alt: ['Philips', 'Osram'], eng: null },
]

const products = []
const stock = {}
let n = 0
const pad = (x, l = 3) => String(x).padStart(l, '0')
const seedStock = (i) => ({ hn: (i * 7) % 23, hcm: (i * 11) % 29, dn: (i * 5) % 13 })

for (const g of groups) {
  for (const p of parts) {
    n++
    const oemCode = `${g.key}-${p.key}-${pad(10000 + n * 37, 5)}`
    const compatibility = g.fit.map(([make, model, yearFrom, yearTo]) => ({
      make,
      model: `${make}-${model}`,
      yearFrom,
      yearTo,
      ...(p.eng ? { engine: p.eng } : {}),
    }))
    const genuine = {
      id: `P${pad(n * 2 - 1)}`,
      code: `${g.key}${p.key}${pad(n)}G`,
      name: `${p.name} ${g.tag}`,
      brand: g.oem,
      condition: 'genuine',
      warrantyMonths: 12,
      price: p.base * (1 + (n % 4) * 0.1) - (p.base * (1 + (n % 4) * 0.1)) % 1000,
      categoryId: p.cat,
      oemCodes: [oemCode],
      altCodes: [],
      compatibility,
    }
    const altBrand = p.alt[n % 2]
    const aftermarket = {
      id: `P${pad(n * 2)}`,
      code: `${altBrand.slice(0, 3).toUpperCase()}${p.key}${pad(n)}A`,
      name: `${p.name} ${altBrand} cho ${g.tag}`,
      brand: altBrand,
      condition: 'aftermarket',
      warrantyMonths: 6,
      price: Math.round((genuine.price * 0.62) / 1000) * 1000,
      categoryId: p.cat,
      oemCodes: [oemCode],
      altCodes: [`${altBrand.slice(0, 2).toUpperCase()}-${pad(20000 + n * 53, 5)}`, `ALT${pad(n * 7, 4)}`],
      compatibility,
    }
    products.push(genuine, aftermarket)
    stock[genuine.id] = seedStock(n)
    stock[aftermarket.id] = seedStock(n + 3)
  }
}

// Một sản phẩm hết hàng ở mọi chi nhánh (kiểm thử), một sản phẩm không có dữ liệu tương thích.
products.push({
  id: 'P900', code: 'LH900', name: 'Bộ ly hợp Toyota Innova', brand: 'Toyota Genuine', condition: 'genuine', warrantyMonths: 12,
  price: 4850000, categoryId: 'dong-co', oemCodes: ['TY-LH-90001'], altCodes: [],
  compatibility: [{ make: 'toyota', model: 'toyota-innova', yearFrom: 2012, yearTo: 2020 }],
})
stock.P900 = { hn: 0, hcm: 0, dn: 0 }
products.push({
  id: 'P901', code: 'DN901', name: 'Dầu nhớt tổng hợp 5W-30 (4 lít)', brand: 'Castrol', condition: 'genuine', warrantyMonths: 0,
  price: 760000, categoryId: 'dau-nhot', oemCodes: [], altCodes: ['CAS-5W30-4L'],
})
stock.P901 = { hn: 40, hcm: 55, dn: 22 }

out('products.json', products)
out('stock.json', stock)
console.log(`${products.length} sản phẩm, ${makes.length} hãng, ${Object.keys(years).length} dòng xe`)
