import type { HossoPlugin } from '@hosso/studio-blocks'

/** Plugin chưa khai báo menu chỉ mở trang quản lý cho quản trị viên. */
export const pluginAdminLinks = (plugin: HossoPlugin, user?: { roles?: string[] | null } | null) => {
  const links = plugin.adminNav ?? (plugin.manifest?.settings ? [{ label: plugin.manifest.name.vi, href: plugin.manifest.settings, roles: ['admin'] }] : [])
  return links.filter((link) => !link.roles || link.roles.some((role) => user?.roles?.includes(role)))
}
