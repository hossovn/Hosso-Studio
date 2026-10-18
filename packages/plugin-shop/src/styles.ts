// CSS của renderer dự phòng (class sp-*), chỉ dùng biến --hs-* nên theo theme đang chọn.
export const css = `
.sp-section{padding:calc(var(--hs-space)*2) 0}
.sp-wrap{max-width:76rem;margin:0 auto;padding:0 var(--hs-space)}
.sp-section h1,.sp-section h2,.sp-section h3{font-family:var(--hs-font-heading)}
.sp-note{color:var(--hs-muted);margin:0 0 1rem}.sp-error{border:1px solid var(--hs-border);background:var(--hs-surface);padding:1rem;border-radius:var(--hs-radius);color:var(--hs-text)}
.sp-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.sp-btn{background:var(--hs-primary);color:var(--hs-on-primary);border:0;border-radius:var(--hs-radius);padding:.7rem 1.25rem;font:inherit;font-weight:600;cursor:pointer}
.sp-btn:disabled{opacity:.5;cursor:not-allowed}.sp-btn-link{display:inline-block;text-decoration:none}
.sp-link{background:none;border:0;color:var(--hs-primary);font:inherit;text-decoration:underline;cursor:pointer;padding:.3rem 0}
.sp-grid{list-style:none;margin:0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:repeat(2,1fr)}
@media(min-width:48rem){.sp-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:64rem){.sp-grid{grid-template-columns:repeat(5,1fr)}}
.sp-card{background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:.75rem;display:grid;gap:.35rem;align-content:start}
.sp-card-img{display:block;aspect-ratio:1;background:#fff;border-radius:var(--hs-radius);overflow:hidden}
.sp-card-img img{width:100%;height:100%;object-fit:contain;display:block}
.sp-card h3{margin:0;font-size:.95rem;line-height:1.3}.sp-card a{color:inherit;text-decoration:none}.sp-card h3 a:hover{color:var(--hs-primary)}
.sp-meta{margin:0;color:var(--hs-muted);font-size:.82rem}
.sp-price{margin:0;font-weight:700;color:var(--hs-primary)}.sp-price del{color:var(--hs-muted);font-weight:400;font-size:.85em}.sp-price-lg{font-size:1.6rem}
.sp-badge{justify-self:start;font-size:.75rem;font-weight:700;padding:.15rem .5rem;border-radius:var(--hs-radius);border:1px solid var(--hs-border);color:var(--hs-muted)}
.sp-pager{display:flex;gap:1rem;align-items:center;justify-content:center;margin-top:1.5rem}.sp-pager a{color:var(--hs-primary)}
.sp-back{display:inline-block;margin-bottom:1rem;color:var(--hs-primary)}
.sp-detail{display:grid;gap:calc(var(--hs-space)*1.5)}@media(min-width:48rem){.sp-detail{grid-template-columns:1fr 1fr}}
.sp-detail-img{background:#fff;border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:1rem}.sp-detail-img img{width:100%;height:auto;display:block}
.sp-detail h1{margin:.2rem 0}.sp-detail h2{margin-top:2rem;font-size:1.2rem}
.sp-spec{display:grid;grid-template-columns:max-content 1fr;gap:.35rem 1.5rem;margin:1rem 0}.sp-spec dt{color:var(--hs-muted)}.sp-spec dd{margin:0}
.sp-add{margin:1rem 0}.sp-variant{display:grid;gap:.25rem;font-weight:600;margin-bottom:.75rem;max-width:20rem}.sp-variant select{font:inherit;padding:.55rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.sp-cats{list-style:none;margin:0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:repeat(2,1fr)}
@media(min-width:48rem){.sp-cats{grid-template-columns:repeat(4,1fr)}}@media(min-width:64rem){.sp-cats{grid-template-columns:repeat(6,1fr)}}
.sp-cats a{display:grid;gap:.5rem;justify-items:center;text-align:center;padding:.75rem;background:var(--hs-bg);border:1px solid var(--hs-border);border-radius:var(--hs-radius);color:inherit;text-decoration:none;font-weight:600}
.sp-cats img,.sp-cat-ph{width:100%;aspect-ratio:1;object-fit:contain;background:var(--hs-surface)}
.sp-cart{list-style:none;margin:0 0 1rem;padding:0;display:grid;gap:.5rem}
.sp-cart li{display:grid;grid-template-columns:1fr auto auto auto;gap:1rem;align-items:center;padding:.75rem 1rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-surface)}
.sp-cart li div{display:grid}.sp-cart input{width:4.5rem;font:inherit;padding:.4rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.sp-cart-summary li{grid-template-columns:1fr auto}.sp-total{font-size:1.15rem}
.sp-form{display:grid;gap:var(--hs-space);max-width:32rem;margin:1rem 0}.sp-form label{display:grid;gap:.25rem;font-weight:600}
.sp-form input:not([type=radio]),.sp-form textarea{font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.sp-form fieldset{border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:.75rem 1rem;display:grid;gap:.5rem}.sp-radio{display:flex!important;gap:.5rem;align-items:center;font-weight:400!important}
.sp-voucher{display:flex;gap:.5rem;align-items:end}.sp-voucher label{flex:1}.sp-qr{margin-top:1rem}.sp-qr img{display:block;max-width:100%;height:auto;background:#fff}
.sp-filters{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end;margin:0 0 1rem;padding:.75rem;background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius)}
.sp-filters label{display:grid;gap:.2rem;font-size:.8rem;font-weight:600}.sp-filters input,.sp-filters select{font:inherit;padding:.45rem .6rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);max-width:11rem}
.sp-stars{color:#f59e0b;letter-spacing:.05em}.sp-reviews{list-style:none;margin:0 0 1.5rem;padding:0;display:grid;gap:.75rem}.sp-reviews li{padding:.75rem 1rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-surface)}
.sp-order{margin-top:1.5rem}.sp-hp{position:absolute;left:-999px}
`
