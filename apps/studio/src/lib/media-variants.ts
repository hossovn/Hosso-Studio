import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, realpath, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Transformer, ResizeFilterType } from '@napi-rs/image'
import { IMAGE_WIDTHS } from '../../../../packages/blocks/src/responsive-image'

const pending = new Map<string, Promise<Buffer>>()
const MAX_BYTES = 20 * 1024 * 1024

export async function mediaVariant(request: Request, filename: string, directory = process.env.HOSSO_MEDIA_DIR || path.join(process.cwd(), 'media')): Promise<Response> {
  const url = new URL(request.url), width = Number(url.searchParams.get('w'))
  const format = url.searchParams.get('f') || 'webp'
  if (!(IMAGE_WIDTHS as readonly number[]).includes(width) || !['webp', 'avif'].includes(format) || !/^[^/\\\x00-\x1f:]+\.(?:jpe?g|png|webp|avif)$/i.test(filename) || filename.includes('..')) return new Response('Invalid image request', { status: 400 })
  try {
    const root = await realpath(directory), source = await realpath(path.join(root, filename))
    if (path.dirname(source) !== root) return new Response('Not found', { status: 404 })
    const info = await stat(source)
    if (!info.isFile() || info.size > MAX_BYTES) return new Response('Image too large', { status: 413 })
    const key = createHash('sha256').update(`${source}:${info.mtimeMs}:${info.size}:${width}:${format}:v1`).digest('hex')
    const headers = { 'Content-Type': `image/${format}`, 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400', ETag: `"${key}"`, 'X-Content-Type-Options': 'nosniff' }
    if (request.headers.get('if-none-match') === headers.ETag) return new Response(null, { status: 304, headers })
    const cacheDir = path.join(root, '.variants'), cacheFile = path.join(cacheDir, `${key}.${format}`)
    const response = (bytes: Buffer) => new Response(new Uint8Array(bytes), { headers })
    try { return response(await readFile(cacheFile)) } catch (error: any) { if (error.code !== 'ENOENT') throw error }
    if (!pending.has(key)) {
      if (pending.size >= 2) return new Response(null, { status: 307, headers: { Location: `/api/media/file/${encodeURIComponent(filename)}`, 'Cache-Control': 'no-store' } })
      const work = (async () => {
        const input = await readFile(source)
        if (input.length > MAX_BYTES) throw new Error('Image too large')
        const image = new Transformer(input), meta = await image.metadata()
        if (!meta.width || !meta.height || meta.width * meta.height > 40_000_000) throw new Error('Image dimensions too large')
        image.rotate().resize(Math.min(width, meta.width), null, ResizeFilterType.Lanczos3)
        const bytes = format === 'avif' ? await image.avif({ quality: 65, speed: 8 }) : await image.webp(80)
        await mkdir(cacheDir, { recursive: true })
        const temp = path.join(cacheDir, `${key}-${randomUUID()}.tmp`)
        await writeFile(temp, bytes)
        await rename(temp, cacheFile)
        return bytes
      })().finally(() => pending.delete(key))
      pending.set(key, work)
    }
    return response(await pending.get(key)!)
  } catch (error: any) {
    return new Response(error.code === 'ENOENT' ? 'Not found' : 'Unable to process image', { status: error.code === 'ENOENT' ? 404 : 422 })
  }
}
