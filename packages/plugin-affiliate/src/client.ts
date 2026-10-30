import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import React from 'react'
import manifest from '../hosso.json'
import { Portal } from './Portal'
import { RefCapture } from './RefCapture'
import { css } from './styles'

const portalBlock: BlockSchema<{ heading: string }> = {
  type: 'AffiliatePortal',
  label: 'Cổng cộng tác viên',
  fields: { heading: { type: 'text', label: 'Tiêu đề' } },
  defaultProps: { heading: 'Cổng cộng tác viên' },
}

// Browser imports keep renderers and metadata without loading Payload's server runtime.
const plugin: HossoPlugin = {
  id: 'affiliate',
  manifest: manifest as PluginManifest,
  headerSlot: RefCapture,
  blocks: [portalBlock],
  fallbackRenderers: { AffiliatePortal: (props) => React.createElement(Portal, { heading: props.heading }) },
  css,
  adminEn: { 'Tiếp thị liên kết': 'Affiliate marketing', 'Cổng cộng tác viên': 'Partner portal', 'Tiêu đề': 'Heading' },
  adminNav: [{ label: 'Tiếp thị liên kết', href: '/admin/affiliate', roles: ['admin'] }],
}

export default plugin
