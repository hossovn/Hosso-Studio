import config from '@payload-config'
import { FreeOverlay, renderCanvasWidgets, stripUnknown, type FreeElement, type PageData } from '@hosso/studio-blocks'
import { Render } from '@puckeditor/core/rsc'
import { getPayload } from 'payload'
import React from 'react'

import { attachBlockData, expandReusable, loadSite, renderConfig } from '@/lib/site'
import { sitePreview } from '@/lib/site-preview'

/** Vùng giao diện kéo thả (trước/sau header và footer), nội dung lấy từ global site-areas theo ngôn ngữ. */
type AreaName = 'siteHeader' | 'siteFooter' | 'beforeHeader' | 'afterHeader' | 'beforeFooter' | 'afterFooter' | 'postSidebar'

/** Nội dung của vùng nếu có block, không thì null (để layout biết có dùng header/footer tự dựng hay giữ của theme). */
export async function loadArea(name: AreaName, locale: string): Promise<PageData | null> {
  const payload = await getPayload({ config })
  const areas = (await payload.findGlobal({ slug: 'site-areas', draft: await sitePreview(), locale: locale as any, depth: 0 })) as Record<string, any>
  const raw = areas[name] as PageData | null
  return raw?.content?.length ? raw : null
}

export async function Area({ name, locale }: { name: AreaName; locale: string }) {
  const raw = await loadArea(name, locale)
  if (!raw) return null
  const { theme } = await loadSite(locale)
  const puckConfig = renderConfig(theme)
  let data = stripUnknown(raw, puckConfig)
  data = await expandReusable(data, locale)
  data = await attachBlockData(data, {}, locale)
  const float = ((data as any).root?.props?._float ?? []) as FreeElement[]
  return (
    <div className={`site-area site-area-${name}`} style={float.length ? { position: 'relative' } : undefined}>
      <Render config={puckConfig as any} data={data as any} />
      {float.length > 0 && (
        <FreeOverlay
          elements={float}
          scope={`${name}-float`}
          widgets={renderCanvasWidgets(float, puckConfig.components)}
          breakpoints={data.root?.props?._breakpoints}
        />
      )}
    </div>
  )
}
