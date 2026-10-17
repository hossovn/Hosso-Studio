import { adminLang, type AdminLang } from './admin-i18n'

/** Ngôn ngữ thông báo của máy chủ/lệnh CLI: HOSSO_LANG, hoặc LC_ALL/LANG; mặc định tiếng Việt. */
export const serverLang = (): AdminLang => {
  const v = (process.env.HOSSO_LANG || process.env.LC_ALL || process.env.LANG || '').toLowerCase()
  return v.startsWith('en') ? 'en' : 'vi'
}

/** Chọn câu theo ngôn ngữ máy chủ/CLI: L('Đã xong', 'Done'). */
export const L = (vi: string, en: string) => (serverLang() === 'en' ? en : vi)

/** Chọn câu theo ngôn ngữ admin của người đang gọi (req.i18n của Payload): msg(req, 'Lỗi', 'Error'). */
export const msg = (req: { i18n?: { language?: string } } | undefined | null, vi: string, en: string) => (adminLang(req?.i18n?.language) === 'en' ? en : vi)

/** Chuỗi song ngữ cho nơi không biết người đọc dùng ngôn ngữ nào (email gửi chủ site). */
export const both = (vi: string, en: string) => `${vi} / ${en}`
