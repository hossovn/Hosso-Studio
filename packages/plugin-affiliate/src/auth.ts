// Đăng nhập riêng của cộng tác viên: dùng bộ phiên chung của lõi (mật khẩu PBKDF2, cookie ký HMAC).
import { hashPassword, sessionOf, verifyPassword } from '@hosso/studio-blocks'

export const SESSION_COOKIE = 'hs_aff'
const s = sessionOf(SESSION_COOKIE)

export { hashPassword, verifyPassword }
export const makeSession = s.make
export const readSession = s.read
export const sessionCookie = s.cookie
