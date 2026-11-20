import type { PayloadRequest, TaskConfig } from 'payload'
import { recordEvent } from './events'

export async function enqueueLeadEvent(req: PayloadRequest, event: string, doc: any) {
  await req.payload.jobs.queue({ task: 'analytics-record-event' as any, req, input: {
    event: { key: `${event}:${doc.id}`, event, reference: String(doc.id), attribution: doc.attribution, experiments: doc.experiments },
  } })
}

export const recordAnalyticsTask: TaskConfig<any> = {
  slug: 'analytics-record-event', retries: 8,
  inputSchema: [{ name: 'event', type: 'json', required: true }],
  handler: async ({ req, input }) => {
    try { await recordEvent(req.payload, input.event, req) }
    catch { throw new Error('Analytics event pending; retry after restoring analytics storage.') }
    return { output: {} }
  },
}
