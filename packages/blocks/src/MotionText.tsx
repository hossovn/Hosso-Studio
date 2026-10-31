import React from 'react'
import { splitMotionText } from './motion-effects'

const hidden: React.CSSProperties = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }
const marqueeCss = '.hs-motion-marquee{display:block;max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere}.hs-motion-marquee [data-motion-marquee-copy]{display:none}.hs-motion-marquee[data-motion-marquee-active]{overflow:hidden}.hs-motion-marquee[data-motion-marquee-active] [data-motion-marquee]{display:flex;width:max-content;white-space:pre}.hs-motion-marquee[data-motion-marquee-active] [data-motion-marquee]>span{padding-right:2em}.hs-motion-marquee[data-motion-marquee-active] [data-motion-marquee-copy]{display:block}'

export function MotionText({ text, mode, marquee = false }: { text: string; mode: 'lines' | 'words' | 'marquee'; marquee?: boolean }) {
  const source = <span style={hidden}>{text}</span>
  const units = mode === 'marquee' ? [] : splitMotionText(text, mode)
  let word = 0
  const visual = mode === 'marquee' ? text : units.map((unit, index) => mode === 'words' && /^\s+$/u.test(unit)
    ? <React.Fragment key={index}>{unit}</React.Fragment>
    : <span key={index} data-motion-unit={mode === 'words' ? word++ : index} style={{ display: mode === 'lines' ? 'block' : 'inline-block', whiteSpace: 'pre-wrap' }}>{mode === 'lines' ? unit || '\u200b' : unit}</span>)
  if (marquee || mode === 'marquee') return <>{source}<style>{marqueeCss}</style><span aria-hidden="true" className="hs-motion-marquee"><span data-motion-marquee=""><span>{visual}</span><span data-motion-marquee-copy="">{text}</span></span></span></>
  return <>{source}<span aria-hidden="true" style={{ whiteSpace: 'pre-wrap' }}>{visual}</span></>
}
