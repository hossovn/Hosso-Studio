/** Ngôn ngữ thông báo của plugin (máy chủ/CLI): HOSSO_LANG, hoặc LC_ALL/LANG; mặc định tiếng Việt. */
export const L = (vi: string, en: string) => (/^en/i.test(process.env.HOSSO_LANG || process.env.LC_ALL || process.env.LANG || '') ? en : vi)

/** Chọn theo ngôn ngữ admin của người gọi (req.i18n của Payload). */
export const msg = (req: { i18n?: { language?: string } } | undefined | null, vi: string, en: string) => (/^en/i.test(req?.i18n?.language ?? '') ? en : vi)

/** Nhãn hai ngôn ngữ cho cấu hình Payload (label/description hiện theo ngôn ngữ admin). */
export const bi = (vi: string, en: string) => ({ vi, en })
