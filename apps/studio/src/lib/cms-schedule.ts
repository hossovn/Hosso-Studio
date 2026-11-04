import type { PayloadRequest } from 'payload'
/** Cancel pending schedules. A task already processing must finish under its existing transaction. */
export async function cancelCmsSchedule(req: PayloadRequest, collection: string, id: string | number) {
 await req.payload.db.deleteMany({collection:'payload-jobs',req,where:{and:[
  {completedAt:{exists:false}}, {processing:{equals:false}},
  {'input.doc.value':{equals:id}}, {'input.doc.relationTo':{equals:collection}}, {taskSlug:{equals:'schedulePublish'}}
 ]}})
}
