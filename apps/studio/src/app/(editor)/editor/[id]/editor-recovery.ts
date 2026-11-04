export type RecoveryRecord = { version: 1; time: number; baseRevision: string; data: any; metadata?: any }
export function parseRecovery(raw: string | null, now = Date.now()): RecoveryRecord | null {
  if (!raw || raw.length > 6_000_000) return null
  try {
    const value = JSON.parse(raw)
    if (value.version !== 1 || !Number.isFinite(value.time) || now - value.time > 7 * 86400_000 || value.time > now + 60_000 || typeof value.baseRevision !== 'string') return null
    if (!value.data || !Array.isArray(value.data.content) || !value.data.content.every((block: any) => block && typeof block.type === 'string' && block.props && typeof block.props === 'object')) return null
    return value
  } catch { return null }
}
export function newestRecovery(storage: Pick<Storage, 'length' | 'key' | 'getItem'>, prefix: string): { key: string; record: RecoveryRecord } | null {
  let best: { key: string; record: RecoveryRecord } | null = null
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key?.startsWith(prefix)) continue
    const record = parseRecovery(storage.getItem(key))
    if (record && (!best || record.time > best.record.time)) best = { key, record }
  }
  return best
}
