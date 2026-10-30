import type { Config } from 'payload'
import { parsePayloadComponent } from 'payload/shared'

const shell = '/components/admin/AdminViewShell#AdminViewShell'

/** Payload leaves custom root views outside DefaultTemplate. */
export function frameAdminViews(config: Config): Config {
  const dependencies = { ...config.admin?.dependencies }
  let changed = false
  const views = Object.fromEntries(Object.entries(config.admin?.components?.views ?? {}).map(([key, view]) => {
    if (!view.path || !view.Component || (typeof view.Component === 'object' && view.Component.path === shell)) return [key, view]
    const { path, exportName } = parsePayloadComponent(view.Component)
    dependencies[`hosso-admin-view:${key}`] = { type: 'component', path: `${path}#${exportName}` }
    changed = true
    return [key, { ...view, Component: { path: shell, serverProps: { Content: view.Component } } }]
  }))
  if (!changed) return config
  return {
    ...config,
    admin: {
      ...config.admin,
      components: { ...config.admin?.components, views },
      // Payload copies admin.importMap into client config; generators there leak functions into RSC props.
      dependencies,
    },
  }
}
