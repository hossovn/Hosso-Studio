import React from 'react'
import { DefaultTemplate } from '@payloadcms/next/templates'
import { RenderServerComponent } from '@payloadcms/ui/elements/RenderServerComponent'
import type { AdminViewServerProps, PayloadComponent } from 'payload'

export function AdminViewShell({ Content, ...props }: AdminViewServerProps & { Content: PayloadComponent }) {
  const { req, permissions, locale, visibleEntities } = props.initPageResult
  const { browseByFolderSlugs, clientConfig, collectionSlug, docID, documentSubViewType, folderID, globalSlug, viewType } = props
  return <DefaultTemplate
    req={req} i18n={req.i18n} payload={req.payload} user={props.user}
    permissions={permissions} locale={locale} params={props.params} searchParams={props.searchParams}
    viewActions={props.viewActions} viewType={viewType}
    visibleEntities={{ collections: [...visibleEntities.collections], globals: [...visibleEntities.globals] }}
  >
    <div className="ha-managed-view">
      {RenderServerComponent({
        Component: Content, importMap: props.importMap,
        clientProps: { browseByFolderSlugs, clientConfig, collectionSlug, docID, documentSubViewType, folderID, globalSlug, viewType },
        serverProps: props,
      })}
    </div>
  </DefaultTemplate>
}
