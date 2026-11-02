import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'

/** Serialize publication with content writes across PostgreSQL workers. SQLite uses its write transaction. */
export async function lockSitePublication(req: PayloadRequest) {
  if (req.payload.db.name !== 'postgres' || !req.transactionID) return
  const transactionID = await req.transactionID
  if (req.context.sitePublicationLock === transactionID) return
  const adapter = req.payload.db as typeof req.payload.db & { sessions: Record<string | number, { db: { execute: (query: unknown) => Promise<unknown> } }> }
  const transaction = adapter.sessions[transactionID]
  if (!transaction) throw new Error('Publication requires an active database transaction')
  await transaction.db.execute(sql`SELECT pg_advisory_xact_lock(174832019, 1)`)
  req.context.sitePublicationLock = transactionID
}

export async function lockSiteMutation({ req, operation }: { req: PayloadRequest; operation: string }) {
  if (['create', 'update', 'delete', 'restoreVersion'].includes(operation)) await lockSitePublication(req)
}
