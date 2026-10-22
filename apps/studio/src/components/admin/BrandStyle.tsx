import hosso from '@hosso-config'
import React from 'react'

import { navCss } from './nav-css'

// Màu chủ đạo của admin lấy từ hosso.config.ts (nút chính, viền focus, mục đang chọn).
const css = `:root{--hosso-brand:${hosso.brand.color}}
.btn--style-primary{--color:#fff;--bg-color:var(--hosso-brand);--hover-bg:color-mix(in srgb,var(--hosso-brand) 82%,#000);--hover-color:#fff}
.nav__link.active,.nav__link:hover{color:var(--hosso-brand)}
:focus-visible{outline-color:var(--hosso-brand)}
${navCss}`

export const BrandStyle = ({ children }: { children?: React.ReactNode }) => (
  <>
    <style>{css}</style>
    {children}
  </>
)
