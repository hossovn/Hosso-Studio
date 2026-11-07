// CSS cho các phần của lõi không thuộc theme: danh sách bài viết, bài viết, tìm kiếm, 404. Chỉ dùng biến --hs-*.
export const baseCss = `
[id^="hs-section-"]{scroll-margin-top:80px}
@media(prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}
.hs-free-device-tablet,.hs-free-device-mobile{display:none}
@media(min-width:601px) and (max-width:1024px){.hs-free-device-desktop{display:none}.hs-free-device-tablet{display:block}}
@media(max-width:600px){.hs-free-device-desktop{display:none}.hs-free-device-mobile{display:block}}
.ss-section{padding:calc(var(--hs-space)*2.5) 0}
.ss-wrap{max-width:68rem;margin:0 auto;padding:0 var(--hs-space)}
.ss-muted{color:var(--hs-muted)}
.ss-posts{list-style:none;margin:0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:1fr}
@media(min-width:40rem){.ss-posts{grid-template-columns:repeat(2,1fr)}}
@media(min-width:60rem){.ss-posts{grid-template-columns:repeat(3,1fr)}}
.ss-post-card{background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius);overflow:hidden;display:grid;align-content:start}
.ss-post-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
.ss-post-card>div{padding:1rem;display:grid;gap:.35rem}
.ss-post-card h3{margin:0;font-size:1.1rem;line-height:1.3}.ss-post-card h3 a{color:inherit;text-decoration:none}.ss-post-card h3 a:hover{color:var(--hs-primary)}
.ss-post-card p{margin:0;color:var(--hs-muted);font-size:.95rem}.ss-post-card time{color:var(--hs-muted);font-size:.8rem}
.ss-pager{display:flex;gap:1rem;justify-content:center;align-items:center;margin-top:1.5rem}.ss-pager a{color:var(--hs-primary)}
.ss-article-head{padding:calc(var(--hs-space)*2.5) 0 var(--hs-space)}
.ss-article-head h1{font-size:clamp(1.8rem,5vw,2.8rem);margin:0 0 .5rem;max-width:28ch}
.ss-article-head time{color:var(--hs-muted)}
.ss-cover{width:100%;max-height:28rem;object-fit:cover;border-radius:var(--hs-radius);display:block;margin-top:1rem}
.ss-search{display:flex;gap:.5rem;max-width:36rem;margin:1rem 0 2rem}
.ss-search input{flex:1;min-width:0;font:inherit;padding:.65rem .8rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.ss-btn{background:var(--hs-primary);color:var(--hs-on-primary)!important;border:0;border-radius:var(--hs-radius);padding:.65rem 1.2rem;font:inherit;font-weight:600;text-decoration:none;cursor:pointer;display:inline-block}
.ss-results{list-style:none;margin:0 0 2rem;padding:0;display:grid;gap:.75rem}
.ss-results li{border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:.85rem 1rem;background:var(--hs-surface)}
.ss-results a{font-weight:600;color:var(--hs-text);text-decoration:none}.ss-results a:hover{color:var(--hs-primary)}
.ss-results p{margin:.2rem 0 0;color:var(--hs-muted);font-size:.95rem}
.ss-notfound{text-align:center;padding:calc(var(--hs-space)*5) 0}
.ss-notfound h1{font-size:clamp(3rem,12vw,6rem);margin:0;color:var(--hs-primary)}
.ss-notfound .ss-search{margin:1.5rem auto}
.ss-center{text-align:center}
.ss-slider{position:relative;max-width:76rem;margin:0 auto}
.ss-slider ul{list-style:none;margin:0;padding:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.ss-slider ul::-webkit-scrollbar{display:none}
.ss-slider li{flex:0 0 100%;scroll-snap-align:start}
.ss-slider img{display:block;width:100%;height:auto}
.ss-slider-dots{position:absolute;left:0;right:0;bottom:.6rem;display:flex;justify-content:center;gap:.5rem}
.ss-slider-dots button{width:.65rem;height:.65rem;padding:0;border-radius:50%;border:0;background:rgba(0,0,0,.35);cursor:pointer}
.ss-slider-dots button[aria-current=true]{background:var(--hs-primary)}
.ss-trust{background:var(--hs-surface);border-top:1px solid var(--hs-border);border-bottom:1px solid var(--hs-border)}
.ss-trust ul{list-style:none;margin:0 auto;padding:.7rem var(--hs-space);display:flex;gap:.5rem 2rem;flex-wrap:wrap;justify-content:center;font-size:.9rem;font-weight:600}
.ss-trust li::before{content:"✓ ";color:var(--hs-primary)}
.ss-cats{list-style:none;margin:1.25rem 0 0;padding:0;display:grid;gap:var(--hs-space);grid-template-columns:repeat(2,1fr)}
@media(min-width:40rem){.ss-cats{grid-template-columns:repeat(3,1fr)}}
@media(min-width:64rem){.ss-cats{grid-template-columns:repeat(6,1fr)}}
.ss-cats a{display:grid;gap:.5rem;justify-items:center;text-align:center;text-decoration:none;color:var(--hs-text);font-weight:600;background:var(--hs-bg);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:1rem .5rem}
.ss-cats a:hover{border-color:var(--hs-primary);color:var(--hs-primary)}
.ss-cats img,.ss-cat-ph{width:100%;max-width:7rem;aspect-ratio:1;object-fit:contain;background:var(--hs-surface);border-radius:var(--hs-radius)}
.ss-form{display:grid;gap:var(--hs-space);max-width:34rem}.ss-form.is-full-width{max-width:none}@media(min-width:600px){.ss-form{grid-template-columns:repeat(2,minmax(0,1fr))}.ss-form>*{grid-column:1/-1}.ss-form>label.is-half{grid-column:span 1}}.ss-form-progress{display:grid;gap:.55rem;font-size:.85rem;font-weight:500;color:var(--hs-muted)}.ss-form-progress progress{width:100%;height:5px;border:0;border-radius:4px;overflow:hidden;accent-color:var(--hs-primary)}.ss-form-progress progress::-webkit-progress-bar{background:var(--hs-border)}.ss-form-progress progress::-webkit-progress-value{background:var(--hs-primary)}.ss-form-back{background:transparent;color:var(--hs-text);border:1px solid var(--hs-border)}.ss-form label{display:grid;gap:.3rem;font-weight:600}
.ss-form .ss-btn{display:inline-flex;align-items:center;justify-content:center;gap:.45rem;justify-self:start;transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}.ss-form .ss-btn.is-full{justify-self:stretch;width:100%}@media(prefers-reduced-motion:no-preference){.ss-form .ss-btn:active{transform:scale(.97)}}
.ss-form input:not([type=checkbox]),.ss-form textarea,.ss-form select{font:inherit;padding:.65rem .8rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.ss-check{display:flex!important;align-items:center;gap:.5rem;font-weight:400!important}
.ss-field-error{color:#b91c1c;font-weight:600;font-size:.9rem}.ss-form-sent{color:var(--hs-primary);font-weight:600}
.ss-hp{position:absolute;left:-999px}
.ss-chips{list-style:none;margin:.5rem 0 0;padding:0;display:flex;gap:.4rem;flex-wrap:wrap}
.ss-chips a{display:inline-block;border:1px solid var(--hs-border);border-radius:999px;padding:.15rem .7rem;font-size:.85rem;color:var(--hs-muted);text-decoration:none}.ss-chips a:hover{border-color:var(--hs-primary);color:var(--hs-primary)}
.ss-post-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:2rem}.ss-post-grid:has(aside:not(:empty)){grid-template-columns:minmax(0,1fr) 300px}.ss-post-grid aside:empty{display:none}@media(max-width:860px){.ss-post-grid:has(aside:not(:empty)){grid-template-columns:minmax(0,1fr)}}
.ss-widget{margin:0 0 1.5rem}.ss-widget h3{font-size:1rem;margin:0 0 .5rem}.ss-navmenu{list-style:none;margin:0;padding:0}.ss-navmenu li{padding:.25rem 0}.ss-navmenu .ss-navmenu{padding-left:1rem}.ss-termlist{list-style:none;margin:0;padding:0}.ss-termlist li{padding:.25rem 0;border-bottom:1px solid var(--hs-border)}
.ss-post-grid aside .ss-posts{grid-template-columns:1fr}.ss-post-grid aside .ss-section{padding:0 0 1.5rem}.ss-post-grid aside .ss-wrap{padding:0}
.ss-crumbs{font-size:.85rem;color:var(--hs-muted);padding-top:1rem}.ss-crumbs a{color:inherit}
.ss-comments{margin-top:calc(var(--hs-space)*2);border-top:1px solid var(--hs-border);padding-top:var(--hs-space)}
.ss-comment{border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:.8rem 1rem;margin:.75rem 0;background:var(--hs-surface)}.ss-comment p{margin:.3rem 0 0;white-space:pre-line}.ss-comment time{color:var(--hs-muted);font-size:.8rem}
.ss-lang{display:flex;gap:.5rem;list-style:none;margin:0;padding:0}.ss-lang a{text-decoration:none;font-size:.85rem;padding:.15rem .4rem;border-radius:var(--hs-radius)}.ss-lang a[aria-current=true]{font-weight:700;text-decoration:underline}
.ss-flag-svg{display:block;flex-shrink:0;border-radius:2px}
.ss-lang-pills{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:rgba(255,255,255,.92);border:1px solid rgba(15,23,42,.12);box-shadow:0 2px 8px rgba(15,23,42,.06)}
.ss-lang-pill{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:6px 11px;border-radius:999px;font-size:.78rem;font-weight:700;letter-spacing:.02em;color:#334155!important;text-decoration:none;transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
.ss-lang-pill.is-active{background:#0f172a;color:#ffffff!important}
.ss-lang-drop{position:relative;display:inline-block}
.ss-lang-trigger{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:0 13px;border-radius:999px;border:1px solid rgba(15,23,42,.14);background:rgba(255,255,255,.94);color:#0f172a;font:700 .8rem/1 var(--hs-font-body,system-ui,sans-serif);cursor:pointer;box-shadow:0 2px 8px rgba(15,23,42,.06);transition:transform 160ms cubic-bezier(.23,1,.32,1),opacity 160ms cubic-bezier(.23,1,.32,1)}
.ss-lang-caret{transition:transform 160ms cubic-bezier(.23,1,.32,1)}.ss-lang-caret.is-open{transform:rotate(180deg)}
.ss-lang-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:176px;padding:6px;border-radius:14px;background:#ffffff;border:1px solid rgba(15,23,42,.1);box-shadow:0 16px 36px rgba(15,23,42,.16);display:grid;gap:2px;z-index:60}
.ss-lang-option{display:flex;align-items:center;gap:8px;min-height:44px;padding:8px 11px;border-radius:10px;text-decoration:none;color:#0f172a!important;font-size:.85rem;font-weight:500}
.ss-lang-option:hover{background:#f1f5f9}.ss-lang-option.is-active{background:#eff6ff;color:#1d4ed8!important;font-weight:700}
.ss-lang-option-label{flex:1;white-space:nowrap}.ss-lang-option-code{font-size:.72rem;font-weight:700;opacity:.65}
.hs-theme.has-contact-dock :is(.hs-float,.ha-float,.ta-float){display:none!important}
@media(prefers-reduced-motion:reduce){.ss-lang-pill,.ss-lang-trigger,.ss-lang-caret{transition:none!important}}

.hs-free-layer :is(h1,h2,h3,h4,h5,h6,p){margin:0;padding:0;border:0;max-width:none;text-transform:none;letter-spacing:normal;font-family:inherit}
.hs-free-layer :is(h1,h2,h3,h4,h5,h6,p)::before,.hs-free-layer :is(h1,h2,h3,h4,h5,h6,p)::after{content:none!important;display:none!important}
`
