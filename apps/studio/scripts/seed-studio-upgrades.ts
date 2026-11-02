import { getPayload } from 'payload'
import config from '../src/payload.config'

if (!process.env.HOSSO_DATABASE_URL?.includes('hosso-studio-browser-')) throw new Error('This fixture requires a disposable browser-test database')
const payload = await getPayload({ config })
const content = { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'hero', height: 500, _els: [
  { id: 'headline', type: 'heading', x: 80, y: 80, w: 520, h: 150, props: { text: 'Studio responsive preview', level: 1, size: 60, weight: 700, color: '#172e23' } },
  { id: 'photo', type: 'image', x: 650, y: 60, w: 460, h: 340, props: { src: '/editor-templates/workspace.jpg', alt: 'Workspace' } },
] } }] }
await payload.create({ collection: 'pages', data: { title: 'Studio test', slug: 'home', description: 'A complete test page.', content, _status: 'published' } })
await payload.updateGlobal({ slug: 'site-settings', data: { siteName: 'Studio test', theme: 'default', _status: 'published' } })
await payload.updateGlobal({ slug: 'site-areas', data: { siteHeader: { root: { props: {} }, content: [{ type: 'FreeCanvas', props: { id: 'header', height: 100, _els: [{ id: 'header-title', type: 'text', x: 80, y: 20, w: 800, h: 50, props: { text: 'Published header', size: 28 } }] } }] }, _status: 'published' } })
await payload.destroy()
console.log('Browser fixture ready')
