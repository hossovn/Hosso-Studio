'use client'
import { Drawer, outlinePlugin, usePuck, type Plugin } from '@puckeditor/core'
import { ICON_CATS, FreeElementView, FreeOverlay, makeElement, patterns, type FreeElement, type FreeType } from '@hosso/studio-blocks'
import React, { useMemo, useState } from 'react'
import { useAddFreeElement, useInsertSection } from './FreeCanvasEditor'
import { SECTION_TEMPLATES, type SectionTemplate } from './SectionTemplates'

type T = (vi: string) => string
export type ElementCatalogItem = { type: FreeType; label: string; category: string; preview: React.ReactNode; create: () => FreeElement }

/**
 * Thanh icon bên trái chia module như Webcake: Phần, Văn bản, Phần tử, Ảnh/Video, Cửa hàng, Nhập liệu, Thư viện.
 * Mỗi tab có thể gồm block của Puck (kéo thả), phần tử của Vùng tự do (bấm để thêm; nhóm khai báo trong LIBRARY) và mẫu khối.
 * Block chưa xếp vào tab nào nằm ở "Khác".
 */
type TabDef = { id: string; title: string; icon: string; blocks: (type: string) => boolean; library?: string[]; patterns?: boolean; sections?: boolean }
const TABS: TabDef[] = [
  { id: 'sections', title: 'Phần', icon: 'M4 5h16v14H4zM4 10h16M10 10v9', blocks: (t) => t === 'FreeCanvas', sections: true },
  { id: 'text', title: 'Văn bản', icon: 'M5 6h14M12 6v13M8 19h8', blocks: (t) => t === 'Text', library: ['Tiêu đề', 'Tiêu đề kiểu', 'Văn bản', 'Văn bản kiểu'] },
  { id: 'elements', title: 'Phần tử', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', blocks: () => false, library: ['Nút bấm', 'Menu', 'Hình khối', 'Hình học', 'Nền chuyển màu', 'Đường kẻ', ...Object.keys(ICON_CATS).map((k) => `Icon · ${k}`)] },
  { id: 'media', title: 'Ảnh/Video', icon: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4', blocks: (t) => ['Image', 'Video', 'Slider'].includes(t), library: ['Ảnh và video'] },
  { id: 'shop', title: 'Cửa hàng', icon: 'M4 9l1-5h14l1 5M5 9v11h14V9M9 20v-6h6v6', blocks: (t) => /^(Shop|Wim)/.test(t) },
  { id: 'forms', title: 'Nhập liệu', icon: 'M4 6h16v4H4zM4 14h16v4H4z', blocks: (t) => ['ContactForm', 'Form', 'SearchBox'].includes(t) },
  { id: 'library', title: 'Thư viện', icon: 'M3 7h6l2 2h10v10H3z', blocks: (t) => ['Hero', 'TwoColumns', 'ImageSections', 'Features', 'TrustBar', 'Footer', 'Reusable'].includes(t), patterns: true },
]

export const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

// Photo-backed layout thumbnails; data-driven widgets still use the site's own content.
const g = '#dce7e4'
const d = '#26785a'
const photo = (x: number, y: number, w: number, h: number, src = '/editor-demo/mountain.jpg') => <image x={x} y={y} width={w} height={h} href={src} preserveAspectRatio="xMidYMid slice" />
const sampleImage = { src: '/editor-demo/mountain.jpg', alt: 'Dãy núi dưới ánh nắng' }
const L = (x: number, y: number, w: number, c = g) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={4} rx={2} fill={c} />
const B = (x: number, y: number, w: number, h: number, c = g, r = 3) => <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} rx={r} fill={c} />
const WIRES: Record<string, React.ReactNode> = {
  Hero: <>{photo(0, 0, 120, 68)}{B(0, 0, 120, 68, '#00000055', 0)}{L(12, 20, 64, '#fff')}{L(12, 30, 48, '#ffffffbb')}{B(12, 45, 28, 10, d, 2)}</>,
  Text: <>{L(10, 14, 60, d)}{L(10, 28, 100)}{L(10, 38, 96)}{L(10, 48, 70)}</>,
  Slider: <>{photo(0, 0, 120, 55, '/editor-demo/trail.jpg')}{B(8, 25, 6, 6, '#fff', 3)}{B(106, 25, 6, 6, '#fff', 3)}<circle cx="50" cy="62" r="2.5" fill={d} /><circle cx="60" cy="62" r="2.5" fill={g} /><circle cx="70" cy="62" r="2.5" fill={g} /></>,
  Image: <>{photo(0, 0, 120, 68)}</>,
  Video: <>{photo(0, 0, 120, 68, '/editor-demo/trail.jpg')}<circle cx="60" cy="34" r="14" fill="#00000088" /><path d="M56 25l13 9-13 9z" fill="#fff" /></>,
  Features: <>{[0, 1, 2].map((i) => <g key={i}>{B(6 + i * 38, 12, 34, 44, '#e5e7eb')}{B(12 + i * 38, 18, 10, 10, d, 5)}{L(12 + i * 38, 34, 22)}{L(12 + i * 38, 42, 18)}</g>)}</>,
  TwoColumns: <>{photo(0, 0, 58, 68, '/editor-templates/workspace.jpg')}{L(68, 18, 42, d)}{L(68, 30, 36)}{L(68, 40, 30)}{B(68, 52, 26, 8, d, 2)}</>,
  ImageSections: <>{photo(0, 0, 54, 32, '/editor-templates/cafe.jpg')}{L(64, 10, 46, d)}{L(64, 22, 36)}{L(8, 44, 40, d)}{L(8, 56, 30)}{photo(62, 36, 58, 32, '/editor-templates/restaurant.jpg')}</>,
  ContactForm: <>{B(10, 8, 100, 10, '#e5e7eb')}{B(10, 24, 100, 10, '#e5e7eb')}{B(10, 40, 100, 14, '#e5e7eb')}{B(10, 58, 30, 8, d, 3)}</>,
  Form: <>{B(10, 8, 100, 10, '#e5e7eb')}{B(10, 24, 100, 10, '#e5e7eb')}{B(10, 40, 100, 14, '#e5e7eb')}{B(10, 58, 30, 8, d, 3)}</>,
  Footer: <>{B(0, 10, 120, 58, '#4b5563', 0)}{L(10, 20, 24, '#9ca3af')}{L(48, 20, 24, '#9ca3af')}{L(86, 20, 24, '#9ca3af')}{L(10, 32, 20, '#6b7280')}{L(48, 32, 20, '#6b7280')}{L(86, 32, 20, '#6b7280')}</>,
  TrustBar: <>{[0, 1, 2, 3].map((i) => <g key={i}>{B(10 + i * 27, 22, 20, 20, '#e5e7eb', 10)}{L(10 + i * 27, 48, 20)}</g>)}</>,
  CategoryGrid: <>{['watch', 'cafe', 'restaurant', 'workspace'].map((name, i) => <g key={name}>{photo(6 + i * 28, 10, 24, 30, '/editor-templates/' + name + '.jpg')}{L(8 + i * 28, 48, 20, d)}</g>)}</>,
  PostList: <>{['workspace', 'cafe', 'restaurant'].map((name, i) => <g key={name}>{photo(6 + i * 38, 4, 34, 34, '/editor-templates/' + name + '.jpg')}{L(6 + i * 38, 44, 34, d)}{L(6 + i * 38, 54, 26)}</g>)}</>,
  SearchBox: <>{B(8, 22, 104, 22, '#e5e7eb', 11)}<circle cx="22" cy="33" r="5" fill="none" stroke={d} strokeWidth="2" /><path d="M26 37l5 5" stroke={d} strokeWidth="2" /></>,
  TermList: <>{B(8, 16, 30, 12, g, 6)}{B(42, 16, 40, 12, g, 6)}{B(86, 16, 26, 12, g, 6)}{B(8, 34, 44, 12, g, 6)}{B(56, 34, 30, 12, g, 6)}</>,
  NavMenu: <>{B(0, 20, 120, 28, '#e5e7eb', 0)}{L(10, 32, 16, d)}{L(40, 32, 16)}{L(70, 32, 16)}{L(98, 32, 14)}</>,
  ShopProductGrid: <>{[0, 1, 2, 3].map((i) => <g key={i}>{photo(6 + i * 28, 4, 24, 34, '/editor-templates/watch.jpg')}{L(6 + i * 28, 44, 22, d)}{L(6 + i * 28, 54, 14, '#b45309')}</g>)}</>,
  ShopCategories: <>{['watch', 'cafe', 'restaurant', 'workspace'].map((name, i) => <g key={name}>{photo(6 + i * 28, 10, 24, 30, '/editor-templates/' + name + '.jpg')}{L(8 + i * 28, 48, 20, d)}</g>)}</>,
  ShopProductDetail: <>{photo(0, 0, 58, 68, '/editor-templates/watch.jpg')}{L(66, 12, 44, d)}{L(66, 24, 30)}{L(66, 36, 26, '#b45309')}{B(66, 50, 36, 10, d, 3)}</>,
}
export const Wire = ({ type }: { type: string }) => (
  <svg viewBox="0 0 120 68" width="100%" aria-hidden="true" style={{ display: 'block', background: '#f6f8f7', borderRadius: 6 }}>
    {WIRES[type] ?? WIRES[type.replace(/^Wim/, 'Shop')] ?? <>{photo(0, 0, 54, 68, '/editor-templates/workspace.jpg')}{L(64, 18, 46, d)}{L(64, 30, 40)}{L(64, 42, 30)}</>}
  </svg>
)

// ---- Thư viện phần tử cho Vùng tự do (bấm để thêm) ----
const S = (type: Parameters<typeof makeElement>[0], over: Parameters<typeof makeElement>[1] = {}) => () => makeElement(type, over)
const HEAD = [56, 44, 36, 28, 22, 18]
type Over = Parameters<typeof makeElement>[1]
const G = '#15803d'
const btn = (label: string, props: Record<string, any>, over: Over = {}) => ({ label, make: S('button', { ...over, props: { text: label, ...props } }) })
const head = (label: string, text: string, props: Record<string, any>, over: Over = {}) => ({ label, make: S('heading', { w: 640, ...over, props: { level: 2, text, ...props } }) })
const para = (label: string, text: string, props: Record<string, any>, over: Over = {}) => ({ label, make: S('text', { w: 480, ...over, props: { text, ...props } }) })
const shape = (label: string, props: Record<string, any>, over: Over = {}) => ({ label, make: S('shape', { w: 160, h: 160, ...over, props: { bg: '#374151', ...props } }) })
const rule = (label: string, props: Record<string, any>, over: Over = {}) => ({ label, make: S('line', { ...over, props: { thickness: 2, ...props } }) })
const menu = (label: string, props: Record<string, any>, over: Over = {}) => ({ label, make: S('menu', { ...over, props }) })
export const LIBRARY: { title: string; cols: number; items: { label: string; make: () => FreeElement }[] }[] = [
  { title: 'Tiêu đề', cols: 1, items: HEAD.map((size, i) => ({ label: `Heading ${i + 1}`, make: S('heading', { w: 640, h: Math.round(size * 1.4), props: { level: i + 1, size, text: `Heading ${i + 1}` } }) })) },
  {
    title: 'Tiêu đề kiểu',
    cols: 1,
    items: [
      head('Căn giữa đậm', 'Tiêu đề căn giữa', { size: 44, weight: 800, align: 'center' }, { h: 64 }),
      head('Màu thương hiệu', 'Tiêu đề nổi bật', { size: 44, weight: 800, color: G }, { h: 64 }),
      head('Nhãn nhỏ', 'DANH MỤC NỔI BẬT', { level: 3, size: 14, weight: 700, color: G }, { w: 320, h: 24 }),
      head('Nhẹ, thanh mảnh', 'Tinh gọn và nhẹ nhàng', { size: 52, weight: 300 }, { h: 72 }),
      head('Khuyến mãi', 'Khuyến mãi lớn', { size: 40, weight: 800, color: '#ea580c' }, { h: 58 }),
      head('Căn phải', 'Tiêu đề căn phải', { size: 36, weight: 700, align: 'right' }, { h: 52 }),
    ],
  },
  {
    title: 'Chữ nghệ thuật',
    cols: 1,
    items: [
      head('Serif sang trọng', 'Elegant Living', { font: 'Playfair Display', size: 56, weight: 700 }, { h: 80 }),
      head('Đậm IN HOA', 'GIẢM GIÁ SỐC', { font: 'Anton', size: 64, weight: 400, upper: true, spacing: 2 }, { h: 90 }),
      head('Viết tay', 'Chào mùa hè', { font: 'Dancing Script', size: 64, weight: 700, color: '#be185d' }, { h: 90 }),
      head('Lobster', 'Ngon tuyệt vời', { font: 'Lobster', size: 56, weight: 400, color: '#ea580c' }, { h: 80 }),
      head('Pacifico', 'Summer Vibes', { font: 'Pacifico', size: 52, weight: 400, color: '#0891b2' }, { h: 80 }),
      head('Chữ chuyển màu', 'Gradient Text', { font: 'Montserrat', size: 60, weight: 800, color: '#7c3aed', grad2: '#ec4899', angle: 90 }, { h: 84 }),
      head('Viền rỗng', 'OUTLINE', { font: 'Montserrat', size: 72, weight: 800, color: 'transparent', strokeW: 2, strokeColor: '#111827' }, { h: 96 }),
      head('Bóng cứng', 'RETRO POP', { font: 'Oswald', size: 64, weight: 700, color: '#facc15', strokeW: 1, strokeColor: '#111827', tshadow: 'hard' }, { h: 90 }),
      head('Neon', 'NEON NIGHT', { font: 'Montserrat', size: 56, weight: 800, color: '#e0f2fe', tshadow: 'neon' }, { h: 80 }),
      head('Giãn rộng tối giản', 'MINIMAL STUDIO', { font: 'Raleway', size: 28, weight: 500, spacing: 12, upper: true }, { h: 44 }),
      head('Nghiêng', 'Italic Story', { font: 'Lora', size: 48, weight: 500, italic: true }, { h: 70 }),
      head('Tiêu đề Việt', 'Tinh hoa Việt', { font: 'Be Vietnam Pro', size: 52, weight: 800, color: G }, { h: 76 }),
    ],
  },
  {
    title: 'Văn bản',
    cols: 1,
    items: [20, 16, 13].map((size) => para(`Đoạn văn ${size}px`, 'Nhấp đúp để sửa đoạn văn này. Kéo để di chuyển.', { size }, { w: 400, h: Math.round(size * 3.6) })),
  },
  {
    title: 'Văn bản kiểu',
    cols: 1,
    items: [
      para('Đoạn dẫn', 'Đoạn dẫn nổi bật giúp giới thiệu ngắn gọn nội dung bên dưới.', { size: 22, color: '#4b5563' }, { w: 560, h: 90 }),
      para('Trích dẫn', '“Chất lượng là danh dự của chúng tôi.”', { size: 24, weight: 600, align: 'center', color: '#111827' }, { w: 560, h: 72 }),
      para('Giá', '1.290.000₫', { size: 32, weight: 800, color: '#dc2626' }, { w: 280, h: 48 }),
      para('Chú thích', 'Ghi chú nhỏ, điều kiện áp dụng, nguồn ảnh…', { size: 13, color: '#6b7280' }, { w: 360, h: 32 }),
      para('Căn giữa', 'Đoạn văn căn giữa, hợp với phần giới thiệu ngắn.', { size: 18, align: 'center' }, { w: 480, h: 72 }),
    ],
  },
  {
    title: 'Nút bấm',
    cols: 2,
    items: [
      btn('Nút chính', {}),
      btn('Nút viền', { bg: 'transparent', color: '#111827', borderW: 2, borderColor: '#111827' }),
      btn('Nút tối', { bg: '#111827' }),
      btn('Nút nhạt', { bg: '#ede9fe', color: '#6d28d9' }),
      btn('Mua ngay', { bg: '#dc2626', radius: 999 }),
      btn('Liên hệ', { bg: '#2563eb', radius: 999 }),
      btn('Khuyến mãi', { bg: '#ea580c', radius: 999 }),
      btn('Viền bo tròn', { bg: 'transparent', color: G, borderW: 2, borderColor: G, radius: 999 }),
      btn('Nút vuông', { bg: '#111827', radius: 0 }),
      btn('Nút nhạt xanh', { bg: '#dcfce7', color: '#166534', radius: 14 }),
      btn('Xem thêm →', { bg: 'transparent', color: G, borderW: 0 }, { w: 160, h: 44 }),
      btn('Đặt hàng ngay', { size: 22 }, { w: 280, h: 68 }),
    ],
  },
  {
    title: 'Menu',
    cols: 1,
    items: [
      menu('Ngang', { color: '#d97706', weight: 700 }, { w: 560, h: 40 }),
      menu('Gạch chân', { variant: 'underline', accent: '#ea580c', color: '#ea580c' }, { w: 560, h: 44 }),
      menu('Thanh nền', { variant: 'box', accent: '#0284c7', color: '#0284c7', gap: 0 }, { w: 560, h: 46 }),
      menu('Viên thuốc', { variant: 'pill', accent: '#15803d', color: '#374151' }, { w: 560, h: 44 }),
      menu('Căn giữa', { align: 'center', weight: 700, gap: 40 }, { w: 640, h: 32 }),
      menu('Dọc', { vertical: true, gap: 12 }, { w: 200, h: 140 }),
      menu('Thu gọn', { variant: 'collapse', accent: '#0369a1' }, { w: 280, h: 52 }),
      menu('Hamburger', { variant: 'hamburger' }, { w: 56, h: 56 }),
      menu('Lưới ô', { variant: 'grid', accent: '#7c3aed', color: '#4c1d95' }, { w: 560, h: 64 }),
    ],
  },
  {
    title: 'Hình khối',
    cols: 3,
    items: [
      shape('Vuông', {}),
      shape('Bo góc', { radius: 32 }),
      shape('Tròn', { radius: 999 }),
      shape('Thanh bo tròn', { radius: 999 }, { w: 240, h: 80 }),
      shape('Chỉ viền', { bg: 'transparent', borderW: 3, borderColor: '#111827', radius: 16 }),
      shape('Thẻ nhạt', { bg: '#f3f4f6', radius: 24 }, { w: 280, h: 200 }),
      shape('Xanh lá', { bg: G, radius: 24 }),
      shape('Cam', { bg: '#f59e0b', radius: 24 }),
      shape('Xanh dương', { bg: '#2563eb', radius: 24 }),
      shape('Đen', { bg: '#111827', radius: 0 }),
      shape('Xanh nhạt', { bg: '#dcfce7', radius: 999 }),
      shape('Tím nhạt', { bg: '#ede9fe', radius: 24 }),
    ],
  },
  {
    title: 'Hình học',
    cols: 3,
    items: [
      ['triangle', 'Tam giác'], ['diamond', 'Thoi'], ['hexagon', 'Lục giác'], ['pentagon', 'Ngũ giác'], ['star', 'Sao'], ['arrow', 'Mũi tên'],
      ['chevron', 'Chevron'], ['slant', 'Bình hành'], ['cross', 'Dấu cộng'], ['badge', 'Huy hiệu'], ['wave', 'Sóng'], ['blob', 'Blob'],
    ].map(([clip, label]) => shape(label, { clip, bg: '#15803d', bg2: '#22c55e', angle: 135 })),
  },
  {
    title: 'Nền chuyển màu',
    cols: 3,
    items: [
      ['#15803d', '#4ade80'], ['#2563eb', '#22d3ee'], ['#7c3aed', '#ec4899'], ['#f59e0b', '#ef4444'], ['#0f172a', '#334155'], ['#fb7185', '#fbbf24'],
    ].map(([a, b], i) => shape(`Gradient ${i + 1}`, { bg: a, bg2: b, angle: 135, radius: 24, bshadow: 'md' }, { w: 240, h: 160 })),
  },
  {
    title: 'Đường kẻ',
    cols: 1,
    items: [
      rule('Mảnh', { thickness: 1, color: '#d1d5db' }),
      rule('Ngang', {}),
      rule('Đậm', { thickness: 4 }),
      rule('Thương hiệu', { thickness: 3, color: G }, { w: 200 }),
      rule('Nét đứt', { dashed: true }),
      rule('Dọc', { vertical: true }, { w: 12, h: 240 }),
    ],
  },
  { title: 'Đếm ngược', cols: 1, items: [
    { label: 'Đếm ngược tối', make: S('countdown', {}) },
    { label: 'Đếm ngược xanh', make: S('countdown', { props: { bg: '#dcfce7', color: '#166534', radius: 999 } }) },
    { label: 'Đếm ngược cam', make: S('countdown', { props: { bg: '#f59e0b', bg2: '#ef4444', color: '#ffffff', radius: 20 } }) },
  ] },
  { title: 'Số liệu', cols: 2, items: [
    { label: 'Số xanh', make: S('number', {}) },
    { label: 'Số đen', make: S('number', { props: { color: '#111827', suffix: '%', value: '98', label: 'Hài lòng' } }) },
    { label: 'Số đỏ', make: S('number', { props: { color: '#dc2626', suffix: '', value: '24/7', label: 'Hỗ trợ' } }) },
    { label: 'Số tím', make: S('number', { props: { color: '#7c3aed', suffix: 'k', value: '120', label: 'Lượt truy cập', font: 'Montserrat' } }) },
  ] },
  { title: 'Bảng', cols: 1, items: [
    { label: 'Bảng xanh', make: S('table', {}) },
    { label: 'Bảng tối', make: S('table', { props: { headBg: '#111827', headColor: '#ffffff' } }) },
  ] },
  { title: 'Bản đồ và nhúng', cols: 2, items: [
    { label: 'Google Map', make: S('map', { w: 560, h: 360 }) },
    { label: 'Nhúng (iframe)', make: S('embed', {}) },
  ] },
  { title: 'Tab và đường dẫn', cols: 1, items: [
    { label: 'Tab xanh', make: S('tabs', {}) },
    { label: 'Tab cam', make: S('tabs', { props: { accent: '#ea580c' } }) },
    { label: 'Breadcrumb', make: S('breadcrumb', {}) },
    { label: 'Breadcrumb đậm', make: S('breadcrumb', { props: { size: 18, accent: '#111827', color: '#9ca3af' } }) },
  ] },
  ...Object.entries(ICON_CATS).map(([cat, names]) => ({ title: `Icon · ${cat}`, cols: 6, items: names.map((name) => ({ label: name, make: S('icon', { props: { name } }) })) })),
  { title: 'Ảnh và video', cols: 2, items: [
    { label: 'Ảnh', make: S('image', { props: sampleImage }) },
    { label: 'Không gian', make: S('image', { props: { src: '/editor-templates/workspace.jpg', alt: 'Không gian làm việc' } }) },
    { label: 'Sản phẩm', make: S('image', { props: { src: '/editor-templates/watch.jpg', alt: 'Đồng hồ thiết kế tối giản', fit: 'contain' } }) },
    { label: 'Chân dung', make: S('image', { w: 240, h: 300, props: { src: '/editor-templates/portrait-1.jpg', alt: 'Chân dung minh họa' } }) },
    { label: 'Video', make: S('video', { props: { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', poster: '/editor-demo/trail.jpg', title: 'Video minh họa' } }) },
  ] },
]

/** Xem trước một phần tử: khung đặt theo bề rộng thiết kế của chính phần tử nên chữ và nét co đúng tỉ lệ. */
export const Preview = ({ el, compact }: { el: FreeElement; compact?: boolean }) => (
  <div style={{ display: 'grid', placeItems: 'center', padding: compact ? 4 : 12, minHeight: compact ? 0 : 56, background: '#ffffff', borderRadius: 10, pointerEvents: 'none' }}>
    <div style={{ containerType: 'inline-size', width: '100%', maxWidth: el.type === 'icon' ? 40 : undefined }}>
      <div style={{ width: '100%', height: `${(el.type === 'icon' ? el.h : Math.min(el.h, el.w * 0.6)) / el.w * 100}cqw`, position: 'relative', overflow: 'hidden' }}>
        <FreeElementView el={{ ...el, x: 0, y: 0 }} unit={el.w} editing />
      </div>
    </div>
  </div>
)

/** Xem trước một mẫu section bằng chính các phần tử của nó. */
export const SectionPreview = ({ tpl }: { tpl: SectionTemplate }) => {
  const els = useMemo(() => tpl.build(), [tpl])
  return (
    <div style={{ position: 'relative', containerType: 'inline-size', width: '100%', background: tpl.bg ?? '#fff', borderRadius: 6, overflow: 'hidden', pointerEvents: 'none', boxShadow: 'inset 0 0 0 1px #e5e7eb' }}>
      <div style={{ height: `${(tpl.height / 1200) * 100}cqw` }} />
      <FreeOverlay elements={els} />
    </div>
  )
}

const OTHER = { id: 'other', title: 'Khác', icon: 'M5 12h.01M12 12h.01M19 12h.01' }

export const sectionTitle = { fontSize: 12, fontWeight: 700, margin: '0 0 8px', color: '#374151' } as const

function Panel({ tab, types, labelOf, T, lang }: { tab: TabDef; types: string[]; labelOf: (type: string) => string; T: T; lang: string }) {
  const [q, setQ] = useState('')
  const add = useAddFreeElement()
  const insertSection = useInsertSection()
  const { appState, dispatch } = usePuck()
  const m = q.trim().toLowerCase()
  const tpls = tab.sections ? SECTION_TEMPLATES.filter((t) => t.label.toLowerCase().includes(m)) : []
  const shown = tab.sections ? [] : types.filter((t) => `${t} ${labelOf(t)}`.toLowerCase().includes(m))
  const groups = LIBRARY.filter((g) => tab.library?.includes(g.title))
    .map((g) => ({ ...g, items: g.items.filter((it) => `${g.title} ${it.label}`.toLowerCase().includes(m)) }))
    .filter((g) => g.items.length)
  const pats = tab.patterns ? patterns.filter((p) => `${p.label} ${p.en}`.toLowerCase().includes(m)) : []
  const insertPattern = (p: (typeof patterns)[number]) => {
    const stamp = Math.random().toString(36).slice(2, 6)
    const added = p.blocks.map((b, i) => ({ type: b.type, props: { ...b.props, id: `${b.type}-${stamp}${i}` } }))
    dispatch({ type: 'setData', data: { ...appState.data, content: [...(appState.data.content ?? []), ...added] } } as any)
  }
  const empty = !shown.length && !groups.length && !pats.length && !tpls.length
  return (
    <div style={{ padding: 14 }}>
      <h3 className="he-title">{T(tab.title)}</h3>
      <input className="he-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T('Tìm khối…')} aria-label={T('Tìm khối…')} />
      {tab.sections && (
        <>
          {!m && (
            <button type="button" className="he-card" onClick={() => insertSection({ height: 400, els: [] })} style={{ cursor: 'pointer', font: 'inherit', width: '100%', marginBottom: 16, borderStyle: 'dashed', padding: '18px 10px' }}>
              ＋ {T('Tạo phần mới')}
            </button>
          )}
          <div style={sectionTitle}>{T('Mẫu')}</div>
          <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.65 }}>{T('Bấm để chèn vào dưới phần đang chọn. Mọi thứ trong phần đều kéo thả sửa được.')}</p>
          <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
            {tpls.map((tpl) => (
              <button key={tpl.id} type="button" className="he-card" onClick={() => insertSection({ height: tpl.height, bg: tpl.bg, els: tpl.build() })} style={{ cursor: 'pointer', font: 'inherit' }}>
                <SectionPreview tpl={tpl} />
                <span>{T(tpl.label)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {groups.length > 0 && <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.65 }}>{T('Chọn một phần trên trang, bấm để thêm vào phần đó, rồi kéo thả để đặt vị trí.')}</p>}
      {groups.map((g) => (
        <div key={g.title} style={{ marginBottom: 16 }}>
          <div style={sectionTitle}>{T(g.title)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${g.cols}, 1fr)`, gap: 8 }}>
            {g.items.map((it) => (
              <button key={it.label} type="button" className="he-card" title={it.label} onClick={() => add(it.make())} style={{ cursor: 'pointer', font: 'inherit', ...(g.cols >= 5 ? { padding: 4 } : null) }}>
                <Preview el={it.make()} compact={g.cols >= 5} />
              </button>
            ))}
          </div>
        </div>
      ))}
      {shown.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {(groups.length > 0 || pats.length > 0) && <div style={sectionTitle}>{T('Khối')}</div>}
          <Drawer>
            {shown.map((type) => (
              <Drawer.Item key={type} name={type} label={labelOf(type)}>
                {() => (
                  <div className="he-card">
                    <Wire type={type} />
                    <span>{labelOf(type)}</span>
                  </div>
                )}
              </Drawer.Item>
            ))}
          </Drawer>
        </div>
      )}
      {pats.length > 0 && (
        <div>
          <div style={sectionTitle}>{T('Mẫu khối')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {pats.map((p) => (
              <button key={p.id} type="button" className="he-card" onClick={() => insertPattern(p)} style={{ cursor: 'pointer', font: 'inherit', textAlign: 'left', padding: '12px 14px' }}>
                {lang === 'en' ? p.en : p.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {empty && <p style={{ opacity: 0.6, fontSize: 13 }}>{T('Không có khối phù hợp.')}</p>}
    </div>
  )
}

/** Dựng các tab của thanh icon. Tab đầu mang tên "blocks" để ghi đè tab Blocks mặc định của Puck; Layers và Fields của Puck giữ nguyên. */
export const ELEMENT_CATALOG: readonly ElementCatalogItem[] = ([['text', 'Văn bản', 'Văn bản'], ['button', 'Nút bấm', 'Phần tử'], ['image', 'Hình ảnh', 'Ảnh và video']] as const).map(([type, label, category]) => {
  const create = () => makeElement(type, type === 'image' ? { props: sampleImage } : {})
  return { type, label, category, preview: <Preview el={create()} />, create }
})

export function buildBlockPlugins(types: string[], labelOf: (type: string) => string, T: T, lang = 'vi'): Plugin[] {
  const taken = new Set<string>()
  const tabs = TABS.map((tab) => {
    const own = types.filter((t) => tab.blocks(t))
    own.forEach((t) => taken.add(t))
    return { ...tab, own }
  })
  const rest = types.filter((t) => !taken.has(t))
  const all = [...tabs, ...(rest.length ? [{ ...OTHER, blocks: () => true, own: rest } as TabDef & { own: string[] }] : [])].filter((x) => x.own.length || (x as TabDef).library?.length || (x as TabDef).patterns)
  const plugins: Plugin[] = all.map((tab, i) => ({
    name: i === 0 ? 'blocks' : `blocks-${tab.id}`,
    label: T(tab.title),
    icon: <Icon d={tab.icon} />,
    render: () => <Panel tab={tab} types={tab.own} labelOf={labelOf} T={T} lang={lang} />,
  }))
  return [...plugins, outlinePlugin({ label: T('Cấu trúc'), icon: <Icon d="M4 6h16M8 12h12M12 18h8" /> })]
}
