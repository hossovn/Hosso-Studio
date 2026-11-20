import { Transformer, ResizeFilterType } from '@napi-rs/image'

let encoding = 0
export async function encodeReturnEvidence(bytes: Buffer) {
  if (encoding >= 2) throw new Error('Image processor busy')
  encoding++
  try {
    const image = new Transformer(bytes), meta = await image.metadata()
    if (!meta.width || !meta.height || meta.width > 8192 || meta.height > 8192 || meta.width * meta.height > 16_000_000) throw new Error('Image dimensions exceeded')
    // Store decoded pixels, without the original container or metadata.
    return await image.rotate().resize(Math.min(meta.width, 1600), null, ResizeFilterType.Lanczos3).webp(82)
  } finally { encoding-- }
}
