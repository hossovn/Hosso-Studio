import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { vi } from '@payloadcms/translations/languages/vi'
import { en } from '@payloadcms/translations/languages/en'
import fs from 'fs'
import path from 'path'
import { buildConfig, type Config } from 'payload'
import { fileURLToPath } from 'url'

import hosso from '@hosso-config'
import { ContactMessages } from './collections/ContactMessages'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { SiteSettings } from './globals/SiteSettings'
import { Users } from './collections/Users'
import { seedIfEmpty } from './lib/seed'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseUrl = process.env.HOSSO_DATABASE_URL || 'file:./data/studio.db'
const isPostgres = /^postgres(ql)?:/.test(databaseUrl)

// SQLite (local) hoặc Postgres (deploy) chọn bằng HOSSO_DATABASE_URL.
if (!isPostgres && databaseUrl.startsWith('file:')) {
  fs.mkdirSync(path.dirname(databaseUrl.slice('file:'.length)), { recursive: true })
}

const base: Config = {
  secret: process.env.HOSSO_SECRET || '',
  serverURL: process.env.HOSSO_PUBLIC_URL || undefined,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: `| ${hosso.brand.name}`,
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: hosso.brand.favicon }],
    },
    components: {
      graphics: { Logo: '/components/admin/Logo#Logo', Icon: '/components/admin/Logo#Icon' },
      providers: ['/components/admin/BrandStyle#BrandStyle'],
    },
  },
  i18n: { supportedLanguages: { vi, en }, fallbackLanguage: 'vi' },
  collections: [Pages, Media, ContactMessages, Users],
  globals: [SiteSettings],
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: isPostgres
    ? postgresAdapter({ pool: { connectionString: databaseUrl } })
    : sqliteAdapter({ client: { url: databaseUrl } }),
  onInit: async (payload) => {
    if (process.env.HOSSO_SEED !== 'false') await seedIfEmpty(payload)
  },
}

// Plugin khai báo trong hosso.config.ts thêm collection/global/endpoint của chúng.
export default buildConfig(hosso.plugins.reduce((config, plugin) => plugin.payload?.(config) ?? config, base))
