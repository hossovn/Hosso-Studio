import { mediaVariant } from '@/lib/media-variants'

export const runtime = 'nodejs'
export async function GET(request: Request, { params }: { params: Promise<{ filename: string }> }) {
  return mediaVariant(request, (await params).filename)
}
