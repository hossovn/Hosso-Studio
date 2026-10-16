import type { Access, FieldAccess } from 'payload'

type Roled = { roles?: string[] | null } | null | undefined
export const isAdmin = (user: Roled) => Boolean(user?.roles?.includes('admin'))

export const adminOnly: Access = ({ req: { user } }) => isAdmin(user as Roled)
export const loggedIn: Access = ({ req: { user } }) => Boolean(user)

export const adminOnlyField: FieldAccess = ({ req: { user } }) => isAdmin(user as Roled)
