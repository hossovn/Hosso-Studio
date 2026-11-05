import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
const require = createRequire(new URL('../apps/studio/package.json', import.meta.url))
const { tsImport } = require('tsx/esm/api')
process.env.HOSSO_DATABASE_URL = 'postgres://unused/unused'
process.env.HOSSO_SECRET = 'cms-schema-test-disposable'
process.env.HOSSO_SCRIPT = '1'
const { default: configPromise } = await tsImport('../apps/studio/src/payload.config.ts', { parentURL:import.meta.url, tsconfig:fileURLToPath(new URL('../apps/studio/tsconfig.json', import.meta.url)) })
const config = await configPromise
config.jobs.autoRun = []
const { getPayload } = await import(pathToFileURL(require.resolve('payload')).href)
const payload = await getPayload({config,disableDBConnect:true,disableOnInit:true})
try {
 const { generateDrizzleJson,generateMigration } = require('drizzle-kit/api')
 const current = generateDrizzleJson(payload.db.schema)
 // Keep this historical migration pinned to its original enum schema.
 delete current.tables['public.content_entries'].columns.cms
 delete current.tables['public.content_types']
 delete current.tables['public.users'].columns.content_permissions
 const rel=current.tables['public.payload_locked_documents_rels']
 delete rel.columns.content_types_id
 for(const [key,index] of Object.entries(rel.indexes))if(index.columns.some(c=>c.expression==='content_types_id'))delete rel.indexes[key]
 for(const [key,fk] of Object.entries(rel.foreignKeys))if(fk.columnsFrom.includes('content_types_id'))delete rel.foreignKeys[key]
 current.enums['public.enum_content_entries_kind']={name:'enum_content_entries_kind',schema:'public',values:['faq','team','project','service']}
 current.tables['public.content_entries'].columns.kind.type='enum_content_entries_kind'
 current.tables['public.content_entries'].columns.kind.typeSchema='public'
 const previous=structuredClone(current)
 const removeColumns = (name, keys) => {
  const table = previous.tables['public.'+name]
  for (const key of keys) delete table.columns[key]
  for (const [key,index] of Object.entries(table.indexes)) if (index.columns.some((col)=>keys.includes(col.expression))) delete table.indexes[key]
  for (const [key,fk] of Object.entries(table.foreignKeys)) if (fk.columnsFrom.some((col)=>keys.includes(col))) delete table.foreignKeys[key]
 }
 for (const name of ['pages','posts']) {removeColumns(name,['cms','deleted_at']);removeColumns('_'+name+'_v',['version_cms','version_deleted_at'])}
 removeColumns('media',['cms'])
 removeColumns('posts',['writing_mode','article_template'])
 removeColumns('_posts_v',['version_writing_mode','version_article_template'])
 removeColumns('posts_locales',['article_body']);removeColumns('_posts_v_locales',['version_article_body'])
 for(const name of ['posts_rels','_posts_v_rels']) removeColumns(name,['media_id'])
 removeColumns('site_settings',['home_slug']);removeColumns('_site_settings_v',['version_home_slug'])
 removeColumns('payload_locked_documents_rels',['content_entries_id'])
 for (const name of ['content_entries','content_entries_locales']) delete previous.tables['public.'+name]
 for (const name of ['enum_content_entries_kind','enum_posts_writing_mode','enum_posts_article_template','enum__posts_v_version_writing_mode','enum__posts_v_version_article_template']) delete previous.enums['public.'+name]
 const up = await generateMigration(previous,current), down = await generateMigration(current,previous)
 const target = new URL('../apps/studio/src/migrations/20261105_090000_cms_workspace.ts',import.meta.url)
 if(process.argv.includes('--write')) fs.writeFileSync(target,`import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
export async function up({db}: MigrateUpArgs): Promise<void> {
 await db.execute(sql${String.fromCharCode(96)}${up.join('\n')}${String.fromCharCode(96)})
}
export async function down({db}: MigrateDownArgs): Promise<void> {
 await db.execute(sql${String.fromCharCode(96)}${down.join('\n')}${String.fromCharCode(96)})
}
`)
 const source=fs.readFileSync(target,'utf8')
 for(const statement of up) assert.ok(source.replace(/\s+/g,' ').includes(statement.replace(/\s+/g,' ')),'Missing CMS migration SQL: '+statement)
 assert.ok(up.some((sql)=>sql.includes('content_entries')))
 console.log('PASS CMS migration matches installed Payload schema: '+up.length+' statements')
} finally {await payload.destroy()}

process.exit(0)
