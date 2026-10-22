'use client'

import React from 'react'

import { useAdminT } from '@/lib/use-admin-t'

/** Ô mã xác thực hai lớp ở màn đăng nhập: chỉ cần điền nếu tài khoản đã bật 2FA. Ghi tạm vào cookie để máy chủ kiểm tra. */
export const LoginCode = () => {
  const T = useAdminT()
  return (
    <div style={{ margin: '0 0 16px' }}>
      <label htmlFor="hs-totp" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>{T('Mã xác thực (nếu đã bật xác thực hai lớp)')}</label>
      <input
        id="hs-totp"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-input-bg)', color: 'inherit', font: 'inherit', letterSpacing: '.3em' }}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '')
          e.target.value = v
          document.cookie = `hs_totp=${v}; path=/; max-age=300; SameSite=Strict`
        }}
      />
    </div>
  )
}
