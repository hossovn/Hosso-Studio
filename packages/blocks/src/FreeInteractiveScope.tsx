'use client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CANVAS_WIDGET_CSS } from './canvas-widgets'
import { materializeFrameVariant, type FrameVariant } from './design-presets'
import { elementFamily, inheritedElementFlag, inheritedHideClasses } from './free-geometry'
import { readLinkAction } from './link-actions'
import { resolveMotionConfig } from './motion-effects'
import { MotionScope } from './MotionScope'
import { baseDevice, layoutVariants, layoutWidth, variantCss } from './responsive-breakpoints'
import { blockForDevice } from './responsive-layout'
import { FREE_MAX_PX, FREE_W, FreeElementView, type FreeElement } from './FreeCanvas'

export function defaultActiveVariants(list: FreeElement[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const el of list) {
    if (el.type !== 'container') continue
    const variants: FrameVariant[] = Array.isArray(el.props._variants) ? el.props._variants : []
    if (!variants.length) continue
    const cur = typeof el.props._variant === 'string' ? el.props._variant : ''
    out[el.id] = variants.some((v) => v.id === cur) ? cur : variants[0].id
  }
  return out
}

export function projectInteractiveList(
  list: FreeElement[],
  activeVariants: Record<string, string>,
  hidePopovers = true,
): FreeElement[] {
  let current = list
  for (const el of list) {
    if (el.type !== 'container') continue
    const variants: FrameVariant[] = Array.isArray(el.props._variants) ? el.props._variants : []
    if (!variants.length) continue
    const fallback = typeof el.props._variant === 'string' && variants.some((v) => v.id === el.props._variant)
      ? el.props._variant
      : variants[0].id
    const target = activeVariants[el.id] ?? fallback
    if (target && variants.some((v) => v.id === target)) {
      current = materializeFrameVariant(current, el.id, target)
    }
  }
  if (!hidePopovers) return current
  const hiddenIds = new Set<string>()
  for (const el of current) {
    if (el.type === 'container' && el.props._isPopover) {
      for (const item of elementFamily(current, el.id)) hiddenIds.add(item.id)
    }
  }
  return hiddenIds.size ? current.filter((el) => !hiddenIds.has(el.id)) : current
}

export function extractPopoverFamily(
  list: FreeElement[],
  frameId: string,
  activeVariants: Record<string, string>,
): FreeElement[] | null {
  const rawRoot = list.find((el) => el.id === frameId && el.type === 'container' && el.props._isPopover)
  if (!rawRoot) return null
  const projected = projectInteractiveList(list, activeVariants, false)
  const root = projected.find((el) => el.id === frameId && el.type === 'container')
  if (!root) return null
  const family = elementFamily(projected, frameId)
  return family.map((el) => ({
    ...el,
    x: el.x - root.x,
    y: el.y - root.y,
  }))
}

export function isTriggerActive(
  href: unknown,
  activeVariants: Record<string, string>,
  defaultVariants: Record<string, string>,
  openPopoverId: string | null,
): boolean {
  const act = readLinkAction(href)
  if (act.type === 'state' && act.frameId && act.variantId) {
    const cur = activeVariants[act.frameId] ?? defaultVariants[act.frameId]
    return cur === act.variantId
  }
  if (act.type === 'popover' && act.frameId) {
    return openPopoverId === act.frameId
  }
  return false
}

export type OpenPopoverState = {
  frameId: string
  triggerEl: HTMLElement | null
  doc: Document
}

type StoreSnapshot = {
  activeVariants: Record<string, string>
  defaultVariants: Record<string, string>
  openPopover: OpenPopoverState | null
}

type DocStore = {
  state: StoreSnapshot
  listeners: Set<() => void>
}

const stores = new WeakMap<Document, DocStore>()

function getDocStore(doc: Document): DocStore {
  let store = stores.get(doc)
  if (!store) {
    store = {
      state: { activeVariants: {}, defaultVariants: {}, openPopover: null },
      listeners: new Set(),
    }
    stores.set(doc, store)
  }
  return store
}

function notify(store: DocStore) {
  for (const fn of store.listeners) fn()
}

export function useInteractiveElements(
  list: FreeElement[],
  enabled: boolean,
  hostRef: React.RefObject<HTMLElement | null>,
) {
  const localDefaults = useMemo(() => defaultActiveVariants(list), [list])
  const [snap, setSnap] = useState<StoreSnapshot>({
    activeVariants: {},
    defaultVariants: localDefaults,
    openPopover: null,
  })

  useEffect(() => {
    if (!enabled) return
    const doc = hostRef.current?.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
    if (!doc) return
    const store = getDocStore(doc)
    let changed = false
    const mergedDefaults = { ...store.state.defaultVariants }
    for (const [k, v] of Object.entries(localDefaults)) {
      if (mergedDefaults[k] !== v) {
        mergedDefaults[k] = v
        changed = true
      }
    }
    if (changed) {
      store.state = { ...store.state, defaultVariants: mergedDefaults }
    }
    const sync = () => setSnap(store.state)
    sync()
    store.listeners.add(sync)
    if (changed) notify(store)
    return () => {
      store.listeners.delete(sync)
    }
  }, [enabled, hostRef, localDefaults])

  const mergedDefaults = useMemo(
    () => ({ ...localDefaults, ...snap.defaultVariants }),
    [localDefaults, snap.defaultVariants],
  )

  const projected = useMemo(
    () => (enabled ? projectInteractiveList(list, snap.activeVariants, true) : list),
    [enabled, list, snap.activeVariants],
  )

  const setFrameVariant = useCallback(
    (doc: Document, frameId: string, variantId: string) => {
      const store = getDocStore(doc)
      if ((store.state.activeVariants[frameId] ?? store.state.defaultVariants[frameId]) === variantId) return
      store.state = {
        ...store.state,
        activeVariants: { ...store.state.activeVariants, [frameId]: variantId },
      }
      notify(store)
    },
    [],
  )

  const togglePopover = useCallback((doc: Document, frameId: string, triggerEl: HTMLElement | null) => {
    const store = getDocStore(doc)
    const closing = store.state.openPopover?.frameId === frameId
    store.state = {
      ...store.state,
      openPopover: closing ? null : { frameId, triggerEl, doc },
    }
    notify(store)
  }, [])

  const closePopover = useCallback((restoreFocus = false) => {
    const doc = hostRef.current?.ownerDocument ?? (typeof document !== 'undefined' ? document : null)
    if (!doc) return
    const store = getDocStore(doc)
    const prevTrigger = store.state.openPopover?.triggerEl
    if (!store.state.openPopover) return
    store.state = { ...store.state, openPopover: null }
    notify(store)
    if (restoreFocus && prevTrigger) prevTrigger.focus()
  }, [hostRef])

  const triggerProps = useCallback(
    (href: unknown): Record<string, any> => {
      if (!enabled) return {}
      const act = readLinkAction(href)
      if (act.type === 'state' && act.frameId && act.variantId) {
        const active = isTriggerActive(href, snap.activeVariants, mergedDefaults, snap.openPopover?.frameId ?? null)
        return {
          role: 'tab',
          'aria-selected': active,
          'data-hs-state-target': act.frameId,
          'data-hs-state-variant': act.variantId,
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            e.preventDefault()
            setFrameVariant(e.currentTarget.ownerDocument, act.frameId!, act.variantId!)
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
            const doc = e.currentTarget.ownerDocument
            const peers = Array.from(
              doc.querySelectorAll<HTMLElement>(`[data-hs-state-target="${CSS.escape(act.frameId!)}"]`),
            ).filter((node) => node.offsetParent !== null)
            const idx = peers.indexOf(e.currentTarget)
            if (idx < 0 || peers.length < 2) return
            e.preventDefault()
            const nextIdx =
              e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? peers.length - 1
                  : e.key === 'ArrowRight' || e.key === 'ArrowDown'
                    ? (idx + 1) % peers.length
                    : (idx - 1 + peers.length) % peers.length
            const nextEl = peers[nextIdx]
            nextEl.focus()
            const nextVar = nextEl.getAttribute('data-hs-state-variant')
            if (nextVar) setFrameVariant(doc, act.frameId!, nextVar)
          },
        }
      }
      if (act.type === 'popover' && act.frameId) {
        const active = snap.openPopover?.frameId === act.frameId
        return {
          role: 'button',
          'aria-haspopup': 'dialog',
          'aria-expanded': active,
          'data-hs-popover-trigger': act.frameId,
          onClick: (e: React.MouseEvent<HTMLElement>) => {
            e.preventDefault()
            togglePopover(e.currentTarget.ownerDocument, act.frameId!, e.currentTarget)
          },
          onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
            if (e.key === ' ') {
              e.preventDefault()
              togglePopover(e.currentTarget.ownerDocument, act.frameId!, e.currentTarget)
            }
          },
        }
      }
      return {}
    },
    [enabled, mergedDefaults, setFrameVariant, snap.activeVariants, snap.openPopover?.frameId, togglePopover],
  )

  const isActive = useCallback(
    (href: unknown) =>
      enabled ? isTriggerActive(href, snap.activeVariants, mergedDefaults, snap.openPopover?.frameId ?? null) : false,
    [enabled, mergedDefaults, snap.activeVariants, snap.openPopover?.frameId],
  )

  const activeVariantOf = useCallback(
    (frameId: string) => snap.activeVariants[frameId] ?? mergedDefaults[frameId] ?? '',
    [mergedDefaults, snap.activeVariants],
  )

  return {
    projected,
    activeVariants: snap.activeVariants,
    openPopover: snap.openPopover,
    closePopover,
    triggerProps,
    isActive,
    activeVariantOf,
  }
}

const POPOVER_CSS = `
@media(prefers-reduced-motion:no-preference){
  .hs-popover-portal{animation:hsPopoverIn 160ms cubic-bezier(.23,1,.32,1);transform-origin:top center}
  .hs-tab-panel-swap{animation:hsTabSwap 180ms cubic-bezier(.23,1,.32,1)}
}
@keyframes hsPopoverIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes hsTabSwap{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
`

export const INTERACTIVE_MOTION_CSS = POPOVER_CSS

export function InteractivePopoverPortal({
  list,
  activeVariants,
  openPopover,
  onClose,
  renderElement,
}: {
  list: FreeElement[]
  activeVariants: Record<string, string>
  openPopover: OpenPopoverState | null
  onClose: (restoreFocus?: boolean) => void
  renderElement: (el: FreeElement, scale: number) => React.ReactNode
}) {
  const [, setTick] = useState(0)
  const family = useMemo(
    () => (openPopover ? extractPopoverFamily(list, openPopover.frameId, activeVariants) : null),
    [activeVariants, list, openPopover],
  )

  useEffect(() => {
    if (!openPopover || !family) return
    const doc = openPopover.doc
    const win = doc.defaultView
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (!target) return
      if (target.closest('[data-hs-popover-box]') || target.closest('[data-hs-popover-trigger]')) return
      onClose(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose(true)
      }
    }
    const onReflow = () => setTick((n) => n + 1)
    doc.addEventListener('pointerdown', onPointerDown, true)
    doc.addEventListener('keydown', onKeyDown, true)
    win?.addEventListener('scroll', onReflow, { passive: true })
    win?.addEventListener('resize', onReflow, { passive: true })
    return () => {
      doc.removeEventListener('pointerdown', onPointerDown, true)
      doc.removeEventListener('keydown', onKeyDown, true)
      win?.removeEventListener('scroll', onReflow)
      win?.removeEventListener('resize', onReflow)
    }
  }, [family, onClose, openPopover])

  if (!openPopover || !family || !openPopover.doc?.body) return null
  const root = family[0]
  const win = openPopover.doc.defaultView
  const vw = win?.innerWidth || 1200
  const vh = win?.innerHeight || 800
  const width = Math.min(Math.max(120, root.w), Math.max(120, vw - 16))
  const scale = width / Math.max(1, root.w)
  const height = root.h * scale
  const rect = openPopover.triggerEl?.getBoundingClientRect()
  const rawLeft = rect ? rect.left + rect.width / 2 - width / 2 : (vw - width) / 2
  const left = Math.min(Math.max(8, rawLeft), Math.max(8, vw - width - 8))
  const belowTop = rect ? rect.bottom + 8 : (vh - height) / 2
  const aboveTop = rect ? rect.top - height - 8 : belowTop
  const top = belowTop + height > vh - 8 && aboveTop >= 8 ? aboveTop : Math.min(Math.max(8, belowTop), Math.max(8, vh - height - 8))

  return createPortal(
    <div
      className="hs-popover-portal"
      role="dialog"
      aria-modal="false"
      data-hs-popover-box={openPopover.frameId}
      style={{
        position: 'fixed',
        left,
        top,
        width,
        height,
        zIndex: 90,
      }}
    >
      <style>{POPOVER_CSS}</style>
      {family.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x * scale,
            top: el.y * scale,
            width: el.w * scale,
            height: el.h * scale,
            pointerEvents: el.type === 'container' ? 'none' : 'auto',
          }}
        >
          {renderElement(el, scale)}
        </div>
      ))}
    </div>,
    openPopover.doc.body,
  )
}

/** Lớp phần tử phủ lên một block (prop `_els`): rộng tối đa FREE_MAX_PX, canh giữa, hỗ trợ đổi biến thể `#state:` và hộp nổi `#popover:`. */
export function FreeOverlay({
  elements,
  height,
  responsive,
  breakpoints,
  scope = 'page',
  widgets = {},
}: {
  elements: FreeElement[]
  height?: number
  responsive?: Record<string, any>
  breakpoints?: unknown
  scope?: string
  widgets?: Record<string, React.ReactNode>
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const interactive = useInteractiveElements(elements, true, hostRef)
  const projected = interactive.projected
  const devices = elements.some(
    (el) =>
      Object.keys(el.responsive ?? {}).length ||
      el.props._constraints ||
      el.props._layout ||
      (Array.isArray(el.props._variants) &&
        el.props._variants.some((v: any) =>
          (v.elements ?? []).some((ve: any) => Object.keys(ve.responsive ?? {}).length),
        )),
  )
    ? layoutVariants(breakpoints)
    : (['desktop'] as const)
  const hasWidgets =
    elements.some((el) => el.type === 'widget') ||
    elements.some((el) =>
      Array.isArray(el.props._variants) &&
      el.props._variants.some((v: any) => (v.elements ?? []).some((ve: any) => ve.type === 'widget')),
    )
  const hasInteractiveMotion = elements.some(
    (el) => el.type === 'container' && Array.isArray(el.props._variants) && el.props._variants.length > 0,
  )
  const widgetFor = (el: FreeElement) => {
    const pv = el.parentId ? interactive.activeVariantOf(el.parentId) : ''
    return (pv && widgets[`${pv}::${el.id}`]) ?? widgets[el.id]
  }
  return (
    <div
      ref={hostRef}
      className="hs-free-layer"
      data-scroll-boundary
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: `min(100%, ${FREE_MAX_PX}px)`,
        margin: '0 auto',
        containerType: 'inline-size',
        pointerEvents: 'none',
      }}
    >
      {hasWidgets && <style>{CANVAS_WIDGET_CSS}</style>}
      {hasInteractiveMotion && <style>{POPOVER_CSS}</style>}
      <MotionScope
        enabled={projected.some(
          (el) =>
            !el.props._hidden &&
            resolveMotionConfig(el.props)?.loop?.preset &&
            resolveMotionConfig(el.props)?.loop?.preset !== 'none',
        )}
      >
        {devices.length > 1 && <style>{variantCss(scope + '-overlay', breakpoints)}</style>}
        <div data-hs-variants={encodeURIComponent(scope + '-overlay')} style={{ position: 'absolute', inset: 0 }}>
          {devices.map((device) => (
            <div
              key={device}
              data-hs-variant={devices.length > 1 ? device : undefined}
              style={{ position: 'absolute', inset: 0, display: device === 'desktop' ? 'block' : 'none' }}
            >
              {blockForDevice({ type: 'FreeCanvas', props: { _els: projected, height, _responsive: responsive } }, device).props._els.map(
                (el: FreeElement) => {
                  const isTabFrame = el.type === 'container' && Array.isArray(el.props._variants) && el.props._variants.length > 0
                  const parentVariant = el.parentId ? interactive.activeVariantOf(el.parentId) : ''
                  const swapClass = parentVariant ? 'hs-tab-panel-swap' : ''
                  return (
                    <div
                      key={parentVariant ? `${el.id}-${parentVariant}` : el.id}
                      role={isTabFrame ? 'tabpanel' : undefined}
                      className={[inheritedHideClasses(projected, el.id), swapClass].filter(Boolean).join(' ') || undefined}
                      style={{
                        display: inheritedElementFlag(projected, el.id, '_hidden', baseDevice(layoutWidth(device)))
                          ? 'none'
                          : undefined,
                        position: 'absolute',
                        left: `${(el.x / FREE_W) * 100}%`,
                        top: `${(el.y / FREE_W) * 100}cqw`,
                        width: `${(el.w / FREE_W) * 100}%`,
                        height: `${(el.h / FREE_W) * 100}cqw`,
                        pointerEvents: el.type === 'container' ? 'none' : 'auto',
                        zIndex: el.type === 'container' ? 0 : 1,
                      }}
                    >
                      <FreeElementView
                        el={el}
                        state={interactive.isActive(el.props.href) ? 'active' : undefined}
                        linkProps={interactive.triggerProps(el.props.href)}
                        itemLinkProps={interactive.triggerProps}
                      >
                        {widgetFor(el)}
                      </FreeElementView>
                    </div>
                  )
                },
              )}
            </div>
          ))}
        </div>
      </MotionScope>
      <InteractivePopoverPortal
        list={elements}
        activeVariants={interactive.activeVariants}
        openPopover={interactive.openPopover}
        onClose={interactive.closePopover}
        renderElement={(el, scale) => (
          <FreeElementView
            el={el}
            scale={scale}
            state={interactive.isActive(el.props.href) ? 'active' : undefined}
            linkProps={interactive.triggerProps(el.props.href)}
            itemLinkProps={interactive.triggerProps}
          >
            {widgetFor(el)}
          </FreeElementView>
        )}
      />
    </div>
  )
}
