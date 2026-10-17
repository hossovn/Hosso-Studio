import type { Config } from 'payload'

import { configLabels } from './admin-en/config'

const KEYS = new Set(['label', 'description', 'placeholder', 'singular', 'plural', 'group'])

// Gói chuỗi tiếng Việt thành { vi, en } khi có bản dịch; chuỗi không có trong từ điển giữ nguyên.
const bilingual = (vi: string, extra: Record<string, string>) => {
  const en = configLabels[vi] ?? extra[vi]
  return en ? { vi, en } : vi
}

function walk(node: unknown, extra: Record<string, string>): unknown {
  if (Array.isArray(node)) return node.map((n) => walk(n, extra))
  if (!node || typeof node !== 'object') return node
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && KEYS.has(k)) out[k] = bilingual(v, extra)
    // Tùy chọn của select/radio: { label, value }
    else if (k === 'options' && Array.isArray(v)) out[k] = v.map((o) => (o && typeof o === 'object' && typeof o.label === 'string' ? { ...o, label: bilingual(o.label, extra) } : o))
    // Không đụng vào hàm, component, điều kiện... (chỉ đi qua object/mảng thuần).
    else if (v && typeof v === 'object' && !(v instanceof Date) && !(v instanceof RegExp)) out[k] = walk(v, extra)
    else out[k] = v
  }
  return out
}

/**
 * Làm nhãn collection/global (tên, mô tả, gợi ý, nhóm, tùy chọn) hiện theo ngôn ngữ admin: chuỗi tiếng Việt có trong từ điển
 * được đổi thành { vi, en }. `extra` là từ điển bổ sung của plugin (HossoPlugin.adminEn).
 */
export function translateConfig(config: Config, extra: Record<string, string> = {}): Config {
  return {
    ...config,
    collections: config.collections?.map((c) => walk(c, extra) as never),
    globals: config.globals?.map((g) => walk(g, extra) as never),
  }
}
