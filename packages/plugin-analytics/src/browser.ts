import type { HossoPlugin, PluginManifest } from '@hosso/studio-blocks';
import manifest from '../hosso.json';
import { Tracker } from './Tracker';
import { Experiment } from './Experiment';
import { experimentBlock } from './experiment-schema';



// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'analytics',
manifest: { ...manifest, commercial: true } as PluginManifest,
headerSlot: Tracker,
blocks: [experimentBlock],
fallbackRenderers: { AnalyticsExperiment: Experiment as any },
adminEn: { 'Tiếp thị': 'Marketing' },
adminNav: [{ label: 'Phễu chuyển đổi', href: '/admin/analytics', roles: ['admin', 'publisher'] }, { label: 'Theo dõi và quảng cáo', href: '/admin/globals/analytics-settings', roles: ['admin'] }]
}
export default plugin
