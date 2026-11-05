import type { CollectionConfig } from 'payload'
import { adminOnly, hasRole } from '../lib/access'
import { validateContentType, protectContentType } from '../lib/content-types'
import { lockSiteMutation } from '../lib/site-publication-lock'
export const ContentTypes: CollectionConfig = {
 slug:'content-types', labels:{singular:{vi:'Loại nội dung',en:'Content type'},plural:{vi:'Loại nội dung',en:'Content types'}},
 admin:{group:'Nội dung',useAsTitle:'title',defaultColumns:['title','slug','updatedAt']},
 access:{read:({req})=>hasRole(req.user,'admin','publisher','editor','author'),create:adminOnly,update:adminOnly,delete:adminOnly},
 hooks:{beforeOperation:[lockSiteMutation],beforeChange:[validateContentType],beforeDelete:[protectContentType]},
 fields:[
  {name:'title',type:'text',required:true,label:{vi:'Tên loại nội dung',en:'Content type name'}},
  {name:'slug',type:'text',required:true,unique:true,label:{vi:'Mã loại nội dung',en:'Content type key'},admin:{description:{vi:'Chữ thường, số, dấu gạch ngang. Không đổi sau khi tạo.',en:'Lowercase letters, numbers and hyphens. Immutable after creation.'}}},
  {name:'fields',type:'json',required:true,defaultValue:[],label:{vi:'Các trường nội dung',en:'Content fields'},admin:{components:{Field:'/components/admin/ContentSchemaField#ContentSchemaField'}}},
 ],
}
