'use client'
import React, { useId, useRef, useState } from 'react'
import { useLocale, useT } from './locale-client'
import { calculateFormQuote, validateFormValues, visibleFormFields, type FormRules, type FormFieldDef } from './form-rules'
import { ICON_BODY } from './icons-data'

export type FormDef = {
  slug: string
  title?: string
  submitLabel?: string
  successMessage?: string
  fields: FormFieldDef[]
  rules?: FormRules | null
}

export type FormViewProps = {
  form: FormDef
  submitIcon?: 'none' | 'arrow-up-right' | 'arrow-right'
  submitFull?: boolean
  fullWidth?: boolean
}

/** Biểu mẫu tùy chỉnh: kiểm tra phía server theo định nghĩa trong admin; có ô bẫy bot. */
export function FormView({ form, submitIcon = 'none', submitFull = false, fullWidth = false }: FormViewProps) {
  const t = useT()
  const { locale, preview } = useLocale()
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [values, setValues] = useState<Record<string, any>>({}), [step, setStep] = useState(0)
  const instance = useId(), formRef = useRef<HTMLFormElement>(null)
  const quote = calculateFormQuote(form.fields, form.rules, values)
  const money = (amount: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: quote?.currency || 'VND' }).format(amount)
  const visible = visibleFormFields(form.fields, form.rules, values), steps = form.rules?.steps?.length ? form.rules.steps : ['']
  const fail = (errs: Record<string, string>) => { setErrors(errs); setState('error'); const first = form.fields.find((field) => errs[field.name]); if (first) { setStep(form.rules?.fields?.[first.name]?.step ?? 0); requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[name="${first.name}"]`)?.focus()) } }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setErrors({})
    const checked = validateFormValues(form.fields, form.rules, values, step < steps.length - 1 ? step : undefined)
    if (Object.keys(checked.errors).length) { fail(checked.errors); return }
    if (step < steps.length - 1) { setStep(step + 1); return }
    if (preview) {
      // Xem trước trong admin: kiểm tra giống máy chủ nhưng không gửi và không lưu gì.
      return setState('sent')
    }
    setState('busy')
    try {
      const res = await fetch(`/api/site/forms/${encodeURIComponent(form.slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, locale, website: f.get('website') }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.ok) {
        setState('sent')
        if (typeof body.redirect === 'string' && /^\/(?!\/)/.test(body.redirect) && !/[\\\u0000-\u0020\u007f]/.test(body.redirect)) window.location.assign(body.redirect)
        return
      }
      fail(body.errors ?? {})
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <div>
        <p className="ss-form-sent" role="status">
          {form.successMessage || t('form.sent')}
        </p>
        {preview && (
          <p className="ss-muted">
            {t('form.previewNote')}{' '}
            <button type="button" className="ss-btn" onClick={() => { setState('idle'); setStep(0); setValues({}); setErrors({}) }}>
              {t('form.previewAgain')}
            </button>
          </p>
        )}
      </div>
    )
  }

  const iconSvg = submitIcon && submitIcon !== 'none' ? ICON_BODY[submitIcon] : undefined
  return (
    <form
      ref={formRef}
      className={`ss-form${fullWidth ? ' is-full-width' : ''}`}
      data-hs-part="form"
      data-hs-part-label="Khung biểu mẫu"
      onSubmit={submit}
      noValidate
      aria-busy={state === 'busy'}
    >
      {steps.length > 1 && <div className="ss-form-progress" role="status" aria-live="polite">{locale === 'en' ? 'Step' : 'Bước'} {step + 1}/{steps.length} · {steps[step]}<progress value={step + 1} max={steps.length} /></div>}
      {visible.filter((field) => (form.rules?.fields?.[field.name]?.step ?? 0) === step).map((f) => {
        const id = `f-${instance}-${f.name}`
        const err = errors[f.name]
        const rule = form.rules?.fields?.[f.name] ?? {}
        const labelCls = [f.type === 'checkbox' ? 'ss-check' : '', rule.width === 'half' ? 'is-half' : ''].filter(Boolean).join(' ') || undefined
        const common = { id, name: f.name, required: Boolean(f.required), disabled: state === 'busy', placeholder: f.placeholder ?? undefined, 'aria-invalid': err ? true : undefined, 'aria-describedby': err ? id + '-error' : undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const value = f.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value; setValues((before) => ({ ...before, [f.name]: value })); setErrors((before) => ({ ...before, [f.name]: '' })) } }
        return (
          <label
            key={f.name}
            htmlFor={id}
            className={labelCls}
            data-hs-part={f.type === 'checkbox' ? 'checkbox' : 'field'}
            data-hs-part-label={f.type === 'checkbox' ? 'Ô đồng ý' : 'Nhãn trường'}
          >
            {f.type === 'checkbox' ? (
              <>
                <input type="checkbox" checked={Boolean(values[f.name])} {...common} /> {f.label}
              </>
            ) : (
              <>
                {f.label}
                {f.required ? ' *' : ''}
                {f.type === 'textarea' ? (
                  <textarea rows={4} value={values[f.name] ?? ''} minLength={rule.minLength} maxLength={Math.min(5000, rule.maxLength ?? 5000)} data-hs-part="input" data-hs-part-label="Ô nhập liệu" {...common} />
                ) : f.type === 'select' ? (
                  <select data-hs-part="input" data-hs-part-label="Ô nhập liệu" {...common} value={values[f.name] ?? ''}>
                    <option value="">{t('form.choose')}</option>
                    {(f.options ?? '').split(',').map((o) => o.trim()).filter(Boolean).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type={f.type} value={values[f.name] ?? ''} minLength={rule.minLength} maxLength={Math.min(500, rule.maxLength ?? 500)} min={rule.min} max={rule.max} data-hs-part="input" data-hs-part-label="Ô nhập liệu" {...common} />
                )}
              </>
            )}
            {err && <span id={id + '-error'} className="ss-field-error" role="alert">{err === 'required' ? t('form.required') : t('form.error')}</span>}
          </label>
        )
      })}
      <input className="ss-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {quote && <section className="ss-quote" aria-label={quote.label} style={{ padding: 16, border: '1px solid #cbded2', borderRadius: 8, background: '#f5faf7' }}><strong>{quote.label}</strong>{quote.base > 0 && <p>{locale === 'en' ? 'Base fee' : 'Phí cơ bản'}: {money(quote.base)}</p>}{quote.items.map((item, index) => <p key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>{item.label} × {item.quantity}</span><span>{money(item.amount)}</span></p>)}<output aria-live="polite" data-quote-total={quote.total} style={{ display: 'block', fontSize: '1.4em', fontWeight: 700 }}>{money(quote.total)}</output></section>}
      {state === 'error' && !Object.values(errors).some(Boolean) && (
        <p className="ss-field-error" role="alert">
          {t('form.error')}
        </p>
      )}
      {step > 0 && <button className="ss-btn ss-form-back" type="button" disabled={state === 'busy'} onClick={() => { setStep(step - 1); setErrors({}); setState('idle') }}>{locale === 'en' ? 'Back' : 'Quay lại'}</button>}
      <button className={`ss-btn${submitFull ? ' is-full' : ''}`} data-hs-part="submit" data-hs-part-label="Nút gửi" type="submit" disabled={state === 'busy'}>
        <span>{step < steps.length - 1 ? locale === 'en' ? 'Continue' : 'Tiếp tục' : form.submitLabel || t('form.submit')}</span>
        {iconSvg && step >= steps.length - 1 && (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: iconSvg }} />
        )}
      </button>
    </form>
  )
}
