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
.sp-grid{--n:2;list-style:none;margin:0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:repeat(var(--n),1fr)}
@media(min-width:48rem){.sp-grid{--n:3}.sp-c2 .sp-grid,.sp-grid.sp-c2{--n:2}}
@media(min-width:64rem){.sp-grid{--n:5}.sp-c2 .sp-grid,.sp-grid.sp-c2{--n:2}.sp-c3 .sp-grid,.sp-grid.sp-c3{--n:3}.sp-c4 .sp-grid,.sp-grid.sp-c4{--n:4}.sp-c6 .sp-grid,.sp-grid.sp-c6{--n:6}}
.sp-card-body{display:grid;gap:.35rem;align-content:start}
.sp-card-h{grid-template-columns:minmax(0,2fr) minmax(0,3fr);align-items:center;gap:.75rem}.sp-card-h>.sp-card-img{align-self:start}
.sp-card-plain{background:transparent;border-color:transparent;padding:0}
.sp-r-portrait{aspect-ratio:3/4}.sp-r-wide{aspect-ratio:4/3}
.sp-carousel{position:relative}
.sp-grid.sp-car{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:.25rem 0}.sp-car::-webkit-scrollbar{display:none}
.sp-car>.sp-card{flex:0 0 calc((100% - var(--hs-space)*(var(--n) - 1))/var(--n));scroll-snap-align:start;min-width:0}
.sp-car-btn{position:absolute;top:calc(50% - 1.25rem);width:2.5rem;height:2.5rem;border-radius:50%;border:1px solid var(--hs-border);background:var(--hs-bg);color:var(--hs-text);font-size:1.5rem;line-height:1;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2);z-index:2}
.sp-car-btn.is-prev{left:-.6rem}.sp-car-btn.is-next{right:-.6rem}.sp-car-btn:disabled{opacity:.35;cursor:default}
.sp-w-narrow .sp-wrap{max-width:44rem}.sp-w-wide .sp-wrap{max-width:96rem}
.sp-checkout-body{display:grid;gap:2rem;align-items:start}.sp-checkout-body>.sp-form{max-width:none;margin:0;min-width:0}.sp-checkout-body h3{margin:0;font-size:1.2rem}.sp-checkout-lines{list-style:none;padding:0;margin:1rem 0}.sp-checkout-lines>li{display:flex;gap:.75rem;padding:1rem 0;border-bottom:1px solid var(--hs-border)}.sp-checkout-lines>li>div:last-child{display:grid;gap:.3rem;min-width:0;overflow-wrap:anywhere}.sp-checkout-lines .sp-line-image{width:56px;min-width:56px;height:56px}
@media(min-width:56rem){.sp-split .sp-checkout-body{grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}.sp-split .sp-checkout-body>.sp-cart-totals{position:sticky;top:1.5rem}}
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
.sp-commerce{letter-spacing:0}.sp-commerce-heading{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;margin-bottom:1.5rem}.sp-commerce-heading h2{font-size:1.75rem;margin:0}.sp-commerce-heading>span{color:var(--hs-muted)}
.sp-cart-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:2rem;align-items:start}.sp-cart-main{min-width:0}.sp-cart-lines{list-style:none;padding:0;margin:0 0 1.25rem}
.sp-cart-lines>li{display:grid;grid-template-columns:80px minmax(0,1fr) auto;gap:1rem;align-items:center;padding:1.5rem 0;border-bottom:1px solid var(--hs-border)}.sp-cart-lines>li:first-child{border-top:1px solid var(--hs-border)}
.sp-line-image{width:80px;aspect-ratio:1;display:grid;place-items:center;background:#fff;border:1px solid var(--hs-border);border-radius:4px;overflow:hidden;color:#757575}.sp-line-image img{width:100%;height:100%;object-fit:contain}.sp-line-info{display:grid;gap:.4rem;min-width:0;overflow-wrap:anywhere}.sp-line-info strong{font-size:1rem;line-height:1.5}
.sp-quantity{display:flex;align-items:center;border:1px solid var(--hs-border);width:116px;height:40px;border-radius:4px;overflow:hidden;background:var(--hs-bg)}.sp-quantity button{border:0;background:transparent;color:inherit;display:grid;place-items:center;width:36px;height:40px;flex-shrink:0;cursor:pointer}.sp-quantity input{border:0;width:42px;min-width:0;height:38px;background:transparent;color:inherit;text-align:center;font:inherit;appearance:textfield;-moz-appearance:textfield;padding:0}.sp-quantity input::-webkit-inner-spin-button,.sp-quantity input::-webkit-outer-spin-button{appearance:none;margin:0}.sp-quantity button:hover:not(:disabled){background:var(--hs-surface)}.sp-quantity button:disabled{opacity:.35;cursor:not-allowed}
.sp-icon-button{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:4px;background:transparent;color:var(--hs-muted);cursor:pointer}.sp-icon-button:hover{background:var(--hs-surface);color:var(--hs-text)}.sp-remove{grid-column:3;grid-row:1}.sp-line-total{grid-column:3;grid-row:2;white-space:nowrap;font-variant-numeric:tabular-nums}.sp-cart-lines .sp-quantity{grid-column:2;grid-row:2}.sp-no-image .sp-line-info{grid-column:1/3}.sp-no-image .sp-quantity{grid-column:1}
.sp-cart-totals{background:var(--hs-surface);padding:1.5rem;min-width:0}.sp-cart-totals h3{margin:0 0 1.5rem;font-size:1.2rem}.sp-cart-totals dl{margin:0;display:grid;gap:1rem}.sp-cart-totals dl>div{display:flex;justify-content:space-between;gap:1rem}.sp-cart-totals dd{margin:0;text-align:right}.sp-summary-total{display:flex;justify-content:space-between;gap:1rem;padding:1.25rem 0;margin-top:1.25rem;border-top:1px solid var(--hs-border)}.sp-summary-total strong{font-size:1.4rem;font-variant-numeric:tabular-nums}.sp-action{display:inline-flex;align-items:center;justify-content:center;gap:.6rem;text-decoration:none}.sp-checkout-action{display:flex;margin-bottom:1rem;min-height:48px;overflow-wrap:anywhere;text-align:center}.sp-cart-feedback{display:flex;gap:1rem;align-items:center;margin:1rem 0}.sp-empty{display:grid;justify-items:center;text-align:center;padding:3rem 1rem;gap:1rem}.sp-empty h3,.sp-empty p{margin:0}.sp-empty>svg{color:var(--hs-muted)}
.sp-commerce :is(button,input,a,select,textarea):focus-visible{outline:2px solid var(--hs-text);outline-offset:3px}.sp-commerce a[aria-disabled=true]{pointer-events:none;opacity:.6}
@media(min-width:64rem){.sp-cart-layout:not(.sp-cart-single){grid-template-columns:minmax(0,1fr) minmax(280px,340px)}.sp-cart-totals.sp-sticky{position:sticky;top:1.5rem}.sp-cart-lines>li{grid-template-columns:80px minmax(0,1fr) 116px minmax(6rem,auto) 40px}.sp-cart-lines .sp-quantity,.sp-line-total,.sp-remove{grid-column:auto;grid-row:auto}.sp-no-image .sp-line-info{grid-column:1/3}.sp-no-image .sp-quantity{grid-column:auto}}
@media(max-width:380px){.sp-cart-lines>li{grid-template-columns:56px minmax(0,1fr) 40px;gap:.75rem}.sp-line-image{width:56px}.sp-cart-lines .sp-line-total{grid-column:2;grid-row:3}.sp-cart-totals{padding:1rem}.sp-commerce-heading{flex-wrap:wrap}.sp-summary-total{flex-wrap:wrap}}
.sp-form{display:grid;gap:var(--hs-space);max-width:32rem;margin:1rem 0}.sp-form label{display:grid;gap:.25rem;font-weight:600}
.sp-form input:not([type=radio]),.sp-form textarea{font:inherit;padding:.65rem .75rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.sp-form fieldset{border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:.75rem 1rem;display:grid;gap:.5rem}.sp-radio{display:flex!important;gap:.5rem;align-items:center;font-weight:400!important}
.sp-voucher{display:flex;gap:.5rem;align-items:end}.sp-voucher label{flex:1;min-width:0}.sp-voucher button{flex-shrink:0;white-space:nowrap}.sp-lookup-another{margin-top:2rem;border-top:1px solid var(--hs-border);padding-top:1rem}.sp-lookup-another summary{cursor:pointer;padding:.75rem 0}.sp-qr{margin-top:1rem}.sp-qr img{display:block;max-width:100%;height:auto;background:#fff}
.sp-filters{display:flex;flex-wrap:wrap;gap:.6rem;align-items:end;margin:0 0 1rem;padding:.75rem;background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius)}
.sp-filters label{display:grid;gap:.2rem;font-size:.8rem;font-weight:600}.sp-filters input,.sp-filters select{font:inherit;padding:.45rem .6rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text);max-width:11rem}
.sp-stars{color:#f59e0b;letter-spacing:.05em}.sp-reviews{list-style:none;margin:0 0 1.5rem;padding:0;display:grid;gap:.75rem}.sp-reviews li{padding:.75rem 1rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-surface)}
.sp-order{margin-top:1.5rem}.sp-hp{position:absolute;left:-999px}
.sp-shipments{border-top:1px solid var(--hs-border);padding-top:1.25rem;margin-top:1rem}.sp-shipments h3{font-size:1rem;margin:0 0 1rem}.sp-shipments>ul{list-style:none;padding:0;margin:0;display:grid;gap:1.25rem}.sp-shipments>ul>li{display:grid;gap:.5rem;overflow-wrap:anywhere}.sp-shipments li ul{padding-left:1.25rem;margin:0;font-size:.9rem}.sp-shipments p{margin:0}.sp-shipments a{display:block;text-decoration:underline;color:var(--hs-text)}.sp-shipments dl{font-size:.9rem}.sp-commerce .sp-back,.sp-commerce .sp-link{color:var(--hs-text);text-decoration:underline}.sp-form select{font:inherit;border:1px solid var(--hs-border);background:var(--hs-bg);color:var(--hs-text);padding:.65rem .75rem;border-radius:var(--hs-radius)}
@media(pointer:coarse){.sp-quantity{height:44px;width:132px}.sp-quantity button{width:44px;height:44px}.sp-quantity input{width:42px}.sp-icon-button{width:44px;height:44px}}
@media(min-width:48rem){
.sp-detail.sp-img-s,main .sp-detail.sp-img-s{grid-template-columns:minmax(0,1fr) minmax(0,2fr)}
.sp-detail.sp-img-l,main .sp-detail.sp-img-l{grid-template-columns:minmax(0,3fr) minmax(0,2fr)}
.sp-detail.sp-d-stack,main .sp-detail.sp-d-stack{grid-template-columns:minmax(0,1fr)}
.sp-d-right>.sp-detail-img{order:2}}
.sp-wish{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem .9rem;border:1px solid var(--hs-border);border-radius:999px;background:var(--hs-surface,#fff);color:inherit;font:inherit;font-weight:600;cursor:pointer}.sp-wish:disabled{opacity:.6;cursor:default}.sp-wish-on{color:#dc2626;border-color:#dc2626}
`
