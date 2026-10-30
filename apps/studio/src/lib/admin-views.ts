import type { Config, PayloadComponent } from 'payload'

const shell = '/components/admin/AdminViewShell#AdminViewShell'

/** Payload leaves custom root views outside DefaultTemplate. */
export function frameAdminViews(config: Config): Config {
  const originals: PayloadComponent[] = []
  const views = Object.fromEntries(Object.entries(config.admin?.components?.views ?? {}).map(([key, view]) => {
    if (!view.path || !view.Component || (typeof view.Component === 'object' && view.Component.path === shell)) return [key, view]
    originals.push(view.Component)
    return [key, { ...view, Component: { path: shell, serverProps: { Content: view.Component } } }]
  }))
  if (!originals.length) return config
  return {
    ...config,
    admin: {
      ...config.admin,
      components: { ...config.admin?.components, views },
      importMap: {
        ...config.admin?.importMap,
        generators: [...(config.admin?.importMap?.generators ?? []), ({ addToImportMap }) => { originals.forEach(component => addToImportMap(component)) }],
      },
    },
  }
}
