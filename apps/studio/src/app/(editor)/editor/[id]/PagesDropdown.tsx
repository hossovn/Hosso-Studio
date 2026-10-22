'use client'
import React, { useId } from 'react'
import { ChevronDown, FileText, X } from 'lucide-react'
import { PagesPanel, type NavCtx } from './SitePanels'

export function PagesDropdown({ ctx }: { ctx: NavCtx }) {
  const id = useId()
  return (
    <>
      <button type="button" className="cv-pages-toggle" popoverTarget={id} aria-haspopup="dialog">
        <FileText size={16} aria-hidden="true" />Trang<ChevronDown size={14} aria-hidden="true" />
      </button>
      <div id={id} popover="auto" role="dialog" aria-label="Trang" className="cv-pages-dropdown">
        <div className="cv-panel-heading"><span className="cv-panel-title"><span className="cv-module-icon"><FileText size={18} aria-hidden="true" /></span>Trang</span><button type="button" className="cv-ib" popoverTarget={id} popoverTargetAction="hide" title="Đóng danh sách trang" aria-label="Đóng danh sách trang"><X size={16} /></button></div>
        <div className="cv-pages-body"><PagesPanel ctx={ctx} /></div>
      </div>
    </>
  )
}
