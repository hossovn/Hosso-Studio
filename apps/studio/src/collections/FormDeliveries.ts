import type { CollectionConfig } from 'payload'
import { moderators, canPublish } from '../lib/access'

export const FormDeliveries: CollectionConfig = {
  slug: 'form-deliveries',
  labels: { singular: 'Lần chuyển lead', plural: 'Lịch sử chuyển lead' },
  admin: { group: 'Nội dung', defaultColumns: ['submission', 'channel', 'status', 'attempts', 'nextAt'] },
  access: { create: () => false, read: moderators, update: () => false, delete: () => false },
  fields: [
    { name: 'key', type: 'text', unique: true, required: true, admin: { hidden: true } },
    { name: 'submission', type: 'relationship', relationTo: 'form-submissions', required: true, index: true },
    { name: 'channel', type: 'select', options: ['email', 'webhook'], required: true },
    { name: 'destination', type: 'text', required: true, access: { read: ({ req }) => canPublish(req.user) } },
    { name: 'status', type: 'select', options: ['pending', 'sending', 'retry', 'sent', 'failed'], defaultValue: 'pending', index: true },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'nextAt', type: 'date', index: true },
    { name: 'leaseUntil', type: 'date', index: true },
    { name: 'leaseToken', type: 'text', access: { read: () => false }, admin: { hidden: true } },
    { name: 'sentAt', type: 'date' },
    { name: 'lastError', type: 'text' },
  ],
}
