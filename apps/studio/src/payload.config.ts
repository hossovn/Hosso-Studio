import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import nodemailer from 'nodemailer'
import { vi } from '@payloadcms/translations/languages/vi'
import { en } from '@payloadcms/translations/languages/en'
import fs from 'fs'
import path from 'path'
import { buildConfig, type Config } from 'payload'
import { fileURLToPath } from 'url'

import hosso from '@hosso-config'
import { Bookings } from './collections/Bookings'
import { ChatSessions } from './collections/ChatSessions'
import { ContactMessages } from './collections/ContactMessages'
import { Media } from './collections/Media'
import { Comments } from './collections/Comments'
import { Forms, FormSubmissions } from './collections/Forms'
import { ContentEntries } from './collections/ContentEntries'
import { ContentTypes } from './collections/ContentTypes'
import { cmsImport, cmsImportFile } from './lib/content-import'
import { cmsTypes } from './lib/content-type-api'
import { cmsList, cmsMutate, cmsSearch, cmsUsage, cmsCreateArticle } from './lib/cms-api'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { ReusableBlocks } from './collections/ReusableBlocks'
import { EditLocks } from './collections/EditLocks'
import { EditorReviews } from './collections/EditorReviews'
import { SiteReleases } from './collections/SiteReleases'
import { siteReleasePublish, siteReleaseRestore, siteReleaseReview } from './lib/site-releases'
import { PostCategories, PostTags } from './collections/Taxonomies'
import { Redirects } from './collections/Redirects'
import { SiteAreas } from './globals/SiteAreas'
import { SiteSettings } from './globals/SiteSettings'
import { backupCreate, backupDownload, commentSubmit, editLock, formExport, formSubmit, packageImport, shareLink, templateCover, templateInstall } from './lib/endpoints'
import { chatInbox, chatPoll, chatReply, chatSend, chatStart, chatStatus } from './lib/live-chat'
import { getPayloadLocalizationLocales } from './lib/locales-catalog'
import { siteStatus, ssoLogin } from './lib/kiln'
import { Users } from './collections/Users'
import { ensureAdmin, seedIfEmpty } from './lib/seed'
import { translateConfig } from './lib/translate-config'
import { frameAdminViews } from './lib/admin-views'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseUrl = process.env.HOSSO_DATABASE_URL || 'file:./data/studio.db'
const isPostgres = /^postgres(ql)?:/.test(databaseUrl)

// SQLite (local) hoặc Postgres (deploy) chọn bằng HOSSO_DATABASE_URL.
if (!isPostgres && databaseUrl.startsWith('file:')) {
  fs.mkdirSync(path.dirname(databaseUrl.slice('file:'.length)), { recursive: true })
}

// Email: SMTP khi có HOSSO_SMTP_URL; không có thì Payload ghi email ra console.
const smtpUrl = process.env.HOSSO_SMTP_URL
if (smtpUrl && !/^smtps?:\/\//i.test(smtpUrl)) {
  console.warn('[hosso] HOSSO_SMTP_URL phải có dạng smtp://user:pass@host:587 (hoặc smtps://); bỏ qua, email chỉ ghi ra nhật ký.')
}
const email = smtpUrl && /^smtps?:\/\//i.test(smtpUrl)
  ? nodemailerAdapter({ defaultFromAddress: process.env.HOSSO_MAIL_FROM || 'no-reply@localhost', defaultFromName: hosso.brand.name, transport: nodemailer.createTransport(smtpUrl) })
  : undefined

const base: Config = {
  ...(email ? { email } : {}),
  secret: process.env.HOSSO_SECRET || '',
  serverURL: process.env.HOSSO_PUBLIC_URL || undefined,
  // Chỉ origin của site được gửi yêu cầu kèm cookie đăng nhập (chống CSRF); localhost luôn được phép để chạy dev.
  csrf: process.env.HOSSO_PUBLIC_URL ? [process.env.HOSSO_PUBLIC_URL, 'http://localhost:3000'] : [],
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: `| ${hosso.brand.name}`,
      icons: [{ rel: 'icon', type: hosso.brand.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png', url: hosso.brand.favicon }],
    },
    components: {
      graphics: { Logo: '/components/admin/Logo#Logo', Icon: '/components/admin/Logo#Icon' },
      Nav: '/components/admin/Nav#Nav',
      views: {
        dashboard: { Component: '/components/admin/DashboardHome#DashboardView' },
        content: { Component: '/components/admin/ContentWorkspaceView#ContentWorkspaceView', path: '/content' },
        templates: { Component: '/components/admin/TemplatesView#TemplatesView', path: '/templates' },
        tools: { Component: '/components/admin/ToolsView#ToolsView', path: '/tools' },
        customize: { Component: '/components/admin/CustomizeView#CustomizeView', path: '/customize' },
        widgets: { Component: '/components/admin/WidgetsView#WidgetsView', path: '/widgets' },
        plugins: { Component: '/components/admin/PluginsView#PluginsView', path: '/plugins' },
        releases: { Component: '/components/admin/ReleasesView#ReleasesView', path: '/releases' },
        chat: { Component: '/components/admin/ChatInboxView#ChatInboxView', path: '/chat' },
      },
      providers: ['/components/admin/BrandStyle#BrandStyle'],
      beforeLogin: ['/components/admin/LoginCode#LoginCode'],
    },
  },
  i18n: { supportedLanguages: { vi, en }, fallbackLanguage: 'vi' },
  // Hàng đợi tác vụ: chạy mỗi phút để xuất bản/hủy xuất bản theo lịch đặt trong trang và bài viết.
  jobs: { autoRun: [{ cron: '* * * * *', limit: isPostgres ? 10 : 1, queue: 'default' }] },
  collections: [Pages, Posts, ContentEntries, ContentTypes, PostCategories, PostTags, Comments, Forms, FormSubmissions, ReusableBlocks, Media, ContactMessages, ChatSessions, Bookings, Redirects, EditLocks, EditorReviews, SiteReleases, Users],
  globals: [SiteSettings, SiteAreas],
  // Ngôn ngữ nội dung: ngôn ngữ đầu tiên trong hosso.config.ts là mặc định; thiếu bản dịch thì dùng ngôn ngữ mặc định.
  localization: { locales: getPayloadLocalizationLocales(hosso.locales), defaultLocale: hosso.locales[0].code, fallback: true },
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: isPostgres
    ? postgresAdapter({ pool: { connectionString: databaseUrl }, migrationDir: path.resolve(dirname, 'migrations') })
    : sqliteAdapter({
        transactionOptions: {},
        client: { url: databaseUrl },
        // Tránh xung đột tạo lại index của SQLite khi database đã tồn tại.
        push: process.env.HOSSO_DB_PUSH === 'false' || (process.env.HOSSO_SCRIPT === '1' && fs.existsSync(databaseUrl.slice('file:'.length))) ? false : undefined,
      }),
  // Health check cho Docker/dịch vụ deploy: GET /api/health
  endpoints: [
    cmsList, cmsMutate, cmsSearch, cmsUsage, cmsCreateArticle,
    cmsTypes, cmsImport, cmsImportFile,
    formSubmit,
    formExport,
    commentSubmit,
    shareLink,
    editLock,
    backupDownload,
    backupCreate,
    packageImport,
    templateInstall,
    templateCover,
    siteStatus,
    ssoLogin,
    siteReleaseReview,
    siteReleasePublish,
    siteReleaseRestore,
    chatStart,
    chatSend,
    chatPoll,
    chatInbox,
    chatReply,
    chatStatus,
    {
      path: '/health',
      method: 'get',
      handler: async (req) => {
        try {
          await req.payload.count({ collection: 'users' })
          return Response.json({ status: 'ok', db: 'up' })
        } catch {
          return Response.json({ status: 'error', db: 'down' }, { status: 503 })
        }
      },
    },
  ],
  onInit: async (payload) => {
    await ensureAdmin(payload)
    if (process.env.HOSSO_SEED !== 'false') await seedIfEmpty(payload)
  },
}

// Plugin khai báo trong hosso.config.ts thêm collection/global/endpoint của chúng.
// `custom.hossoPlugins` cho phép plugin này gọi hook của plugin khác (xem emitOrderPlaced).
export default buildConfig(
  translateConfig(
    frameAdminViews({ ...hosso.plugins.reduce((config, plugin) => plugin.payload?.(config) ?? config, base), custom: { hossoPlugins: hosso.plugins } }),
    Object.assign({}, ...hosso.plugins.map((p) => p.adminEn ?? {})),
  ),
)
