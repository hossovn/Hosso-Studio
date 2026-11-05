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
 const current = generateDrizzleJson(payload.db.schema), previous=structuredClone(current)
 delete previous.tables['public.content_entries'].columns.cms
 delete previous.tables['public.content_types']
 delete previous.tables['public.users'].columns.content_permissions
 const rel=previous.tables['public.payload_locked_documents_rels']
 delete rel.columns.content_types_id
 for(const [key,index] of Object.entries(rel.indexes))if(index.columns.some(c=>c.expression==='content_types_id'))delete rel.indexes[key]
 for(const [key,fk] of Object.entries(rel.foreignKeys))if(fk.columnsFrom.includes('content_types_id'))delete rel.foreignKeys[key]
 previous.enums['public.enum_content_entries_kind']={name:'enum_content_entries_kind',schema:'public',values:['faq','team','project','service']}
 previous.tables['public.content_entries'].columns.kind.type='enum_content_entries_kind'
 previous.tables['public.content_entries'].columns.kind.typeSchema='public'
 const up = await generateMigration(previous,current), down = await generateMigration(current,previous)
 const target = new URL('../apps/studio/src/migrations/20261105_120000_content_models.ts',import.meta.url)
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
 console.log('PASS content models migration matches installed Payload schema: '+up.length+' statements')
} finally {await payload.destroy()}

process.exit(0)
