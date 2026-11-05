import type { Endpoint } from 'payload'
import { hasRole,isAdmin } from './access'
import { contentTypes } from './content-types'
export const cmsTypes:Endpoint={path:'/site/cms/types',method:'get',handler:async req=>{
 if(!hasRole(req.user,'admin','publisher','editor','author'))return Response.json({error:'Forbidden'},{status:403})
 return Response.json({types:await contentTypes(req),canManage:isAdmin(req.user)},{headers:{'Cache-Control':'no-store'}})
}}
