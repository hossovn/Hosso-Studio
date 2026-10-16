// CSS của renderer dự phòng (class wp-*), chỉ dùng biến --hs-* nên theo theme đang chọn.
export const css = `
.wp-section{padding:calc(var(--hs-space)*2) 0}
.wp-wrap{max-width:72rem;margin:0 auto;padding:0 var(--hs-space)}
.wp-section h1,.wp-section h2,.wp-section h3{font-family:var(--hs-font-heading)}
.wp-note{color:var(--hs-muted);margin:0 0 1rem}.wp-note-error{border:1px solid var(--hs-border);background:var(--hs-surface);padding:1rem;border-radius:var(--hs-radius);color:var(--hs-text)}
.wp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.wp-btn{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.wp-link{background:none;border:0;color:var(--hs-primary);font:inherit;text-decoration:underline;cursor:pointer;padding:.7rem 0}
.wp-vehicle h2{margin-top:0}
.wp-vehicle-row{display:grid;gap:var(--hs-space);align-items:end}
@media(min-width:48rem){.wp-vehicle-row{grid-template-columns:repeat(3,1fr) auto auto}}
.wp-vehicle label{display:grid;gap:.25rem;font-weight:600;font-size:.9rem}
.wp-vehicle select,.wp-search input{font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);min-width:0}
.wp-search{display:flex;gap:.5rem;max-width:36rem}.wp-search input{flex:1}
.wp-grid{list-style:none;margin:0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:1fr}
@media(min-width:40rem){.wp-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:60rem){.wp-grid{grid-template-columns:repeat(3,1fr)}}
.wp-card{background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:1rem;display:grid;gap:.4rem;align-content:start}
.wp-card h3{margin:0;font-size:1.05rem;line-height:1.3}.wp-card a{color:inherit}
.wp-meta{margin:0;color:var(--hs-muted);font-size:.85rem}
.wp-price{margin:0;font-weight:700;color:var(--hs-primary)}.wp-price-lg{font-size:1.6rem}
.wp-badge{justify-self:start;font-size:.75rem;font-weight:700;padding:.15rem .5rem;border-radius:var(--hs-radius);border:1px solid var(--hs-border);color:var(--hs-muted)}
.wp-badge-genuine{border-color:var(--hs-primary);color:var(--hs-primary)}
.wp-pager{display:flex;gap:1rem;align-items:center;justify-content:center;margin-top:1.5rem}.wp-pager a{color:var(--hs-primary)}
.wp-back{display:inline-block;margin-bottom:1rem;color:var(--hs-primary)}
.wp-detail h1{margin:.5rem 0}.wp-detail h2{margin-top:2rem;font-size:1.2rem}
.wp-spec{display:grid;grid-template-columns:max-content 1fr;gap:.35rem 1.5rem;margin:1rem 0}.wp-spec dt{color:var(--hs-muted)}.wp-spec dd{margin:0}
.wp-compat,.wp-stock{list-style:none;margin:0;padding:0;display:grid;gap:.35rem}
.wp-stock li{display:flex;justify-content:space-between;gap:1rem;padding:.6rem .8rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-surface);max-width:28rem}
.wp-out strong{color:var(--hs-muted)}.wp-in strong{color:var(--hs-primary)}
`
