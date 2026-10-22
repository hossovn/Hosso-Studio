import type { Payload } from 'payload'
import { decryptSecret, isEncrypted } from './crypto'

export type WimConfig = {
  apiUrl: string
  apiKey: string
  webhookSecret: string
  timeoutMs: number
  /** Giây. Site chạy đúng chỉ với TTL này (không cần webhook). */
  cacheTtl: number
  categoryMap: { wimCategoryId: string; label: string }[]
}

export const SETTINGS_SLUG = 'wim-settings'
export const MASK = '••••••••'

const g = globalThis as unknown as { __hossoWimCfg?: { at: number; value: WimConfig | null } }
const MEMO_MS = 5000

export const clearConfigMemo = () => {
  g.__hossoWimCfg = undefined
}

const num = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : fallback)

/**
 * Cấu hình kết nối: biến môi trường HOSSO_WIM_* được ưu tiên, nếu không có thì lấy từ trang cài đặt (đã mã hóa trong DB).
 * Trả null khi chưa đủ địa chỉ và khóa API.
 */
export async function getWimConfig(payload: Payload): Promise<WimConfig | null> {
  const memo = g.__hossoWimCfg
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.value

  const env = process.env
  const doc = (await payload
    .findGlobal({ slug: SETTINGS_SLUG as any, context: { wimUnmask: true }, overrideAccess: true })
    .catch(() => ({}))) as Record<string, any>

  const secret = async (envValue: string | undefined, stored: unknown) => {
    if (envValue) return envValue
    return isEncrypted(stored) ? decryptSecret(stored) : ''
  }

  const apiUrl = env.HOSSO_WIM_API_URL || doc.apiUrl || ''
  const apiKey = await secret(env.HOSSO_WIM_API_KEY, doc.apiKey)
  const value: WimConfig | null =
    apiUrl && apiKey
      ? {
          apiUrl,
          apiKey,
          webhookSecret: await secret(env.HOSSO_WIM_WEBHOOK_SECRET, doc.webhookSecret),
          timeoutMs: num(env.HOSSO_WIM_TIMEOUT_MS ?? doc.timeoutMs, 5000),
          cacheTtl: num(env.HOSSO_WIM_CACHE_TTL ?? doc.cacheTtl, 30),
          categoryMap: (doc.categoryMap ?? []).filter((c: any) => c?.wimCategoryId),
        }
      : null

  g.__hossoWimCfg = { at: Date.now(), value }
  return value
}
