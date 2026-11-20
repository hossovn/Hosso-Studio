import { createHash } from 'node:crypto'
import type { PayloadRequest } from 'payload'
import { inTransaction } from '@hosso/studio-blocks/transactions'
import { enqueueFormDelivery } from './form-outbox'
import { allowsServerAnalytics, cleanAttribution, cleanExperiments } from '../../../../packages/blocks/src/attribution'

export async function saveFormSubmission(req: PayloadRequest, form: any, values: Record<string, unknown>, meta: { locale?: string; requestId?: unknown; attribution?: unknown; experiments?: unknown }) {
  const requestId = typeof meta.requestId === 'string' && /^[a-f0-9-]{36}$/i.test(meta.requestId) ? meta.requestId.toLowerCase() : ''
  const submissionKey = requestId ? createHash('sha256').update(`${form.id}:${requestId}`).digest('hex') : undefined
  const existing = async () => submissionKey ? (await req.payload.find({ collection: 'form-submissions', where: { submissionKey: { equals: submissionKey } }, limit: 1, depth: 0, overrideAccess: true, req })).docs[0] : undefined
  try {
    return await inTransaction(req, async () => {
      const prior = await existing()
      if (prior) return { submission: prior, reused: true }
      const blocked = !allowsServerAnalytics(req.headers)
      const submission = await req.payload.create({ collection: 'form-submissions', data: { form: form.id, formTitle: form.title, data: values as any, locale: meta.locale, submissionKey, attribution: blocked ? {} : cleanAttribution(meta.attribution), experiments: blocked ? {} : cleanExperiments(meta.experiments) }, overrideAccess: true, req })
      await enqueueFormDelivery(req, form, submission)
      return { submission, reused: false }
    })
  } catch (error) {
    const prior = await existing()
    if (prior) return { submission: prior, reused: true }
    throw error
  }
}
