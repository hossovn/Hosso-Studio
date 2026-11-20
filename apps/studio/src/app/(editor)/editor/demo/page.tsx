'use client'
import React, { useState } from 'react'
import hosso from '@hosso-config'
import { FreeCanvasView, ScrollStory, buildPuckConfig, coreBlocks, type FreeElement } from '@hosso/studio-blocks'
import { SECTION_TEMPLATES } from '../[id]/SectionTemplates'
import { CanvasApp } from '../[id]/CanvasApp'
import type { PageData } from '../[id]/canvas-model'

const image = '/editor-demo/mountain.jpg'
const el = (id: string, type: FreeElement['type'], x: number, y: number, w: number, h: number, props: Record<string, unknown>, parentId?: string): FreeElement => ({ id, type, x, y, w, h, props, parentId })
const sample: PageData = { root: { props: {} }, content: [
  { type: 'FreeCanvas', props: { id: 'adventure', height: 800, bgImage: image, bgOverlay: 50, _els: [
    el('hero-content', 'container', 16.8, 136, 1166.4, 500, { name: 'Hero content', bg: 'transparent' }),
    el('enterprise', 'text', 300, 136, 600, 38, { text: 'ENTERPRISE CO.', size: 20, weight: 600, color: '#fff', align: 'center' }, 'hero-content'),
    el('adventure-title', 'heading', 16.8, 174, 1166.4, 250, { text: ['ADVENTURE', 'AWAITS'].join(String.fromCharCode(10)), level: 1, size: 124, lh: 1, weight: 900, color: '#fff', align: 'center' }, 'hero-content'),
    el('description', 'text', 285, 454, 630, 86, { text: 'Whether you are planning your next route or working on something new, we have everything for your adventure.', size: 22, lh: 1.5, color: '#fff', align: 'center' }, 'hero-content'),
    el('explore', 'button', 435, 574, 330, 62, { text: 'EXPLORE COLLECTIONS', href: '#collections', size: 17, weight: 700, bg: '#fff', color: '#111', radius: 4 }, 'hero-content'),
  ] } },
  { type: 'FreeCanvas', props: { id: 'collections', height: 640, _bgHex: '#f3f5f4', _els: [
    el('collection-title', 'heading', 64, 60, 900, 70, { text: 'THE NEXT CHAPTER', size: 48, weight: 800, color: '#17251e', _scroll: { mode: 'entrance', entrance: 'bounce' } }),
    el('carousel', 'swiper', 64, 170, 660, 380, { slides: [{ image, alt: 'Mountain summit', text: 'Find your own path' }, { image: '/editor-demo/trail.jpg', alt: 'Mountain trail', text: 'Beyond the everyday' }], seconds: 4, effect: 'fade', thumbnails: true }),
    el('film', 'video', 764, 170, 372, 240, { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', title: 'Field notes' }),
    el('film-caption', 'text', 764, 434, 372, 100, { text: 'FIELD NOTES / A moment outdoors.', size: 23, color: '#344b40', lh: 1.5 }),
  ] } },
  ...SECTION_TEMPLATES.filter((t) => t.id.startsWith('motion-')).map((t) => ({ type: 'FreeCanvas', props: { id: t.id, height: t.height, _bgHex: t.bg, _els: t.build() } })),
  { type: 'ScrollStory', props: { id: 'motion-story', steps: [
    { image, alt: 'Dãy núi', title: 'Khởi đầu hành trình', body: 'Cuộn để khám phá từng bước trong câu chuyện.' },
    { image: '/editor-demo/trail.jpg', alt: 'Đường núi', title: 'Tiếp tục khám phá', body: 'Ảnh thay đổi theo bước bạn đang đọc.' },
    { image: '/editor-templates/cafe.jpg', alt: 'Quán café', title: 'Dừng chân', body: 'Trên điện thoại, mỗi ảnh đi cùng nội dung theo chiều dọc.' },
  ] } },
] }

// Danh sách tính năng lấy từ registry thật (core + plugin) để panel "Tính năng" giống trang thật.
// Trong canvas demo chỉ hiện khung giữ chỗ, vì các block dữ liệu cần loader và ngữ cảnh của site.
const registry = buildPuckConfig({ schemas: [...coreBlocks, ...hosso.plugins.flatMap((plugin) => plugin.blocks ?? [])], theme: hosso.themes[0], plugins: hosso.plugins, mode: 'editor' }).components as Record<string, { label?: string }>
const placeholders = Object.fromEntries(Object.entries(registry).map(([type, block]) => [type, { ...block, render: () => <div style={{ padding: '40px 24px', border: '1.5px dashed #94a3b8', borderRadius: 16, background: '#f8fafc', color: '#475569', font: '600 16px system-ui', textAlign: 'center' }}>{block.label || type} · xem trước demo</div> }]))
const config = { components: { ...placeholders, ScrollStory: { label: 'Kể chuyện theo cuộn', render: ScrollStory }, FreeCanvas: { label: 'Section', render: (props: Record<string, any>) => <div id={props.id === 'collections' ? 'collections' : undefined} style={{ background: props._bgHex }}><FreeCanvasView {...props} /></div> } } }
export default function DemoEditor() {
  const [status, setStatus] = useState('Demo')
  return <CanvasApp config={config} data={sample} onChange={() => setStatus('Demo *')} initialSelection={{ block: 'adventure', el: 'adventure-title' }} css="html,body{font-family:Arial,sans-serif;color:#17251e}*{box-sizing:border-box}a{color:inherit}html{scroll-behavior:smooth}" htmlClass="" menu={null} title="Adventure / Home" backHref="/admin" lang="vi" labelOf={(type) => type === 'FreeCanvas' ? 'Section' : (config.components as Record<string, { label?: string }>)[type]?.label ?? type} actions={<span style={{ color: '#647168', fontSize: 12 }}>{status}</span>} />
}
