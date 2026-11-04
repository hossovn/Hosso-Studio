export const REVIEW_STATES = ['draft', 'review', 'changes', 'approved', 'scheduled'] as const
export type CmsMeta = { parent?: string; order?: number; review?: typeof REVIEW_STATES[number]; assignee?: string; note?: string; scheduledAt?: string | null; log?: { at: string; actor: string; action: string; note: string }[] }
export const cmsMeta = (value: any): CmsMeta => ({ parent: String(value?.parent ?? '').slice(0, 80), order: Math.max(0, Math.min(100000, Number(value?.order) || 0)), review: REVIEW_STATES.includes(value?.review) ? value.review : 'draft', assignee: String(value?.assignee ?? '').slice(0, 100), note: String(value?.note ?? '').slice(0, 2000), scheduledAt: typeof value?.scheduledAt === 'string' ? value.scheduledAt : null, log: Array.isArray(value?.log) ? value.log.slice(-30) : [] })
export function pageTree<T extends { id: string | number; cms?: any }>(docs: T[]) {
  const result: (T & { depth: number })[] = [], visited = new Set<string>()
  const walk = (parent: string, depth: number) => { for (const doc of docs.filter((item) => cmsMeta(item.cms).parent === parent).sort((a,b) => (a.cms?.order ?? 0) - (b.cms?.order ?? 0))) { if (visited.has(String(doc.id))) continue; visited.add(String(doc.id)); result.push({ ...doc, depth }); walk(String(doc.id), Math.min(12, depth + 1)) } }
  walk('', 0)
  for (const doc of docs) if (!visited.has(String(doc.id))) { visited.add(String(doc.id)); result.push({ ...doc, depth: 0 }); walk(String(doc.id), 1) }
  return result
}
export function articleOutline(value: any): { title: string; tag: string; index: number }[] {
  const text = (node: any): string => typeof node?.text === 'string' ? node.text : (node?.children ?? []).map(text).join('')
  return (value?.root?.children ?? []).flatMap((node: any, index: number) => node.type === 'heading' ? [{ title: text(node), tag: node.tag || 'h2', index }] : [])
}
export function containsMedia(value: any, id: string, filename: string, key = ''): boolean {
  if (typeof value === 'string') return value.includes('/api/media/file/' + filename) || value.includes('/api/media/file/' + encodeURIComponent(filename)) || ['cover','image','logo','favicon','value'].includes(key) && value === id
  if (typeof value === 'number') return ['cover','image','logo','favicon','value'].includes(key) && String(value) === id
  if (Array.isArray(value)) return value.some((v) => containsMedia(v, id, filename, key))
  return !!value && typeof value === 'object' && Object.entries(value).some(([k,v]) => !['id','createdBy'].includes(k) && containsMedia(v, id, filename, k))
}
