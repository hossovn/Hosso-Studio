import React from 'react'

import { fontClassNames } from '@/lib/fonts'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={fontClassNames}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
