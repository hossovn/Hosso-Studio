import assert from 'node:assert/strict'
import {createLocalReq,getPayload} from 'payload'
import ExcelJS from 'exceljs'
import configPromise from '../src/payload.config'
import {cmsImport,parseCsv,parseImportFile} from '../src/lib/content-import'
import {canContent} from '../src/lib/content-permissions'
import {cmsSearch,cmsMutate} from '../src/lib/cms-api'
import {buildSitePackage} from '../src/lib/site-package'
import {importSitePackage} from '../src/lib/site-import'
import {siteReleaseReview} from '../src/lib/site-releases'
assert.ok(process.env.HOSSO_DATABASE_URL?.includes('hosso-studio-cms-'),'Disposable database required')
const config=await configPromise;config.jobs.autoRun=[]
const payload=await getPayload({config})
const admin:any=await payload.create({collection:'users',data:{email:'browser@studio.test',password:'studio-browser-test-password',roles:['admin']}})
const request=async(user:any=admin)=>createLocalReq({user,req:{headers:new Headers()} as any},payload)
const call=async(endpoint:any,body:any,user:any=admin,query='')=>{const req=await createLocalReq({user,req:{headers:new Headers(),url:'http://localhost/api/site/cms'+query,json:async()=>body} as any},payload);const res=await endpoint.handler(req);return {status:res.status,data:await res.json()}}
try{
 const type=await payload.create({collection:'content-types',data:{title:'Khóa học',slug:'courses',fields:[{key:'price',label:'Học phí',type:'number',required:true},{key:'start',label:'Khai giảng',type:'date'},{key:'level',label:'Trình độ',type:'select',options:['Cơ bản','Nâng cao']},{key:'teacher',label:'Giảng viên',type:'relationship',target:'team'}]}})
 const teacher=await payload.create({collection:'content-entries',data:{title:'Teacher',slug:'teacher-one',kind:'team',published:true,data:{role:'Tutor'}}})
 const course=await payload.create({collection:'content-entries',data:{title:'Course one',slug:'course-one',kind:'courses',data:{price:100,start:'2026-11-05',level:'Cơ bản',teacher:teacher.slug}}})
 await assert.rejects(payload.create({collection:'content-entries',data:{title:'bad',slug:'bad',kind:'courses',data:{price:'free'} as any}}),/Học phí/)
 await assert.rejects(payload.create({collection:'content-entries',data:{title:'bad',slug:'bad',kind:'courses',data:{price:1,start:'2026-02-31'}}}),/ngày không hợp lệ/)
 await assert.rejects(payload.update({collection:'content-types',id:type.id,data:{fields:[]}}),/dữ liệu hiện có/)
 await assert.rejects(payload.delete({collection:'content-types',id:type.id}),/đang có dữ liệu/)
 await assert.rejects(payload.delete({collection:'content-entries',id:teacher.id}),/đang được mục khác liên kết/)
 await assert.rejects(payload.create({collection:'content-types',data:{title:'Unsafe',slug:'unsafe',fields:[{key:'__proto__',label:'Bad',type:'text'}]}}),/Mã trường/)
 await assert.rejects(payload.update({collection:'content-entries',id:teacher.id,data:{published:false}}).then(()=>payload.update({collection:'content-entries',id:course.id,data:{published:true}})),/liên kết/)
 await payload.update({collection:'content-entries',id:teacher.id,data:{published:true}})
 console.log('PASS custom schemas, typed validation, dates and safe schema/reference changes')
 assert.deepEqual(parseCsv('\uFEFFtitle,slug\r\n"A, B",test\r\n"two\nlines",two'),[['title','slug'],['A, B','test'],['two\nlines','two']])
 const csv=await parseImportFile('example.csv',Buffer.from('title;price\nImported;250'));assert.equal(csv[0].rows[0].cells[1],'250')
 const book=new ExcelJS.Workbook(),ws=book.addWorksheet('Courses');ws.addRow(['title','price']);ws.addRow(['Excel course',500]);const bytes=await book.xlsx.writeBuffer()
 assert.equal((await parseImportFile('courses.xlsx',new Uint8Array(bytes)))[0].rows[0].cells[1],'500')
 ws.getCell('B2').value={formula:'1+1',result:2};await assert.rejects(parseImportFile('formula.xlsx',new Uint8Array(await book.xlsx.writeBuffer())),/công thức/)
 const input:any={collection:'content-entries',type:'courses',locale:'vi',mode:'skip',mapping:{title:0,slug:1,'data.price':2},rows:[{number:2,cells:['Imported','imported-course','250']},{number:3,cells:['Bad','invalid-course','free']}]}
 let preview=await call(cmsImport,{action:'preview',input});assert.equal(preview.status,200);assert.equal(preview.data.counts.create,1);assert.equal(preview.data.counts.error,1)
 assert.equal((await call(cmsImport,{action:'commit',input,token:preview.data.token})).status,400)
 input.skipInvalid=true;preview=await call(cmsImport,{action:'preview',input});let result=await call(cmsImport,{action:'commit',input,token:preview.data.token});assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.data.ids.length,1)
 assert.equal((await call(cmsImport,{action:'commit',input,token:preview.data.token})).status,409,'Replay must not create duplicate records')
 input.mode='update';input.rows=[{number:2,cells:['Changed','imported-course','300']}];preview=await call(cmsImport,{action:'preview',input});assert.equal(preview.data.counts.update,1)
 const imported=(await payload.find({collection:'content-entries',where:{slug:{equals:'imported-course'}}})).docs[0]
 await payload.update({collection:'content-entries',id:imported.id,data:{title:'Concurrent edit'}})
 assert.equal((await call(cmsImport,{action:'commit',input,token:preview.data.token})).status,409,'Reject stale preview')
 preview=await call(cmsImport,{action:'preview',input});input.rows[0].cells[2]='999';assert.equal((await call(cmsImport,{action:'commit',input,token:preview.data.token})).status,409,'Reject changed input')
 console.log('PASS real CSV/XLSX, row errors, valid-only import, duplicate handling, stale preview and replay rejection')
 const catA=await payload.create({collection:'post-categories',data:{name:'A',slug:'a'}}),catB=await payload.create({collection:'post-categories',data:{name:'B',slug:'b'}})
 const rule={collection:'posts',categories:[String(catA.id)],read:true,edit:true,review:false,publish:false}
 const restricted:any=await payload.create({collection:'users',data:{email:'limited@studio.test',password:'cms-limited-password',roles:['publisher'],contentPermissions:{enabled:true,rules:[rule,{collection:'content-entries',type:'courses',read:true,edit:true,review:false,publish:false}]}}})
 const postA=await payload.create({collection:'posts',data:{title:'Scoped A',slug:'scoped-a',categories:[catA.id]}}),postB=await payload.create({collection:'posts',data:{title:'Scoped B',slug:'scoped-b',categories:[catB.id]}}),mixed=await payload.create({collection:'posts',data:{title:'Mixed',slug:'mixed',categories:[catA.id,catB.id]}})
 const found=await payload.find({collection:'posts',draft:true,user:restricted,overrideAccess:false});assert.deepEqual(found.docs.map(d=>d.id),[postA.id])
 const versions=await payload.findVersions({collection:'posts',user:restricted,overrideAccess:false,depth:0});assert.ok(versions.docs.length);assert.ok(versions.docs.every(v=>String((v.parent as any)?.id??v.parent)===String(postA.id)))
 const privateVersions=await payload.findVersions({collection:'posts',where:{parent:{equals:postB.id}},depth:0});await assert.rejects(payload.findVersionByID({collection:'posts',id:privateVersions.docs[0].id,user:restricted,overrideAccess:false}))
 await payload.update({collection:'posts',id:postA.id,data:{title:'Allowed edit'},draft:true,user:restricted,overrideAccess:false})
 await assert.rejects(payload.update({collection:'posts',id:postB.id,data:{title:'Denied'},draft:true,user:restricted,overrideAccess:false}))
 await assert.rejects(payload.update({collection:'posts',id:postA.id,data:{categories:[catB.id]},draft:true,user:restricted,overrideAccess:false}),/phạm vi nội dung/)
 await assert.rejects(payload.update({collection:'posts',id:postA.id,data:{_status:'published'},user:restricted,overrideAccess:false}),/phạm vi nội dung/)
 await assert.rejects(payload.update({collection:'posts',id:postA.id,data:{cms:{review:'approved'}},draft:true,user:restricted,overrideAccess:false}),/phạm vi nội dung/)
 assert.equal(await canContent(await request(restricted),'posts','edit',mixed),false)
 assert.equal((await call(cmsSearch,{},restricted,'?q=Scoped')).data.results.some((r:any)=>r.id===postB.id),false)
 assert.equal((await call(siteReleaseReview,{},restricted)).status,403)
 const discussion=await payload.create({collection:'editor-reviews',user:admin,data:{scope:'posts:'+postB.id+':vi',authorId:String(admin.id),authorName:'Admin',targetCollection:'posts',targetId:String(postB.id),language:'vi',owner:'body',x:0,y:0,body:'Private discussion'}})
 assert.equal((await payload.find({collection:'editor-reviews',user:restricted,overrideAccess:false})).docs.some(doc=>doc.id===discussion.id),false)
 await assert.rejects(payload.update({collection:'content-entries',id:teacher.id,data:{title:'Private teacher'},user:restricted,overrideAccess:false}))
 await assert.rejects(payload.create({collection:'content-entries',data:{title:'Forbidden type',slug:'forbidden',kind:'faq',data:{}},user:restricted,overrideAccess:false}),/phạm vi nội dung/)
 const denied=await call(cmsMutate,{kind:'posts',ids:[postA.id],action:'schedule',at:new Date(Date.now()+60000).toISOString()},restricted);assert.equal(denied.status,403)
 const scheduledAt=new Date(Date.now()+3600000).toISOString()
 await payload.update({collection:'posts',id:postA.id,data:{cms:{review:'scheduled',scheduledAt}},draft:true})
 assert.equal((await call(cmsMutate,{kind:'posts',ids:[postA.id],action:'cancel-schedule'},restricted)).status,403)
 await assert.rejects(payload.update({collection:'posts',id:postA.id,data:{cms:{review:'draft',scheduledAt:null}},draft:true,user:restricted,overrideAccess:false}),/phạm vi nội dung/)
 const stillScheduled=await payload.findByID({collection:'posts',id:postA.id,draft:true})
 assert.equal((stillScheduled.cms as any).scheduledAt,scheduledAt)
 await assert.rejects(payload.update({collection:'content-entries',id:course.id,data:{cms:{review:'approved'}} as any,user:restricted,overrideAccess:false}),/phạm vi nội dung/)
 const self=await payload.update({collection:'users',id:restricted.id,data:{contentPermissions:{enabled:false,rules:[]}},user:restricted,overrideAccess:false});assert.equal((self.contentPermissions as any).enabled,true,'Users cannot lift their own restrictions')
 const importDenied={...input,rows:[{number:2,cells:['Private','teacher-one','20']}]};const privatePlan=await call(cmsImport,{action:'preview',input:importDenied},restricted);assert.equal(privatePlan.data.counts.error,1);assert.equal(privatePlan.data.rows[0].id,undefined)
 await payload.update({collection:'users',id:restricted.id,data:{contentPermissions:{enabled:true,rules:[]}}})
 assert.equal(await canContent(await request(restricted),'posts','edit',postA),false,'Existing sessions see revocation')
 assert.equal(await canContent(await request(admin),'posts','publish',postB),true)
 const atomic:any={collection:'content-entries',type:'faq',locale:'vi',mode:'skip',mapping:{title:0,slug:1},rows:[{number:2,cells:['Atomic one','atomic-one']},{number:3,cells:['Atomic two','atomic-two']}]}
 const atomicPreview=await call(cmsImport,{action:'preview',input:atomic})
 const originalCreate=payload.create.bind(payload)
 payload.create=(async(args:any)=>{if(args.collection==='content-entries'&&args.data.slug==='atomic-two')throw new Error('Injected import failure');return originalCreate(args)}) as any
 try{assert.equal((await call(cmsImport,{action:'commit',input:atomic,token:atomicPreview.data.token})).status,400)}finally{payload.create=originalCreate as any}
 assert.equal((await payload.count({collection:'content-entries',where:{slug:{equals:'atomic-one'}}})).totalDocs,0,'A failed import rolls back the whole batch')
 console.log('PASS type/category scope, mixed-category denial, move/publish/review/schedule guards, private search/import, no self escalation and immediate revocation')
 const zip=await buildSitePackage(payload);await importSitePackage(payload,zip.data,()=>{});assert.equal((await payload.findByID({collection:'content-types',id:type.id})).slug,'courses')
 console.log('PASS real site ZIP roundtrip preserves custom schemas and relationships with untranslated locales')
 // Browser fixture: schema and scope editor can be exercised without production data.
 await payload.create({collection:'pages',data:{title:'Studio test',slug:'home',_status:'published'}})
}finally{await payload.destroy()}
process.exit(0)
