/** Bound raw ingress before JSON parsing. Local API fixtures may only expose json(). */
export async function limitedJSON(request: { body?: ReadableStream<Uint8Array> | null; json?: () => Promise<any>; headers: Headers }, limit: number): Promise<any> {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new RangeError('Request too large')
  if (!request.body?.getReader) {
    const value = await request.json?.()
    if (new TextEncoder().encode(JSON.stringify(value ?? null)).length > limit) throw new RangeError('Request too large')
    return value
  }
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) { await reader.cancel(); throw new RangeError('Request too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}
