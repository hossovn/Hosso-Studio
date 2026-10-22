import { nav } from './admin-en/nav'
import { editor } from './admin-en/editor'
import { misc } from './admin-en/misc'
import { tools } from './admin-en/tools'

/** Bản tiếng Anh của chuỗi admin; khóa là câu tiếng Việt gốc. Mỗi nhóm một tệp trong admin-en/. */
export const adminEn: Record<string, string> = { ...nav, ...tools, ...misc, ...editor }
