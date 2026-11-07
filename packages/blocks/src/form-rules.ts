export type FormFieldDef = { label: string; name: string; type: string; options?: string | null; required?: boolean | null; placeholder?: string | null }
export type FieldRule = { step?: number; width?: 'full' | 'half'; when?: { field: string; operator: 'equals' | 'notEquals' | 'filled' | 'checked'; value?: string }; minLength?: number; maxLength?: number; min?: number; max?: number }
export type QuoteLine = { field: string; price: number; options?: Record<string, number>; quantityField?: string }
export type QuoteConfig = { label: string; currency: 'VND' | 'USD' | 'EUR'; base: number; lines: QuoteLine[] }
export type FormRules = { steps?: string[]; fields?: Record<string, FieldRule>; quote?: QuoteConfig }
const own = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
export function normalizeFormRules(value: unknown, fields: FormFieldDef[]): FormRules {
  if (value == null) return {}
  if (!own(value)) throw new Error('Cấu hình biểu mẫu không hợp lệ.')
  if (value.fields != null && !own(value.fields)) throw new Error('Luật trường không hợp lệ.')
  const steps = Array.isArray(value.steps) ? value.steps.map((s: unknown) => String(s).trim().slice(0, 100)).filter(Boolean) : []
  if (steps.length > 12) throw new Error('Biểu mẫu hỗ trợ tối đa 12 bước.')
  const rules: Record<string, FieldRule> = {}, names = fields.map((f) => f.name)
  for (const [name, source] of Object.entries(value.fields ?? {})) {
    if (!names.includes(name) || !own(source)) throw new Error('Luật biểu mẫu trỏ tới trường không tồn tại.')
    const rule: FieldRule = {}
    if (source.step != null) { if (!Number.isInteger(source.step) || source.step < 0 || source.step >= Math.max(1, steps.length)) throw new Error('Bước của trường không hợp lệ.'); rule.step = source.step }
    if (source.width != null) { if (source.width !== 'full' && source.width !== 'half') throw new Error('Độ rộng trường không hợp lệ.'); rule.width = source.width }
    for (const key of ['minLength', 'maxLength', 'min', 'max'] as const) if (source[key] != null) { if (!Number.isFinite(source[key]) || (key.endsWith('Length') && (!Number.isInteger(source[key]) || source[key] < 0 || source[key] > 5000))) throw new Error('Giới hạn dữ liệu không hợp lệ.'); rule[key] = source[key] }
    if ((rule.minLength ?? 0) > (rule.maxLength ?? 5000) || (rule.min ?? -Infinity) > (rule.max ?? Infinity)) throw new Error('Giá trị nhỏ nhất phải nhỏ hơn giá trị lớn nhất.')
    if (source.when) {
      const when = source.when, sourceIndex = names.indexOf(when.field)
      // Earlier fields only: deterministic visibility, no cycles or future-step dependencies.
      if (sourceIndex < 0 || sourceIndex >= names.indexOf(name) || !['equals', 'notEquals', 'filled', 'checked'].includes(when.operator)) throw new Error('Điều kiện phải tham chiếu một trường đứng trước.')
      if ((value.fields?.[when.field]?.step ?? 0) > (rule.step ?? 0)) throw new Error('Trường điều kiện phải nằm ở bước trước hoặc cùng bước.')
      rule.when = { field: when.field, operator: when.operator, value: String(when.value ?? '').slice(0, 500) }
    }
    rules[name] = rule
  }
  let quote: QuoteConfig | undefined
  if (value.quote != null) {
    const q = value.quote
    const money = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1e12
    if (!own(q) || !['VND', 'USD', 'EUR'].includes(q.currency) || !money(q.base) || !Array.isArray(q.lines) || q.lines.length > 50) throw new Error('Cấu hình báo giá không hợp lệ.')
    const used = new Set<string>()
    const lines: QuoteLine[] = q.lines.map((line: any) => {
      const field = fields.find((f) => f.name === line?.field)
      if (!field || !['select', 'checkbox', 'number'].includes(field.type) || used.has(field.name) || !money(line.price)) throw new Error('Dòng báo giá phải trỏ tới lựa chọn, số lượng hoặc ô đánh dấu.')
      used.add(field.name)
      if (line.quantityField && !fields.some((f) => f.name === line.quantityField && f.type === 'number' && f.name !== field.name)) throw new Error('Trường số lượng không hợp lệ.')
      const options: Record<string, number> = Object.create(null)
      for (const [key, price] of Object.entries(line.options ?? {})) { if (field.type !== 'select' || !(field.options ?? '').split(',').map((s) => s.trim()).includes(key) || !money(price)) throw new Error('Đơn giá lựa chọn không hợp lệ.'); options[key] = price as number }
      return { field: field.name, price: line.price, ...(Object.keys(options).length ? { options } : {}), ...(line.quantityField ? { quantityField: line.quantityField } : {}) }
    })
    quote = { label: String(q.label || 'Tổng dự kiến').slice(0, 100), currency: q.currency, base: q.base, lines }
  }
  return steps.length || Object.keys(rules).length || quote ? { steps, fields: rules, ...(quote ? { quote } : {}) } : {}
}

/** Uses validated, visible fields only; submitted totals are never an input. */
export function calculateFormQuote(fields: FormFieldDef[], rules: FormRules | null | undefined, input: Record<string, unknown>) {
  const q = rules?.quote
  if (!q) return null
  const { data } = validateFormValues(fields, rules, input)
  const items = q.lines.flatMap((line) => {
    const field = fields.find((f) => f.name === line.field), raw = data[line.field]
    if (!field || raw == null || raw === false || raw === '') return []
    const units = field.type === 'number' ? Number(raw) : line.quantityField ? Number(data[line.quantityField] ?? 0) : 1
    const quantity = Math.max(0, Math.min(1e6, Number.isFinite(units) ? units : 0))
    const price = field.type === 'select' && line.options && Object.hasOwn(line.options, String(raw)) ? line.options[String(raw)] : line.price
    const amount = Math.round(quantity * price * 100) / 100
    return [{ label: field.label + (field.type === 'select' ? ': ' + raw : ''), quantity, price, amount }]
  })
  return { label: q.label, currency: q.currency, base: q.base, items, total: Math.min(1e15, Math.round((q.base + items.reduce((sum, item) => sum + item.amount, 0)) * 100) / 100) }
}
export function visibleFormFields(fields: FormFieldDef[], rules: FormRules | null | undefined, values: Record<string, unknown>): FormFieldDef[] {
  const visible = new Set<string>()
  return fields.filter((field) => {
    const when = rules?.fields?.[field.name]?.when, raw = when && values[when.field]
    const show = !when || (visible.has(when.field) && (when.operator === 'filled' ? raw !== false && String(raw ?? '').trim() !== '' : when.operator === 'checked' ? raw === true || raw === 'on' || raw === 'true' : when.operator === 'notEquals' ? String(raw ?? '') !== when.value : String(raw ?? '') === when.value))
    if (show) visible.add(field.name)
    return show
  })
}
export function validateFormValues(fields: FormFieldDef[], rules: FormRules | null | undefined, input: Record<string, unknown>, step?: number) {
  const data: Record<string, string | number | boolean> = {}, errors: Record<string, string> = {}
  for (const field of visibleFormFields(fields, rules, input)) {
    if (step != null && (rules?.fields?.[field.name]?.step ?? 0) !== step) continue
    const raw = input[field.name], rule = rules?.fields?.[field.name] ?? {}
    if (field.type === 'checkbox') { data[field.name] = raw === true || raw === 'on' || raw === 'true'; if (field.required && !data[field.name]) errors[field.name] = 'required'; continue }
    const text = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : ''
    if (!text) { if (field.required) errors[field.name] = 'required'; continue }
    const max = Math.min(field.type === 'textarea' ? 5000 : 500, rule.maxLength ?? Infinity)
    if (text.length > max || text.length < (rule.minLength ?? 0) || (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) || (field.type === 'tel' && !/^[+\d][\d\s.()\-]{5,20}$/.test(text)) || (field.type === 'number' && (!Number.isFinite(Number(text)) || Number(text) < (rule.min ?? -Infinity) || Number(text) > (rule.max ?? Infinity))) || (field.type === 'select' && !(field.options ?? '').split(',').map((s) => s.trim()).filter(Boolean).includes(text))) errors[field.name] = 'invalid'
    else data[field.name] = field.type === 'number' ? Number(text) : text
  }
  return { data, errors }
}
