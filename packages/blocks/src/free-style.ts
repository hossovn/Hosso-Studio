/** Kiểu dáng dùng chung cho phần tử tự do: font, bóng, hình cắt, nền gradient. Chỉ là dữ liệu + vài hàm thuần. */

/** Font Google đều có tiếng Việt. `w` là tập độ đậm có thật (Google từ chối độ đậm không tồn tại). */
export const FREE_FONTS: { name: string; w: string; stack: string }[] = [
  { name: 'Be Vietnam Pro', w: '300;400;500;600;700;800', stack: 'sans-serif' },
  { name: 'Montserrat', w: '300;400;500;600;700;800', stack: 'sans-serif' },
  { name: 'Raleway', w: '300;400;500;600;700;800', stack: 'sans-serif' },
  { name: 'Nunito', w: '300;400;600;700;800', stack: 'sans-serif' },
  { name: 'Quicksand', w: '300;400;500;600;700', stack: 'sans-serif' },
  { name: 'Oswald', w: '300;400;500;600;700', stack: 'sans-serif' },
  { name: 'Anton', w: '400', stack: 'sans-serif' },
  { name: 'Playfair Display', w: '400;500;600;700;800', stack: 'serif' },
  { name: 'Merriweather', w: '300;400;700', stack: 'serif' },
  { name: 'Lora', w: '400;500;600;700', stack: 'serif' },
  { name: 'Roboto Slab', w: '300;400;500;600;700;800', stack: 'serif' },
  { name: 'Lobster', w: '400', stack: 'cursive' },
  { name: 'Dancing Script', w: '400;500;600;700', stack: 'cursive' },
  { name: 'Pacifico', w: '400', stack: 'cursive' },
]
export const fontStack = (name: unknown) => {
  const f = FREE_FONTS.find((x) => x.name === name)
  return f ? `"${f.name}", ${f.stack}` : undefined
}
/** Mã CSS nạp font (một dòng @import), hoặc '' nếu không dùng font Google. */
export const fontImport = (name: unknown) => {
  const f = FREE_FONTS.find((x) => x.name === name)
  return f ? `@import url("https://fonts.googleapis.com/css2?family=${f.name.replace(/ /g, '+')}:wght@${f.w}&display=swap");` : ''
}

/** Đổ bóng chữ (theo px thiết kế, nhân tỉ lệ khi vẽ). */
export const TEXT_SHADOWS: Record<string, string> = {
  soft: '0 2 6 rgba(0,0,0,.28)',
  hard: '3 3 0 rgba(0,0,0,.85)',
  lift: '0 8 24 rgba(0,0,0,.35)',
  glow: '0 0 14 rgba(255,255,255,.95)',
  neon: '0 0 10 #22d3ee,0 0 28 #22d3ee',
}
export const BOX_SHADOWS: Record<string, string> = {
  sm: '0 1 3 rgba(0,0,0,.18)',
  md: '0 8 20 rgba(0,0,0,.18)',
  lg: '0 20 44 rgba(0,0,0,.26)',
  hard: '8 8 0 rgba(0,0,0,.85)',
}
export const SHADOW_LABEL: Record<string, string> = { '': 'Không', soft: 'Nhẹ', hard: 'Cứng', lift: 'Nổi', glow: 'Phát sáng', neon: 'Neon', sm: 'Nhẹ', md: 'Vừa', lg: 'Lớn' }
/** Đổi '0 2 6 rgba' (px thiết kế) thành giá trị CSS theo hàm đổi đơn vị `u`. */
export const shadowCss = (spec: string | undefined, u: (n: number) => string) =>
  spec ? spec.split(/,(?![^(]*\))/).map((part) => part.trim().replace(/^(-?[\d.]+) (-?[\d.]+) (-?[\d.]+)/, (_, a, b, c) => `${u(+a)} ${u(+b)} ${u(+c)}`)).join(',') : undefined

/** Hình cắt (clip-path) cho khối. */
export const CLIPS: Record<string, string> = {
  triangle: 'polygon(50% 0,100% 100%,0 100%)',
  diamond: 'polygon(50% 0,100% 50%,50% 100%,0 50%)',
  hexagon: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)',
  pentagon: 'polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)',
  star: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
  arrow: 'polygon(0 30%,60% 30%,60% 0,100% 50%,60% 100%,60% 70%,0 70%)',
  chevron: 'polygon(0 0,70% 0,100% 50%,70% 100%,0 100%,30% 50%)',
  slant: 'polygon(18% 0,100% 0,82% 100%,0 100%)',
  cross: 'polygon(35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%,35% 35%)',
  badge: 'polygon(50% 0,63% 12%,80% 8%,85% 25%,100% 31%,92% 47%,100% 62%,85% 70%,80% 88%,63% 86%,50% 100%,37% 86%,20% 88%,15% 70%,0 62%,8% 47%,0 31%,15% 25%,20% 8%,37% 12%)',
  wave: 'polygon(0 20%,12% 12%,25% 8%,37% 12%,50% 20%,62% 28%,75% 32%,87% 28%,100% 20%,100% 100%,0 100%)',
}
export const CLIP_LABEL: Record<string, string> = { '': 'Không', triangle: 'Tam giác', diamond: 'Thoi', hexagon: 'Lục giác', pentagon: 'Ngũ giác', star: 'Ngôi sao', arrow: 'Mũi tên', chevron: 'Chevron', slant: 'Hình bình hành', cross: 'Dấu cộng', badge: 'Huy hiệu', wave: 'Sóng', blob: 'Blob' }
export const BLOB_RADIUS = '60% 40% 30% 70% / 60% 30% 70% 40%'

/** Nền màu đơn hoặc gradient 2 màu (`bg2` + góc `angle`). */
export const fillCss = (p: Record<string, any>) => (p.bg2 && p.bg ? `linear-gradient(${Number(p.angle ?? 135)}deg, ${p.bg}, ${p.bg2})` : p.bg)
