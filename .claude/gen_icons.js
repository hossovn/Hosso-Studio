const fs = require('fs')
const dir = 'C:/Users/kaing/AppData/Local/Temp/lucide_dl/package/icons/'
const CATS = {
  'Cơ bản': 'home user users star heart check x plus minus search settings menu bell mail phone message-circle message-square calendar clock map-pin globe link share-2 download upload eye lock unlock info circle-help triangle-alert circle-check circle-x thumbs-up thumbs-down bookmark flag tag trash-2 pencil copy filter sliders-horizontal power refresh-cw zap sparkles flame sun moon cloud umbrella',
  'Mũi tên': 'arrow-right arrow-left arrow-up arrow-down arrow-up-right arrow-down-right move-right chevron-right chevron-left chevron-up chevron-down chevrons-right corner-down-right undo-2 redo-2 repeat trending-up trending-down external-link maximize minimize play pause skip-forward',
  'Mua sắm': 'shopping-cart shopping-bag shopping-basket store credit-card wallet banknote coins receipt percent gift package truck box tag tags badge-percent circle-dollar-sign hand-coins piggy-bank scale ticket barcode qr-code',
  'Doanh nghiệp': 'briefcase building-2 building factory landmark chart-bar chart-line chart-pie target trophy award medal crown handshake lightbulb rocket presentation clipboard-list clipboard-check file-text folder megaphone newspaper graduation-cap book-open library id-card',
  'Dịch vụ & xe': 'wrench hammer cog settings-2 screwdriver paintbrush paintbrush-vertical car bus bike plane ship fuel battery-charging gauge shield shield-check shield-alert hard-hat construction headset life-buoy thermometer droplet wind leaf recycle',
  'Truyền thông': 'camera image video film music mic headphones volume-2 tv monitor smartphone tablet laptop printer wifi bluetooth mouse-pointer-click code terminal database server cloud-upload rss at-sign hash send',
  'Con người & xã hội': 'user-round user-check user-plus smile frown laugh baby accessibility handshake heart-handshake hand-heart hand thumbs-up quote party-popper cake coffee utensils pizza beer wine apple dumbbell bed bath tree-pine flower-2 dog cat paw-print',
}
const out = {}
const cats = {}
for (const [cat, names] of Object.entries(CATS)) {
  cats[cat] = []
  for (const n of names.split(/\s+/)) {
    if (out[n] !== undefined) { cats[cat].push(n); continue }
    const f = dir + n + '.svg'
    if (!fs.existsSync(f)) { console.error('thiếu', n); continue }
    const svg = fs.readFileSync(f, 'utf8')
    const inner = svg.replace(/^[\s\S]*?>\s*(?=<(?!svg))/, '').replace(/<\/svg>\s*$/, '')
    // bỏ phần mở <svg ...>
    const body = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>')).replace(/\s+/g, ' ').trim()
    out[n] = body
    cats[cat].push(n)
  }
}
const ts = `// Sinh từ lucide-static (ISC). Chỉ là dữ liệu: nội dung bên trong <svg viewBox="0 0 24 24"> của từng icon.\nexport const ICON_BODY: Record<string, string> = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n  "').replace(/^{/, '{\n  ').replace(/}$/, '\n}')}\nexport const ICON_CATS: Record<string, string[]> = ${JSON.stringify(cats)}\n`
fs.writeFileSync('C:/Code/Hosso-Studio/packages/blocks/src/icons-data.ts', ts)
console.log(Object.keys(out).length, 'icon', Math.round(ts.length / 1024) + 'KB')
