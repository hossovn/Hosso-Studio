export const copyPageMeta = (title: string, slug: string, usedSlugs: Iterable<string>) => {
  const baseTitle = `${title || slug} (bản sao)`
  const baseSlug = `${slug || 'trang'}-copy`
  const used = new Set(usedSlugs)
  let nextSlug = baseSlug
  let index = 2
  while (used.has(nextSlug)) nextSlug = `${baseSlug}-${index++}`
  return { title: baseTitle, slug: nextSlug }
}
