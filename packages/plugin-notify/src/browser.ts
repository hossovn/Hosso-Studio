import { type HossoPlugin, type PluginManifest } from '@hosso/studio-blocks';
import manifest from '../hosso.json';



// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'notify',
manifest: { ...manifest, commercial: true } as PluginManifest,
adminEn: { 'Thông báo': 'Notifications' },
adminNav: [{ label: 'Thông báo đơn hàng', href: '/admin/globals/notify-settings', roles: ['admin'] }]
}
export default plugin
