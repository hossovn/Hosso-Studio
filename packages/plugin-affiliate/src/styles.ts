// CSS cổng cộng tác viên, chỉ dùng biến --hs-* nên theo theme đang chọn; tự đủ, không cần plugin khác.
export const css = `
.wp-aff{max-width:72rem;margin:0 auto;padding:calc(var(--hs-space)*2) var(--hs-space)}
.wp-aff h2,.wp-aff h3{font-family:var(--hs-font-heading)}
.wp-aff .wp-note{color:var(--hs-muted)}.wp-aff .wp-note-error{border:1px solid var(--hs-border);background:var(--hs-surface);padding:1rem;border-radius:var(--hs-radius);color:var(--hs-text)}
.wp-aff .wp-btn{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.wp-aff .wp-btn:disabled{opacity:.5;cursor:not-allowed}
.wp-aff .wp-link{background:none;border:0;color:var(--hs-primary);font:inherit;text-decoration:underline;cursor:pointer;padding:.3rem 0}
.wp-aff .wp-grid{list-style:none;margin:0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))}
.wp-aff .wp-card{background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:1rem;display:grid;gap:.4rem}
.wp-aff .wp-price{font-weight:700;color:var(--hs-primary);font-size:1.3rem}.wp-aff .wp-meta{color:var(--hs-muted);font-size:.85rem;word-break:break-all}
.wp-aff .wp-form{display:grid;gap:var(--hs-space);max-width:32rem;margin:1rem 0}.wp-aff .wp-form label{display:grid;gap:.25rem;font-weight:600}
.wp-aff input:not(.wp-hp),.wp-aff textarea{font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);min-width:0}
.wp-aff .wp-search{display:flex;gap:.5rem;max-width:36rem}.wp-aff .wp-search input{flex:1}
.wp-aff .wp-cart{list-style:none;margin:1rem 0;padding:0;display:grid;gap:.5rem}
.wp-aff .wp-cart li{display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:.75rem 1rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-surface)}
.wp-aff .wp-cart li div{display:grid;min-width:0}
.wp-aff .wp-found{max-height:16rem;overflow:auto}
.wp-aff table{border-collapse:collapse;width:100%}.wp-aff th,.wp-aff td{text-align:left;padding:.5rem;border-bottom:1px solid var(--hs-border)}
.wp-aff .wp-hp{position:absolute;left:-999px}
`
