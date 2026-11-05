import type { CollectionConfig } from 'payload'
import { pageEditors } from '../lib/access'
import {isContentRestricted} from '../lib/content-permissions'

export const SiteReleases: CollectionConfig = {
  slug: 'site-releases',
  labels: { singular: { vi: 'Bản phát hành website', en: 'Site release' }, plural: { vi: 'Lịch sử xuất bản', en: 'Release history' } },
  admin: { hidden: true, useAsTitle: 'title' },
  access: { read: async args => !(await isContentRestricted(args.req)) && await pageEditors(args), create: () => false, update: () => false, delete: () => false },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'actor', type: 'text', required: true },
    { name: 'action', type: 'select', required: true, options: ['publish', 'restore'] },
    { name: 'sourceRelease', type: 'text' },
    { name: 'reviewToken', type: 'text', unique: true, required: true },
    { name: 'before', type: 'json', required: true, access: { read: () => false } },
    { name: 'after', type: 'json', required: true, access: { read: () => false } },
    { name: 'summary', type: 'json', required: true },
  ],
}
