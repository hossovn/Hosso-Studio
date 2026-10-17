'use client'
import { useLocale } from '@hosso/studio-blocks'
import { trFor } from '../i18n'

export const useTr = () => trFor(useLocale().locale)
