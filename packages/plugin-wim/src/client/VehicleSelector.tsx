'use client'
import React, { useState } from 'react'
import { VEHICLE_COOKIE } from '../constants'
import { useTr } from './useTr'

type Named = { id: string; name: string }
type Props = {
  heading?: string
  targetPath: string
  makes: Named[]
  models: Named[]
  years: number[]
  selected: { make?: string; model?: string; year?: number }
}

const setCookie = (value: string, maxAge: number) => {
  document.cookie = `${VEHICLE_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
}

/** Chọn hãng → dòng → đời; nhớ lựa chọn trong cookie của trình duyệt (server đọc để lọc lưới sản phẩm). */
export function VehicleSelectorClient({ heading, targetPath, makes, models: m0, years: y0, selected }: Props) {
  const tr = useTr()
  const [make, setMake] = useState(selected.make ?? '')
  const [model, setModel] = useState(selected.model ?? '')
  const [year, setYear] = useState(selected.year ? String(selected.year) : '')
  const [models, setModels] = useState(m0)
  const [years, setYears] = useState(y0)

  const pickMake = async (v: string) => {
    setMake(v)
    setModel('')
    setYear('')
    setModels([])
    setYears([])
    if (v) setModels((await (await fetch(`/api/plugins/wim/vehicles/models?make=${encodeURIComponent(v)}`)).json()).items ?? [])
  }
  const pickModel = async (v: string) => {
    setModel(v)
    setYear('')
    setYears([])
    if (v) setYears((await (await fetch(`/api/plugins/wim/vehicles/years?model=${encodeURIComponent(v)}`)).json()).items ?? [])
  }

  const apply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!make) return
    setCookie([make, model, year].join('~'), 60 * 60 * 24 * 365)
    const q = new URLSearchParams({ make, ...(model && { model }), ...(year && { year }) })
    window.location.href = `${targetPath}?${q}`
  }
  const clear = () => {
    setCookie('', 0)
    window.location.href = targetPath
  }

  return (
    <form className="wp-vehicle" onSubmit={apply}>
      {heading && <h2>{heading}</h2>}
      <div className="wp-vehicle-row">
        <label>
          {tr('vehicle.make')}
          <select value={make} onChange={(e) => pickMake(e.target.value)} required>
            <option value="">{tr('vehicle.choose')}</option>
            {makes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr('vehicle.model')}
          <select value={model} onChange={(e) => pickModel(e.target.value)} disabled={!models.length}>
            <option value="">{tr('vehicle.choose')}</option>
            {models.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr('vehicle.year')}
          <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!years.length}>
            <option value="">{tr('vehicle.choose')}</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button className="wp-btn" type="submit">
          {tr('vehicle.apply')}
        </button>
        {selected.make && (
          <button className="wp-link" type="button" onClick={clear}>
            {tr('vehicle.clear')}
          </button>
        )}
      </div>
    </form>
  )
}
