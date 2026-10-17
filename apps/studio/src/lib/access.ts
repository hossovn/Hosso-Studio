import type { Access, FieldAccess } from 'payload'

export const ROLES = ['admin', 'publisher', 'editor', 'author', 'moderator'] as const
export type Role = (typeof ROLES)[number]

type Roled = { id?: string | number; roles?: string[] | null } | null | undefined

export const hasRole = (user: Roled, ...roles: Role[]) => roles.some((r) => user?.roles?.includes(r))

export const isAdmin = (user: Roled) => hasRole(user, 'admin')
/** Được xuất bản trang, bài viết và vùng giao diện. */
export const canPublish = (user: Roled) => hasRole(user, 'admin', 'publisher')
/** Được tạo/sửa (lưu nháp) trang. */
export const canEditPages = (user: Roled) => hasRole(user, 'admin', 'publisher', 'editor')
/** Được kiểm duyệt bình luận, xem biểu mẫu đã gửi. */
export const canModerate = (user: Roled) => hasRole(user, 'admin', 'publisher', 'moderator')

export const rolesAccess =
  (...roles: Role[]): Access =>
  ({ req: { user } }) =>
    hasRole(user as Roled, ...roles)

export const rolesField =
  (...roles: Role[]): FieldAccess =>
  ({ req: { user } }) =>
    hasRole(user as Roled, ...roles)

export const adminOnly: Access = rolesAccess('admin')
export const adminOnlyField: FieldAccess = rolesField('admin')
export const loggedIn: Access = ({ req: { user } }) => Boolean(user)
export const publishers = rolesAccess('admin', 'publisher')
export const pageEditors = rolesAccess('admin', 'publisher', 'editor')
export const moderators = rolesAccess('admin', 'publisher', 'moderator')

/** Tác giả chỉ sửa được bài của chính mình; admin, publisher, editor sửa được mọi bài. */
export const ownOrEditor: Access = ({ req: { user } }) => {
  const u = user as Roled
  if (hasRole(u, 'admin', 'publisher', 'editor')) return true
  if (hasRole(u, 'author') && u?.id !== undefined) return { createdBy: { equals: u.id } }
  return false
}

/** Ai được tạo bài viết (gồm tác giả). */
export const postWriters = rolesAccess('admin', 'publisher', 'editor', 'author')
