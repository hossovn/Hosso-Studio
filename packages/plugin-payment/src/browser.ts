import { type HossoPlugin, type PluginManifest } from '@hosso/studio-blocks';
import manifest from '../hosso.json';



// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'payment',
manifest: { ...manifest, commercial: true } as PluginManifest,
adminEn: { 'Thanh toán': 'Payments' },
adminNav: [
    { label: 'Khoản thanh toán', href: '/admin/collections/payments', roles: ['admin', 'publisher'] },
    { label: 'Tài khoản nhận tiền', href: '/admin/globals/payment-settings', roles: ['admin'] },
]
}
export default plugin
