import React from 'react'

// Định dạng nhẹ cho khối Văn bản (không dùng HTML thô nên không có rủi ro XSS):
//   **đậm**  *nghiêng*  [chữ liên kết](https://… hoặc /đường-dẫn)  dòng bắt đầu bằng "- " là danh sách; cách đoạn bằng dòng trống.
const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:|tel:)/i

function inline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  let n = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${n++}`
    if (m[1] !== undefined) {
      out.push(SAFE_HREF.test(m[2]) ? <a key={key} href={m[2]}>{m[1]}</a> : m[1])
    } else if (m[3] !== undefined) out.push(<strong key={key}>{m[3]}</strong>)
    else out.push(<em key={key}>{m[4]}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/** Chuyển nội dung văn bản có định dạng nhẹ thành các đoạn, danh sách, liên kết. */
export function Rich({ text }: { text: string }) {
  const blocks = String(text ?? '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trimEnd())
        if (lines.every((l) => /^[-•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^[-•]\s+/, ''), `${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i}>
            {lines.flatMap((l, j) => (j ? [<br key={`br${j}`} />, ...inline(l, `${i}-${j}`)] : inline(l, `${i}-${j}`)))}
          </p>
        )
      })}
    </>
  )
}
