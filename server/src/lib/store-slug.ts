import { eq } from 'drizzle-orm'

import { db } from '../db'
import { store } from '../db/schema'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG_LENGTH = 50

export function slugifyStoreName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)

  return slug.length > 0 ? slug : 'store'
}

export function normalizeStoreSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
}

export function validateStoreSlug(slug: string): string | null {
  if (slug.length < 3) {
    return 'Slug must be at least 3 characters'
  }

  if (slug.length > MAX_SLUG_LENGTH) {
    return `Slug must be ${MAX_SLUG_LENGTH} characters or less`
  }

  if (!SLUG_PATTERN.test(slug)) {
    return 'Slug can only contain lowercase letters, numbers, and hyphens'
  }

  return null
}

export async function isStoreSlugTaken(slug: string): Promise<boolean> {
  const [record] = await db
    .select({ id: store.id })
    .from(store)
    .where(eq(store.slug, slug))

  return record !== undefined
}

export async function generateUniqueStoreSlug(name: string): Promise<string> {
  const base = slugifyStoreName(name)
  let slug = base
  let suffix = 2

  while (await isStoreSlugTaken(slug)) {
    const trimmedBase = base.slice(0, MAX_SLUG_LENGTH - `-${suffix}`.length)
    slug = `${trimmedBase}-${suffix}`
    suffix += 1
  }

  return slug
}
