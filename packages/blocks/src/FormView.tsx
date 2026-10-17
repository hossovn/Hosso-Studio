'use client'
import React, { useState } from 'react'
import { useLocale, useT } from './locale-client'

export type FormDef = {
  slug: string
  title?: string
  submitLabel?: string
  successMessage?: string
  fields: { label: string; name: string; type: string; options?: string | null; required?: boolean | null; placeholder?: string | null }[]
}

/** Biểu mẫu tùy chỉnh: kiểm tra phía server theo định nghĩa trong admin; có ô bẫy bot. */
export function FormView({ form }: { form: FormDef }) {
  const t = useT()
  const { locale } = useLocale()
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const values: Record<string, unknown> = {}
    for (const field of form.fields) values[field.name] = field.type === 'checkbox' ? f.get(field.name) === 'on' : f.get(field.name)
    setState('busy')
    setErrors({})
    try {
      const res = await fetch(`/api/site/forms/${encodeURIComponent(form.slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, locale, website: f.get('website') }),
      })
      const body = await res.json().catch(() => ({}))
      if (res.ok && body.ok) return setState('sent')
      setErrors(body.errors ?? {})
      setState('error')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <p className="ss-form-sent" role="status">
        {form.successMessage || t('form.sent')}
      </p>
    )
  }
  return (
    <form className="ss-form" onSubmit={submit} noValidate={false}>
      {form.fields.map((f) => {
        const id = `f-${form.slug}-${f.name}`
        const err = errors[f.name]
        const common = { id, name: f.name, required: Boolean(f.required), placeholder: f.placeholder ?? undefined, 'aria-invalid': err ? true : undefined }
        return (
          <label key={f.name} htmlFor={id} className={f.type === 'checkbox' ? 'ss-check' : undefined}>
            {f.type === 'checkbox' ? (
              <>
                <input type="checkbox" {...common} /> {f.label}
              </>
            ) : (
              <>
                {f.label}
                {f.required ? ' *' : ''}
                {f.type === 'textarea' ? (
                  <textarea rows={4} maxLength={5000} {...common} />
                ) : f.type === 'select' ? (
                  <select {...common} defaultValue="">
                    <option value="">{t('form.choose')}</option>
                    {(f.options ?? '').split(',').map((o) => o.trim()).filter(Boolean).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type={f.type} maxLength={500} {...common} />
                )}
              </>
            )}
            {err && <span className="ss-field-error">{err === 'required' ? t('form.required') : t('form.error')}</span>}
          </label>
        )
      })}
      <input className="ss-hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {state === 'error' && !Object.keys(errors).length && (
        <p className="ss-field-error" role="alert">
          {t('form.error')}
        </p>
      )}
      <button className="ss-btn" type="submit" disabled={state === 'busy'}>
        {form.submitLabel || t('form.submit')}
      </button>
    </form>
  )
}
