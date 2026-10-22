import React from 'react'

// Dữ liệu có cấu trúc cho Google (schema.org). Chỉ chứa nội dung công khai.
export const JsonLd = ({ data }: { data: unknown }) => (
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }} />
)
