import type { Payload, PayloadRequest } from 'payload'

const sqliteWriter = Symbol.for('hosso.shop.sqliteWriter')
export async function inTransaction<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  if (req.transactionID) return work()
  let release: (() => void) | undefined
  if (req.payload.db.name === 'sqlite') {
    const state = req.payload as Payload & { [sqliteWriter]?: Promise<void> }
    const previous = state[sqliteWriter]
    state[sqliteWriter] = new Promise<void>((resolve) => { release = resolve })
    await previous
  }
  let id: string | number | null | undefined
  try {
    id = await req.payload.db.beginTransaction()
    if (!id) throw new Error('Commerce requires database transactions')
    req.transactionID = id
    const result = await work()
    await req.payload.db.commitTransaction(id)
    return result
  } catch (error) { if (id) await req.payload.db.rollbackTransaction(id); throw error }
  finally { delete req.transactionID; release?.() }
}
