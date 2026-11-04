import { elementFamily } from '../../../../../../../packages/blocks/src/free-geometry.ts'
import { PAGE, blockId, elsOf, floatOf, setBlockEls, withEls, type PageData, type Sel } from './canvas-model.ts'

export type PageChange = Sel & { name: string; kind: 'added' | 'removed' | 'changed' }
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export function pageChanges(before: PageData, after: PageData): PageChange[] {
  const changes: PageChange[] = []
  for (const id of new Set([...before.content, ...after.content].map(blockId))) {
    const a = before.content.find((b) => blockId(b) === id), b = after.content.find((b) => blockId(b) === id)
    if (!equal(a, b) || before.content.indexOf(a!) !== after.content.indexOf(b!)) changes.push({ block: id, el: '', name: String(b?.props._name || a?.props._name || b?.type || a?.type), kind: !a ? 'added' : !b ? 'removed' : 'changed' })
  }
  const owners = [...new Set([...before.content, ...after.content].map(blockId)), PAGE]
  for (const owner of owners) {
    const list = (page: PageData) => owner === PAGE ? floatOf(page) : elsOf(page.content.find((b) => blockId(b) === owner) ?? { type: '', props: {} })
    const a = list(before), b = list(after)
    for (const id of new Set([...a, ...b].map((el) => el.id))) {
      const old = a.find((el) => el.id === id), next = b.find((el) => el.id === id)
      if (!equal(old, next) || a.indexOf(old!) !== b.indexOf(next!)) changes.push({ block: owner, el: id, name: String(next?.props._name || next?.props.text || old?.props._name || old?.props.text || next?.type || old?.type).slice(0, 80), kind: !old ? 'added' : !next ? 'removed' : 'changed' })
    }
  }
  return changes
}
/** Keep surviving siblings in place, inserting the restored item at its former neighbor. */
function restoreIndex<T>(kept: T[], original: T[], id: string, key: (item: T) => string) {
  const at = original.findIndex((item) => key(item) === id)
  const previous = original.slice(0, at).reverse().find((item) => kept.some((next) => key(next) === key(item)))
  if (previous) return kept.findIndex((item) => key(item) === key(previous)) + 1
  const following = original.slice(at + 1).find((item) => kept.some((next) => key(next) === key(item)))
  return following ? kept.findIndex((item) => key(item) === key(following)) : 0
}
function removeFamilies(page: PageData, ids: Set<string>): PageData {
  const clean = (els: ReturnType<typeof elsOf>) => {
    const removed = new Set(els.filter((el) => ids.has(el.id)).flatMap((el) => elementFamily(els, el.id).map((child) => child.id)))
    return els.filter((el) => !removed.has(el.id))
  }
  return { ...page, content: page.content.map((block) => elsOf(block).some((el) => ids.has(el.id)) ? withEls(block, clean(elsOf(block))) : block),
    ...(floatOf(page).some((el) => ids.has(el.id)) ? { root: { ...page.root, props: { ...page.root?.props, _float: clean(floatOf(page)) } } } : {}) }
}
export function restorePagePart(current: PageData, before: PageData, target: Sel): PageData {
  if (!target.el) {
    const old = before.content.find((b) => blockId(b) === target.block)
    const clean = { ...current, content: current.content.filter((b) => blockId(b) !== target.block) }
    if (!old) return clean
    const unique = removeFamilies(clean, new Set(elsOf(old).map((el) => el.id)))
    const at = restoreIndex(unique.content, before.content, target.block, blockId)
    return { ...unique, content: [...unique.content.slice(0, at), structuredClone(old), ...unique.content.slice(at)] }
  }
  const oldBlock = before.content.find((b) => blockId(b) === target.block), nextBlock = current.content.find((b) => blockId(b) === target.block)
  if (target.block !== PAGE && !nextBlock) return restorePagePart(current, before, { block: target.block, el: '' })
  const old = target.block === PAGE ? floatOf(before) : oldBlock ? elsOf(oldBlock) : []
  const next = target.block === PAGE ? floatOf(current) : elsOf(nextBlock!)
  const ids = new Set(elementFamily(next, target.el).map((el) => el.id)), restored = structuredClone(elementFamily(old, target.el))
  restored.forEach((el) => ids.add(el.id))
  const clean = removeFamilies(current, ids)
  const kept = target.block === PAGE ? floatOf(clean) : elsOf(clean.content.find((b) => blockId(b) === target.block)!)
  const root = restored.find((el) => el.id === target.el)
  if (root?.parentId && !kept.some((el) => el.id === root.parentId)) root.parentId = undefined
  const at = restoreIndex(kept, old, target.el, (el) => el.id)
  return setBlockEls(clean, target.block, [...kept.slice(0, at), ...restored, ...kept.slice(at)])
}

export type VisualIssue = Sel & { code: string; message: string }
const rgb = (value: string) => { const m = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/); return m ? { channels: m.slice(1, 4).map(Number), alpha: m[4] == null ? 1 : Number(m[4]) } : null }
const luminance = (channels: number[]) => channels.map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
export function scanVisualIssues(doc: Document): VisualIssue[] {
  const issues: VisualIssue[] = [], view = doc.defaultView
  if (!view) return issues
  for (const node of doc.querySelectorAll<HTMLElement>('[data-element]')) {
    const style = view.getComputedStyle(node), rect = node.getBoundingClientRect(), block = node.closest<HTMLElement>('[data-block]')?.dataset.block ?? PAGE, el = node.dataset.element!
    if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .1) continue
    const target = node.querySelector<HTMLElement>('a,button,input,[role="button"]') ?? (node.dataset.elementType === 'button' || node.dataset.elementAction === 'true' ? node : null)
    if (target) { const box = target.getBoundingClientRect(); if (box.width && box.height && (box.width < 24 || box.height < 24)) issues.push({ block, el, code: 'target', message: 'Vùng bấm nhỏ hơn 24 px.' }) }
    const text = [...node.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,a,button,span,div')].find((item) => item.textContent?.trim() && !item.children.length)
    if (!text || text.closest('[data-free-ui]') !== node) continue
    const computed = view.getComputedStyle(text), fg = rgb(computed.color)
    let background: HTMLElement | null = text, bg: ReturnType<typeof rgb> = null, uncertain = false
    while (background) { const value = view.getComputedStyle(background); if (value.backgroundImage !== 'none' || Number(value.opacity) < 1) { uncertain = true; break } const color = rgb(value.backgroundColor); if (color && color.alpha > 0) { if (color.alpha !== 1) uncertain = true; bg = color; break } background = background.parentElement }
    if (fg?.alpha === 1 && !uncertain) {
      const l1 = luminance(fg.channels), l2 = luminance(bg?.channels ?? [255,255,255]), ratio = (Math.max(l1,l2) + .05) / (Math.min(l1,l2) + .05), large = parseFloat(computed.fontSize) >= 24 || parseFloat(computed.fontSize) >= 18.66 && Number(computed.fontWeight) >= 700
      if (ratio < (large ? 3 : 4.5)) issues.push({ block, el, code: 'contrast', message: `Chữ có độ tương phản ${ratio.toFixed(2)}:1, khó đọc trên nền này.` })
    }
    const clipped = [...node.querySelectorAll<HTMLElement>('*')].some((item) => { const value = view.getComputedStyle(item); return ['hidden', 'clip'].includes(value.overflowX) && item.scrollWidth > item.clientWidth + 3 || ['hidden', 'clip'].includes(value.overflowY) && item.scrollHeight > item.clientHeight + 3 })
    if (clipped) issues.push({ block, el, code: 'clipped', message: 'Nội dung có thể bị cắt trong khung.' })
  }
  return issues
}
