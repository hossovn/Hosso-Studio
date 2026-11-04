'use client'
import React, { useId, useRef, useState } from 'react'
import { useLocale, useT } from './locale-client'
import { validateFormValues, visibleFormFields, type FormRules, type FormFieldDef } from './form-rules'

export type FormDef = {
  slug: string
  title?: string
  submitLabel?: string
  successMessage?: string
  fields: FormFieldDef[]
  rules?: FormRules | null
}

/** Biểu mẫu tùy chỉnh: kiểm tra phía server theo định nghĩa trong admin; có ô bẫy bot. */
export function FormView({ form }: { form: FormDef }) {
  const t = useT()
  const { locale, preview } = useLocale()
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [values, setValues] = useState<Record<string, any>>({}), [step, setStep] = useState(0)
  const instance = useId(), formRef = useRef<HTMLFormElement>(null)
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
  return (
    <form ref={formRef} className="ss-form" onSubmit={submit} noValidate aria-busy={state === 'busy'}>
      {steps.length > 1 && <div className="ss-form-progress" role="status" aria-live="polite">{locale === 'en' ? 'Step' : 'Bước'} {step + 1}/{steps.length} · {steps[step]}<progress value={step + 1} max={steps.length} /></div>}
      {visible.filter((field) => (form.rules?.fields?.[field.name]?.step ?? 0) === step).map((f) => {
        const id = `f-${instance}-${f.name}`
        const err = errors[f.name]
        const rule = form.rules?.fields?.[f.name] ?? {}
        const common = { id, name: f.name, required: Boolean(f.required), disabled: state === 'busy', placeholder: f.placeholder ?? undefined, 'aria-invalid': err ? true : undefined, 'aria-describedby': err ? id + '-error' : undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { const value = f.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value; setValues((before) => ({ ...before, [f.name]: value })); setErrors((before) => ({ ...before, [f.name]: '' })) } }
        return (
          <label key={f.name} htmlFor={id} className={f.type === 'checkbox' ? 'ss-check' : undefined}>
            {f.type === 'checkbox' ? (
              <>
                <input type="checkbox" checked={Boolean(values[f.name])} {...common} /> {f.label}
              </>
            ) : (
              <>
                {f.label}
                {f.required ? ' *' : ''}
                {f.type === 'textarea' ? (
                  <textarea rows={4} value={values[f.name] ?? ''} minLength={rule.minLength} maxLength={Math.min(5000, rule.maxLength ?? 5000)} {...common} />
                ) : f.type === 'select' ? (
                  <select {...common} value={values[f.name] ?? ''}>
                    <option value="">{t('form.choose')}</option>
                    {(f.options ?? '').split(',').map((o) => o.trim()).filter(Boolean).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type={f.type} value={values[f.name] ?? ''} minLength={rule.minLength} maxLength={Math.min(500, rule.maxLength ?? 500)} min={rule.min} max={rule.max} {...common} />
                )}
              </>
            )}
            {err && <span id={id + '-error'} className="ss-field-error" role="alert">{err === 'required' ? t('form.required') : t('form.error')}</span>}
          </label>
        )
      })}
      <input className="ss-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state === 'error' && !Object.values(errors).some(Boolean) && (
        <p className="ss-field-error" role="alert">
          {t('form.error')}
        </p>
      )}
      {step > 0 && <button className="ss-btn ss-form-back" type="button" disabled={state === 'busy'} onClick={() => { setStep(step - 1); setErrors({}); setState('idle') }}>{locale === 'en' ? 'Back' : 'Quay lại'}</button>}
      <button className="ss-btn" type="submit" disabled={state === 'busy'}>
        {step < steps.length - 1 ? locale === 'en' ? 'Continue' : 'Tiếp tục' : form.submitLabel || t('form.submit')}
      </button>
    </form>
  )
}
