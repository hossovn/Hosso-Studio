import { L } from './lang'
// Mã hóa khóa/bí mật lưu trong DB: AES-256-GCM, khóa lấy từ HOSSO_ENCRYPTION_KEY (32 byte, hex hoặc base64).
// Dùng Web Crypto để mã chạy được cả server lẫn bundle trình duyệt mà không kéo module Node vào.
const PREFIX = 'enc:v1:'

const toB64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

function keyBytes(): Uint8Array {
  const raw = process.env.HOSSO_ENCRYPTION_KEY?.trim()
  if (!raw) throw new Error(L('Thiếu HOSSO_ENCRYPTION_KEY: cần khóa mã hóa 32 byte để lưu khóa API/bí mật.', 'HOSSO_ENCRYPTION_KEY is missing: a 32-byte encryption key is required to store API keys/secrets.'))
  const bytes = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Uint8Array.from(raw.match(/../g)!.map((h) => parseInt(h, 16)))
    : fromB64(raw)
  if (bytes.length !== 32) throw new Error(L('HOSSO_ENCRYPTION_KEY phải đúng 32 byte (64 ký tự hex hoặc base64).', 'HOSSO_ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters or base64).'))
  return bytes
}

const importKey = (usage: 'encrypt' | 'decrypt') =>
  crypto.subtle.importKey('raw', keyBytes() as BufferSource, 'AES-GCM', false, [usage])

export const isEncrypted = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PREFIX)

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey('encrypt'), new TextEncoder().encode(plain))
  return `${PREFIX}${toB64(iv)}:${toB64(new Uint8Array(ct))}`
}

export async function decryptSecret(value: string): Promise<string> {
  if (!isEncrypted(value)) throw new Error(L('Giá trị không phải bản mã hóa của Hosso.', 'The value is not a Hosso-encrypted value.'))
  const [iv, ct] = value.slice(PREFIX.length).split(':')
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) as BufferSource }, await importKey('decrypt'), fromB64(ct) as BufferSource)
  return new TextDecoder().decode(plain)
}
