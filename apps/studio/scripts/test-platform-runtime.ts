import assert from 'node:assert/strict'
import { createLocalReq, getPayload } from 'payload'
import config from '../src/payload.config'
import { saveFormSubmission } from '../src/lib/form-submission'
import { runFormOutbox } from '../src/lib/form-outbox'
import { leadUpdate, leadRetry, leadsList } from '../src/lib/leads'
import { loadEntryRepeater } from '../src/lib/entry-repeater'

const settings = await config
settings.jobs!.autoRun = []
const payload = await getPayload({ config: settings, disableOnInit: true })
try {
  const user = await payload.create({ collection: 'users', data: { email: 'platform-fixture@example.test', password: 'platform-fixture-password', roles: ['admin'] }, overrideAccess: true })
  const request = () => createLocalReq({ user: { ...user, collection: 'users' }, req: { headers: new Headers({ cookie: 'hosso_consent=analytics' }) } }, payload)
  await payload.updateGlobal({ slug: 'site-settings', data: { notifications: { onForm: false } }, overrideAccess: true })
  const form = await payload.create({ collection: 'forms', data: { title: 'Fixture lead', slug: 'platform-fixture', fields: [{ name: 'name', label: 'Name', type: 'text', required: true }], delivery: { email: 'inbox@example.test' } }, overrideAccess: true })
  const requestId = crypto.randomUUID()
  const create = payload.create.bind(payload)
  payload.create = ((args: any) => {
    if (args.collection === 'analytics-events') throw new Error('analytics fixture outage')
    return create(args)
  }) as typeof payload.create
  const saved = await Promise.all([1, 2].map(async () => saveFormSubmission(await request(), form, { name: 'Fixture' }, { locale: 'vi', requestId, attribution: { utm_campaign: 'launch', pagePath: '/landing?email=private', ignored: 'never retained' } })))
  const queued = await payload.find({ collection: 'payload-jobs', where: { taskSlug: { equals: 'analytics-record-event' } }, overrideAccess: true })
  assert.equal(queued.totalDocs, 1, 'Duplicate submission queues one durable analytics event')
  await payload.jobs.runByID({ id: queued.docs[0].id, silent: true })
  assert.equal((await payload.count({ collection: 'form-submissions', overrideAccess: true })).totalDocs, 1, 'Analytics worker failure cannot roll back the lead')
  payload.create = create
  await payload.jobs.runByID({ id: queued.docs[0].id, silent: true })
  assert.equal((await payload.count({ collection: 'analytics-events' as any, where: { event: { equals: 'form_submit' } }, overrideAccess: true })).totalDocs, 1, 'A recovered worker records the conversion')
  assert.equal(saved[0].submission.id, saved[1].submission.id)
  assert.equal((await payload.count({ collection: 'form-submissions', overrideAccess: true })).totalDocs, 1)
  const lead: any = saved[0].submission
  assert.equal(lead.attribution.pagePath, '/landing')
  const jobs = () => payload.find({ collection: 'form-deliveries' as any, limit: 10, depth: 0, overrideAccess: true })
  assert.equal((await jobs()).docs.length, 1, 'Repeated submissions do not create duplicate delivery jobs')
  const mail: any[] = []
  process.env.HOSSO_SMTP_URL = 'smtp://fixture.invalid'
  payload.sendEmail = async (input) => { mail.push(input); if (mail.length === 1) throw new Error('offline'); return {} as any }
  const start = new Date(Date.now() + 1000)
  await runFormOutbox(await request(), start)
  let job: any = (await jobs()).docs[0]
  assert.equal(job.status, 'retry')
  assert.equal(job.attempts, 1)
  assert.doesNotMatch(job.lastError, /offline|fixture.invalid/)
  await runFormOutbox(await request(), new Date(start.getTime() + 10_000))
  assert.equal(mail.length, 1, 'A retry waits for its backoff deadline')
  await Promise.all([request(), request()].map(async (req) => runFormOutbox(await req, new Date(start.getTime() + 70_000))))
  job = (await jobs()).docs[0]
  assert.equal(job.status, 'sent')
  assert.equal(mail.length, 2, 'Concurrent workers send a due job once')
  assert.equal(mail[0].messageId, mail[1].messageId)
  const retryReq = await request(); retryReq.routeParams = { id: job.id }
  assert.equal((await leadRetry.handler(retryReq)).status, 409, 'Sent deliveries cannot be replayed through retry')
  const update = async (note: string) => {
    const req = await request(); req.routeParams = { id: lead.id }; req.json = async () => ({ revision: 0, status: 'qualified', note })
    return leadUpdate.handler(req)
  }
  const updates = await Promise.all([update('First staff note'), update('Second staff note')])
  assert.deepEqual(updates.map((response) => response.status).sort(), [200, 409])
  const changed: any = await payload.findByID({ collection: 'form-submissions', id: lead.id, overrideAccess: true })
  assert.equal(changed.notes.length, 1)
  assert.equal(changed.revision, 1)
  const anonymous = await createLocalReq({}, payload)
  assert.equal((await leadsList.handler(anonymous)).status, 403)
  assert.equal((await leadRetry.handler(anonymous)).status, 403)
  await payload.create({ collection: 'content-entries', data: { title: 'Đội ngũ mới', slug: 'platform-entry', kind: 'team', data: { role: 'Kỹ sư' }, published: true }, overrideAccess: true, locale: 'vi' })
  const entries = await loadEntryRepeater(payload, { entryKind: 'team', paginate: 'yes' }, { q: 'ky su', category: '', sort: 'title', page: 1, size: 6 }, 'vi')
  assert.equal(entries.items.length, 1, 'Search uses the normalized index in the actual database')
  assert.equal(entries.items[0].data.role, 'Kỹ sư')
  for (const headers of [{}, { cookie: 'hosso_consent=necessary' }, { cookie: 'hosso_consent=analytics', dnt: '1' }, { cookie: 'hosso_consent=analytics', 'sec-gpc': '1' }]) {
    const denied = await request(); denied.headers = new Headers(headers as Record<string, string>)
    const item: any = (await saveFormSubmission(denied, form, { name: 'Consent fixture' }, { requestId: crypto.randomUUID(), attribution: { utm_campaign: 'must-not-persist' }, experiments: { fixture_1: 'b' } })).submission
    assert.deepEqual(item.attribution, {}); assert.deepEqual(item.experiments, {})
    const pending: any = (await payload.find({ collection: 'payload-jobs', where: { taskSlug: { equals: 'analytics-record-event' } }, sort: '-id', limit: 1, overrideAccess: true })).docs[0]
    assert.deepEqual(pending.input.event.attribution, {}); assert.deepEqual(pending.input.event.experiments, {})
  }
  console.log('PASS platform runtime: transactional lead/outbox, concurrent idempotency, retry/backoff/claims, lead version conflicts, staff authorization and DB search')
} finally { await payload.destroy() }
process.exit(0)
