// Uses only the fresh disposable container created by this invocation.
import { spawn, execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
const name='kiln-managed-pg-'+randomUUID().slice(0,8)
const directory=await mkdtemp(join(tmpdir(),'kiln-managed-pg-'))
const id=docker('run','--rm','-d','--name',name,'-p','127.0.0.1::5432','-e','POSTGRES_PASSWORD=kiln-test-only','-e','POSTGRES_DB=kiln_runtime_test','postgres:18.3-alpine')
try {
  let ready=false
  for(let i=0;i<60;i++){try{docker('exec',id,'pg_isready','-U','postgres','-d','kiln_runtime_test');ready=true;break}catch{await new Promise(r=>setTimeout(r,500))}}
  if(!ready)throw new Error('Disposable PostgreSQL did not become ready')
  const address=docker('port',id,'5432/tcp')
  if(!/^127\.0\.0\.1:\d+$/.test(address))throw new Error('Expected loopback-only test database')
  const require=createRequire(new URL('../apps/studio/package.json',import.meta.url))
  const binary=join(dirname(require.resolve('payload')),'..','bin.js')
  const env={...process.env,HOSSO_DATABASE_URL:'postgres://postgres:kiln-test-only@'+address+'/kiln_runtime_test',HOSSO_SECRET:'postgres-tests-disposable-secret',HOSSO_SEED:'false',HOSSO_SCRIPT:'1',HOSSO_ADMIN_EMAIL:'bootstrap-plugin-test@kiln.invalid',HOSSO_ADMIN_PASSWORD:'disposable-bootstrap-password-32-chars',HOSSO_SMTP_URL:'',HOSSO_DB_PUSH:process.argv.includes('--migrations')?'false':'true',HOSSO_MEDIA_DIR:join(directory,'media'),KILN_PLUGIN_TEST_CHECKPOINT:join(directory,'checkpoint.json'),NODE_ENV:'test'}
  // Do not inherit a real tenant's authority, database policy or license into fixtures.
  for(const key of ['HOSSO_TENANT','HOSSO_PLUGIN_AUTHORITY','HOSSO_PLUGIN_TRUST','HOSSO_PLUGIN_GENERATION','HOSSO_LICENSE_KEY','HOSSO_LICENSE_SERVER']) delete env[key]
  const backendArg=process.argv.indexOf('--kiln-backend')
  if(backendArg>=0)env.KILN_E2E_BACKEND=process.argv[backendArg+1]
  const commands=process.argv.includes('--commerce-only')?[]:[...(process.argv.includes('--migrations')?[['migrate']]:[]),['run','scripts/test-kiln-plugins.ts'],['run','scripts/test-kiln-plugins-migration.ts'],['run','scripts/test-kiln-plugins-restart.ts']]
  for(const command of commands) {
    const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[binary,...command],{cwd:fileURLToPath(new URL('../apps/studio/',import.meta.url)),env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>resolve(code))})
    if(code!==0)throw new Error(command.join(' ')+' failed with exit '+code)
    env.HOSSO_DB_PUSH='false'
  }
  if(process.argv.includes('--commerce') || process.argv.includes('--commerce-only')) {
    const code=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['scripts/test-commerce-workflows.mjs'],{cwd:fileURLToPath(new URL('../',import.meta.url)),env:{...env,AFFILIATE_TEST_DATABASE_URL:env.HOSSO_DATABASE_URL},stdio:'inherit'})
      child.on('error',reject);child.on('exit',resolve)
    })
    if(code!==0)throw new Error('Standalone commerce regression failed with exit '+code)
  }
  console.log(process.argv.includes('--commerce-only')?'PASS: standalone commerce on disposable PostgreSQL':'PASS: PostgreSQL managed plugin bridge and separate-process restart')
} finally { docker('stop',id) }
