/** Portable field definitions shared by the form builder, importer and server validation. */
export const CONTENT_FIELD_TYPES = ['text', 'textarea', 'number', 'boolean', 'date', 'select', 'image', 'relationship'] as const
export type ContentField = { key: string; label: string; type: typeof CONTENT_FIELD_TYPES[number]; required?: boolean; options?: string[]; target?: string }
export type ContentType = { id?: string | number; slug: string; title: string; fields: ContentField[]; builtin?: boolean }
const common: ContentField[] = [
 { key: 'description', label: 'Mô tả', type: 'textarea' },
 { key: 'image', label: 'Ảnh', type: 'image' },
 { key: 'url', label: 'Liên kết', type: 'text' },
]
export const BUILTIN_CONTENT_TYPES: ContentType[] = [
 { slug: 'faq', title: 'FAQ', builtin: true, fields: common.map(f => f.key === 'description' ? { ...f, label: 'Câu trả lời' } : f) },
 { slug: 'team', title: 'Đội ngũ', builtin: true, fields: [...common, { key: 'role', label: 'Vai trò / chức danh', type: 'text' }] },
 { slug: 'project', title: 'Dự án', builtin: true, fields: common },
 { slug: 'service', title: 'Dịch vụ', builtin: true, fields: common },
]
const reserved = new Set(['__proto__', 'prototype', 'constructor', 'id', 'title', 'slug', 'kind', 'published', 'createdAt', 'updatedAt'])
export const validContentKey = (key: unknown): key is string => typeof key === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(key) && !reserved.has(key)
export function schemaErrors(value: unknown): string[] {
 if (!Array.isArray(value) || value.length > 40) return ['Cấu trúc cần tối đa 40 trường.']
 const errors: string[] = [], keys = new Set<string>()
 for (const f of value) {
  if (!f || !validContentKey(f.key) || keys.has(f.key)) { errors.push('Mã trường không hợp lệ hoặc bị trùng.'); continue }
  keys.add(f.key)
  if (typeof f.label !== 'string' || !f.label.trim() || f.label.length > 120) errors.push(`${f.key}: cần tên trường, tối đa 120 ký tự.`)
  if (!CONTENT_FIELD_TYPES.includes(f.type)) errors.push(`${f.key}: kiểu trường không hợp lệ.`)
  if (f.required != null && typeof f.required !== 'boolean') errors.push(`${f.key}: giá trị bắt buộc không hợp lệ.`)
  if (f.type === 'select' && (!Array.isArray(f.options) || !f.options.length || f.options.length > 100 || f.options.some((s: any) => typeof s !== 'string' || !s.trim() || s.length > 120) || new Set(f.options).size !== f.options.length)) errors.push(`${f.key}: nhập các lựa chọn khác nhau, mỗi dòng một lựa chọn.`)
  if (f.type === 'relationship' && !validContentKey(f.target)) errors.push(`${f.key}: chọn loại nội dung liên kết.`)
 }
 return errors
}
export function entryDataErrors(fields: ContentField[], value: unknown): string[] {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Nội dung phải là một đối tượng.']
 const data = value as Record<string, unknown>, errors: string[] = []
 for (const key of Object.keys(data)) if (!fields.some(f => f.key === key)) errors.push(`${key}: trường không có trong loại nội dung.`)
 for (const f of fields) {
  const v = data[f.key], empty = v == null || v === ''
  if (empty) { if (f.required) errors.push(`${f.label}: bắt buộc.`); continue }
  if (f.type === 'number') { if (typeof v !== 'number' || !Number.isFinite(v)) errors.push(`${f.label}: cần một số hợp lệ.`) }
  else if (f.type === 'boolean') { if (typeof v !== 'boolean') errors.push(`${f.label}: cần đúng hoặc sai.`) }
  else if (typeof v !== 'string' || v.length > (f.type === 'textarea' ? 50000 : 2000)) errors.push(`${f.label}: văn bản không hợp lệ hoặc quá dài.`)
  else if (f.type === 'date' && (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0,10) !== v.slice(0,10))) errors.push(`${f.label}: ngày không hợp lệ (YYYY-MM-DD).`)
  else if (f.type === 'select' && !f.options?.includes(v)) errors.push(`${f.label}: không có lựa chọn này.`)
  else if (f.type === 'image' && !/^(https?:\/\/|\/[^/])/.test(v)) errors.push(`${f.label}: cần đường dẫn ảnh http(s) hoặc trong website.`)
 }
 return errors
}
export const contentSlug = (title: string) => title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)

export function importFields(collection:string,fields:ContentField[]=[]){
 return [{key:'title',label:'Tiêu đề',required:true,type:'text'},{key:'slug',label:'Mã nội dung',type:'text'},...(collection==='content-entries'?fields.map(f=>({...f,key:'data.'+f.key})):collection==='posts'?[{key:'excerpt',label:'Tóm tắt',type:'textarea'},{key:'articleText',label:'Nội dung bài viết',type:'textarea'},{key:'categories',label:'Mã chuyên mục (phân cách |)',type:'text'},{key:'publishedAt',label:'Ngày đăng',type:'date'}]:[{key:'description',label:'Mô tả',type:'textarea'}])]
}
