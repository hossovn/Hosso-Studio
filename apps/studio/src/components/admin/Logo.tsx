import hosso from '@hosso-config'
import React from 'react'

const { brand } = hosso

export const Icon = () => <img src={brand.mark} alt={brand.name} width={28} height={28} />

export const Logo = () => <img src={brand.logo} alt={brand.name} height={44} style={{ height: 44, width: 'auto' }} />
