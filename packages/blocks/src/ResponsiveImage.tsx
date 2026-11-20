import React from 'react'
import { responsiveImage } from './responsive-image'

export function ResponsiveImage({ src, sizes, loading, fetchPriority, decoding = 'async', ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} src={src} {...responsiveImage(src, sizes)} decoding={decoding} fetchPriority={fetchPriority} loading={loading ?? (fetchPriority === 'high' ? 'eager' : 'lazy')} />
}
