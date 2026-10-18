'use client'
import { useEffect } from 'react'
import { REF_COOKIE } from './constants'

const DAYS = 30

/** Không vẽ gì: thấy `?ref=MÃ` trên URL thì nhớ mã 30 ngày (ghi đè mã cũ: lượt giới thiệu cuối thắng). */
export function RefCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref')?.trim().slice(0, 40)
    if (ref && /^[\w-]+$/.test(ref)) document.cookie = `${REF_COOKIE}=${ref}; max-age=${DAYS * 86400}; path=/; samesite=lax`
  }, [])
  return null
}
