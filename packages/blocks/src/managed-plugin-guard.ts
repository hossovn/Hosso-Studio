import type { Config, Endpoint } from 'payload'
import type { HossoPlugin } from './types'
import { isManagedPlugins, managedPluginAllowed, requireManagedPlugin } from './managed-plugins'

/** Register schemas once; check authority at the instant each operation executes. */
export function withManagedPlugins(plugin: HossoPlugin): HossoPlugin {
  const id = plugin.id
  const strict = (fn: Function) => async (...args: any[]) => { await requireManagedPlugin(id); return fn(...args) }
  const optional = (fn: Function, fallback: unknown) => async (...args: any[]) => await managedPluginAllowed(id) ? fn(...args) : fallback
  const methods = (object: Record<string, Function> | undefined, wrap = strict) => object && Object.fromEntries(Object.entries(object).map(([key, fn]) => [key, wrap(fn)]))
  const endpoints = (prior: Endpoint[] | false | undefined, next: Endpoint[] | false | undefined) => next && next.map(endpoint =>
    prior && prior.includes(endpoint) ? endpoint : {
      ...endpoint,
      handler: async (req: Parameters<Endpoint['handler']>[0]) => await managedPluginAllowed(id)
        ? endpoint.handler(req)
        : plugin.retainedReceipts?.endpoints.find(e => e.path === endpoint.path && e.method === endpoint.method)?.handler(req)
          ?? Response.json({ error: 'plugin_disabled' }, { status: 403 }),
    })
  const schedules = (list: any[] | undefined) => list?.map(schedule => ({
    ...schedule,
    hooks: {
      ...schedule.hooks,
      beforeSchedule: async (...args: any[]) => await managedPluginAllowed(id)
        ? (schedule.hooks?.beforeSchedule ?? args[0]?.defaultBeforeSchedule)?.(...args) ?? { shouldSchedule: true }
        : { shouldSchedule: false },
      afterSchedule: schedule.hooks?.afterSchedule && optional(schedule.hooks.afterSchedule, undefined),
    },
  }))
  return {
    ...plugin,
    retainedReceipts: plugin.retainedReceipts && { ...plugin.retainedReceipts, reconcile: strict(plugin.retainedReceipts.reconcile) },
    commerce: methods(plugin.commerce) as HossoPlugin['commerce'],
    hooks: methods(plugin.hooks, fn => optional(fn, undefined)) as HossoPlugin['hooks'],
    readOrder: plugin.readOrder && strict(plugin.readOrder),
    search: plugin.search && optional(plugin.search, []),
    sitemap: plugin.sitemap && optional(plugin.sitemap, []),
    loaders: methods(plugin.loaders, fn => optional(fn, { status: 'disabled' })) as HossoPlugin['loaders'],
    checklist: plugin.checklist && optional(plugin.checklist, []),
    status: plugin.status && optional(plugin.status, { ok: false, detail: 'disabled' }),
    portable: plugin.portable && { ...plugin.portable, data: plugin.portable.data?.map(d => ({ ...d, export: strict(d.export), import: strict(d.import) })) },
    payload: plugin.payload && ((before: Config) => {
      const after = plugin.payload!(before)
      const ownHooks = (prior: any, next: any) => Object.fromEntries(Object.entries(next ?? {}).map(([name, list]) => [name, Array.isArray(list) ? list.map(fn => (prior?.[name] ?? []).includes(fn) ? fn : async (...args: any[]) => await managedPluginAllowed(id) ? fn(...args) : args[0]?.doc ?? args[0]?.data) : list]))
      const fields = (prior: any[] = [], next: any[] = []): any[] => next.map(field => {
        const previous = prior.find(p => p === field || (field.name && p.name === field.name))
        const hooks = Object.fromEntries(Object.entries(field.hooks ?? {}).map(([name, list]) => [name, Array.isArray(list) ? list.map(fn => (previous?.hooks?.[name] ?? []).includes(fn) ? fn : async (args: any) => await managedPluginAllowed(id) ? fn(args) : args.value) : list]))
        return { ...field, ...(field.hooks && { hooks }), ...(field.fields && { fields: fields(previous?.fields, field.fields) }), ...(field.tabs && { tabs: field.tabs.map((tab: any, i: number) => ({ ...tab, fields: fields(previous?.tabs?.[i]?.fields, tab.fields) })) }), ...(field.blocks && { blocks: field.blocks.map((block: any) => ({ ...block, fields: fields(previous?.blocks?.find((b: any) => b.slug === block.slug)?.fields, block.fields) })) }) }
      })
      return {
        ...after,
        endpoints: endpoints(before.endpoints, after.endpoints) || undefined,
        collections: after.collections?.map(collection => {
          const prior = before.collections?.find(c => c.slug === collection.slug)
          const routes = endpoints(prior?.endpoints, collection.endpoints)
          if (prior) return { ...collection, endpoints: routes, fields: fields(prior.fields, collection.fields), hooks: ownHooks(prior.hooks, collection.hooks) }
          return { ...collection, endpoints: routes, hooks: { ...collection.hooks, beforeOperation: [async () => { await requireManagedPlugin(id) }, ...(collection.hooks?.beforeOperation ?? [])] } }
        }),
        globals: after.globals?.map(global => {
          const prior = before.globals?.find(g => g.slug === global.slug)
          const routes = endpoints(prior?.endpoints, global.endpoints)
          if (prior) return { ...global, endpoints: routes, fields: fields(prior.fields, global.fields), hooks: ownHooks(prior.hooks, global.hooks) }
          const guard = async () => { await requireManagedPlugin(id) }
          return { ...global, endpoints: routes, hooks: { ...global.hooks, beforeRead: [guard, ...(global.hooks?.beforeRead ?? [])], beforeChange: [guard, ...(global.hooks?.beforeChange ?? [])] } }
        }),
        jobs: after.jobs && { ...after.jobs, tasks: after.jobs.tasks?.map(task => (before.jobs?.tasks ?? []).includes(task) || typeof task.handler !== 'function' && !isManagedPlugins() ? task : { ...task, schedule: schedules(task.schedule), onSuccess: task.onSuccess && optional(task.onSuccess, undefined), onFail: task.onFail && optional(task.onFail, undefined), handler: async (args: any) => {
          await requireManagedPlugin(id)
          if (typeof task.handler !== 'function') throw new Error('Managed task requires a function handler')
          return task.handler(args)
        } }), workflows: after.jobs.workflows?.map(workflow => (before.jobs?.workflows ?? []).includes(workflow) || typeof workflow.handler !== 'function' && !isManagedPlugins() ? workflow : { ...workflow, schedule: schedules(workflow.schedule), handler: async (args: any) => {
          await requireManagedPlugin(id)
          if (typeof workflow.handler !== 'function') throw new Error('Managed workflow requires a function handler')
          return workflow.handler(args)
        } }) },
        onInit: after.onInit === before.onInit ? after.onInit : async payload => {
          if (!isManagedPlugins() || await managedPluginAllowed(id)) await after.onInit?.(payload)
          else await before.onInit?.(payload)
        },
      }
    }),
  }
}
