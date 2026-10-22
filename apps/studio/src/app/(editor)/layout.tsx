import React from 'react'
import '@hosso/studio-blocks/swiper.css'
import './editor.css'

import { fontClassNames } from '@/lib/fonts'

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${fontClassNames} cv-editor-document`}>
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  )
}
