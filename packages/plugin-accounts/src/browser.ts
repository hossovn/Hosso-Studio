import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks';
import React from 'react';
import manifest from '../hosso.json';
import { AccountLink, AccountPortal } from './Account';

const portalBlock: BlockSchema<{
    heading: string;
    navigation: string;
    showGarage: string;
}> = {
    type: 'AccountPortal',
    label: 'Tài khoản khách hàng',
    fields: { heading: { type: 'text', label: 'Tiêu đề' }, navigation: { type: 'radio', label: 'Điều hướng', options: [{ label: 'Thanh bên', value: 'sidebar' }, { label: 'Menu ngang', value: 'tabs' }] }, showGarage: { type: 'radio', label: 'Hồ sơ gara', options: [{ label: 'Hiện', value: 'yes' }, { label: 'Ẩn', value: 'no' }] } },
    defaultProps: { heading: 'Tài khoản của tôi', navigation: 'sidebar', showGarage: 'yes' },
};
const css = `
.ac-section{padding:calc(var(--hs-space)*2) 0}.ac-wrap{max-width:60rem;margin:0 auto;padding:0 var(--hs-space)}
.ac-wrap h2,.ac-wrap h3{font-family:var(--hs-font-heading)}
.ac-btn{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.ac-link{background:none;border:0;color:var(--hs-text);font:inherit;text-decoration:underline;cursor:pointer;padding:.3rem 0}
.ac-form{display:grid;gap:var(--hs-space);max-width:32rem;margin:1rem 0}.ac-form label{display:grid;gap:.25rem;font-weight:600}
.ac-wrap input:not(.ac-hp){font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);min-width:0}
.ac-addr{display:grid;gap:.5rem;grid-template-columns:1fr 2fr auto;align-items:center}
.ac-error{border:1px solid var(--hs-border);background:var(--hs-surface);padding:1rem;border-radius:var(--hs-radius)}
.ac-table{border-collapse:collapse;width:100%}.ac-table th,.ac-table td{text-align:left;padding:.5rem;border-bottom:1px solid var(--hs-border)}
.ac-hp{position:absolute;left:-999px}
.ac-preview-boundary{border:0;margin:0;padding:0;min-width:0}.ac-wrap{max-width:72rem;letter-spacing:0}.ac-wrap h2{font-size:1.75rem;margin:0 0 2rem;padding-bottom:1.5rem;border-bottom:1px solid var(--hs-border)}.ac-shell{display:grid;grid-template-columns:200px minmax(0,1fr);gap:2.5rem}.ac-nav{display:flex;flex-direction:column;gap:.35rem}.ac-nav button{display:flex;align-items:center;gap:.65rem;text-align:left;min-height:44px;border:0;border-radius:4px;background:transparent;color:var(--hs-text);font:inherit;padding:.75rem;cursor:pointer}.ac-nav button[aria-current=page]{background:var(--hs-text);color:var(--hs-bg)}.ac-nav button:hover:not([aria-current]){background:var(--hs-surface)}.ac-content{min-width:0}.ac-content [hidden]{display:none!important}.ac-content h3{font-size:1.2rem;margin:0 0 1rem}.ac-account-email{color:var(--hs-muted);margin:0 0 1.25rem}.ac-table-scroll{overflow:auto}.ac-table th{background:var(--hs-surface);white-space:nowrap}.ac-table th,.ac-table td{padding:1rem .75rem}.ac-wrap .ac-action{display:inline-flex;align-items:center;gap:.5rem}.ac-icon{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--hs-border);border-radius:4px;background:var(--hs-bg);color:inherit;cursor:pointer}.ac-consent-token{width:100%;min-height:100px;overflow-wrap:anywhere;font:inherit;color:var(--hs-text);background:var(--hs-surface);padding:1rem;border:1px solid var(--hs-border);box-sizing:border-box}.ac-wrap :is(button,a,input,textarea):focus-visible{outline:2px solid var(--hs-text);outline-offset:3px}.ac-navigation-tabs .ac-shell{grid-template-columns:1fr}.ac-navigation-tabs .ac-nav{flex-direction:row;flex-wrap:wrap}
@media(max-width:800px){.ac-shell{grid-template-columns:1fr;gap:1.5rem}.ac-nav{flex-direction:row;flex-wrap:wrap}.ac-addr{grid-template-columns:minmax(0,1fr) 40px}.ac-addr input:first-child{grid-column:1}.ac-addr input:nth-child(2){grid-column:1;grid-row:2}.ac-addr button{grid-column:2;grid-row:2}.ac-wrap input{box-sizing:border-box;max-width:100%}}
`;

// Public editor definition. Server integrations are intentionally absent.
const plugin: HossoPlugin = {
id: 'accounts',
manifest: { ...manifest, commercial: true } as PluginManifest,
headerSlot: AccountLink,
blocks: [portalBlock],
fallbackRenderers: { AccountPortal: (props) => React.createElement(AccountPortal, { ...props, canvasPreview: Boolean(props._noFree) }) },
css,
adminEn: { 'Khách hàng': 'Customers', 'Tài khoản khách hàng': 'Customer accounts', 'Tiêu đề': 'Heading' }
}
export default plugin
