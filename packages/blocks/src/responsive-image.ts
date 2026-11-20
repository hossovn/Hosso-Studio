export const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920] as const

/** Only local public uploads use the server transformer; remote/plugin images keep their URL. */
export function responsiveImage(src: unknown, sizes = '100vw') {
  if (typeof src !== 'string' || !/^\/api\/media\/file\/[^/?#]+\.(?:jpe?g|png|webp|avif)$/i.test(src)) return {}
  const filename = src.slice('/api/media/file/'.length)
  return {
    srcSet: IMAGE_WIDTHS.map((width) => `/api/media-variant/${filename}?w=${width} ${width}w`).join(', '),
    sizes,
  }
}
