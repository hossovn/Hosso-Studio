import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks';
import manifest from '../hosso.json';
import React from 'react';
import { Track } from './Track';

const trackBlock: BlockSchema<{
    heading: string;
}> = {
    type: 'ShippingTrack',
    label: 'Tra cứu vận đơn',
    fields: { heading: { type: 'text', label: 'Tiêu đề' } },
    defaultProps: { heading: 'Tra cứu vận đơn' },
};
const css = `
.wp-ship{max-width:40rem;margin:0 auto;padding:calc(var(--hs-space)*2) var(--hs-space)}
.wp-ship h2{font-family:var(--hs-font-heading)}
.wp-ship-form{display:grid;gap:var(--hs-space)}.wp-ship-form label{display:grid;gap:.25rem;font-weight:600}
.wp-ship input{font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.wp-ship button{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.wp-ship dl{display:grid;grid-template-columns:max-content 1fr;gap:.35rem 1.5rem;margin:1.5rem 0}.wp-ship dt{color:var(--hs-muted)}.wp-ship dd{margin:0}
.wp-ship a{color:var(--hs-primary)}
`;

// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'shipping',
manifest: { ...manifest, commercial: true } as PluginManifest,
adminNav: [
    { label: 'Vận đơn', href: '/admin/collections/shipments', roles: ['admin'] },
    { label: 'Đơn vị vận chuyển', href: '/admin/globals/shipping-settings', roles: ['admin'] },
],
blocks: [trackBlock],
fallbackRenderers: { ShippingTrack: (props) => React.createElement(Track, { heading: props.heading }) },
css,
adminEn: { 'Giao vận': 'Shipping', 'Vận đơn': 'Shipments', 'Đơn vị vận chuyển': 'Carriers', 'Tra cứu vận đơn': 'Track shipment', 'Tiêu đề': 'Heading' }
}
export default plugin
