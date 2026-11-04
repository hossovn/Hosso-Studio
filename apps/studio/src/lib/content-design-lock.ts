import { APIError } from 'payload'
import { canPublish } from './access'
import { isContentOnlyChange } from '../../../../packages/blocks/src/content-editing'

export function assertContentDesignLock(original: any, next: any, user: { roles?: string[] | null } | null | undefined) {
  if (!user || canPublish(user) || !original?.root?.props?._contentOnly || next === undefined) return
  if (!next || !Array.isArray(next.content) || !isContentOnlyChange(original, next)) throw new APIError('Trang đang khóa thiết kế. Bạn chỉ được thay nội dung chữ, ảnh và liên kết.', 403)
}
