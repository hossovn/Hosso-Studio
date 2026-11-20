'use client'
import React from 'react'
import { CookiePreferences } from './ConsentDialog'
import { Tracker } from './Tracker'

export function ConsentFooter() {
  return <><Tracker /><CookiePreferences /></>
}
