import { APIError, type PayloadRequest } from 'payload'

/** Runs after the publication transaction lock, against the latest draft document. */
export async function assertEditorRevision({ req, originalDoc }: { req: PayloadRequest; originalDoc?: Record<string, any> }) {
  const expected = req.headers.get('x-hosso-editor-base')
  if (!expected || !req.user) return
  if (!originalDoc || originalDoc.updatedAt !== expected) throw new APIError('Trang đã thay đổi trên máy chủ. Hãy tải bản mới hoặc chọn dùng bản của bạn.', 409)
  const session = req.headers.get('x-hosso-editor-session'), key = req.headers.get('x-hosso-editor-key')
  if (!session || !key) throw new APIError('Thiếu phiên chỉnh sửa. Hãy tải lại editor.', 409)
  const locks = await req.payload.find({ collection: 'edit-locks', where: { key: { equals: key } }, limit: 1, depth: 0, overrideAccess: true, req })
  const lock = locks.docs[0]
  if (!lock || lock.userId !== `${req.user.id}:${session}` || new Date(lock.expiresAt).getTime() <= Date.now()) throw new APIError('Phiên chỉnh sửa đã được tiếp quản hoặc hết hạn. Bản trên máy bạn vẫn được giữ.', 409)
}
