import type { BlockSchema, HossoPlugin, PluginManifest } from '@hosso/studio-blocks'
import React from 'react'
import manifest from '../hosso.json'
import { Portal } from './Portal'
import { RefCapture } from './RefCapture'
import { css } from './styles'

const portalBlock: BlockSchema<{ heading: string; navigation: string; showAssisted: string; showWithdrawals: string; policyText: string }> = {
  type: 'AffiliatePortal',
  label: 'Cổng cộng tác viên',
  fields: { heading: { type: 'text', label: 'Tiêu đề' }, navigation: { type: 'radio', label: 'Điều hướng', options: [{ label: 'Thanh bên', value: 'sidebar' }, { label: 'Menu ngang', value: 'tabs' }] }, showAssisted: { type: 'radio', label: 'Mục lên đơn hộ', options: [{ label: 'Hiện', value: 'yes' }, { label: 'Ẩn', value: 'no' }] }, showWithdrawals: { type: 'radio', label: 'Mục rút tiền', options: [{ label: 'Hiện', value: 'yes' }, { label: 'Ẩn', value: 'no' }] }, policyText: { type: 'textarea', label: 'Nội dung chính sách bổ sung' } },
  defaultProps: { heading: 'Cổng cộng tác viên', navigation: 'sidebar', showAssisted: 'yes', showWithdrawals: 'yes', policyText: '' },
}

// Browser imports keep renderers and metadata without loading Payload's server runtime.
const plugin: HossoPlugin = {
  id: 'affiliate',
  manifest: manifest as PluginManifest,
  headerSlot: RefCapture,
  blocks: [portalBlock],
  // Editor runtime callbacks cannot cross the server/client component boundary.
  fallbackRenderers: { AffiliatePortal: ({ heading, navigation, showAssisted, showWithdrawals, policyText, _noFree }) => React.createElement(Portal, { heading, navigation, showAssisted, showWithdrawals, policyText, canvasPreview: Boolean(_noFree) }) },
  css,
  adminEn: { 'Tiếp thị liên kết': 'Affiliate marketing', 'Cổng cộng tác viên': 'Partner portal', 'Tiêu đề': 'Heading' },
  adminNav: [{ label: 'Tiếp thị liên kết', href: '/admin/affiliate', roles: ['admin'] }],
}

export default plugin
