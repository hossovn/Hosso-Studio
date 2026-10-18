import { hsContentCss } from '@hosso/studio-blocks'

// Nội dung dùng chung từ blocks; phần dưới là header/footer riêng của theme (tiền tố ta-).
export const css =
  hsContentCss +
  `
.ta-wrap{max-width:76rem;margin:0 auto;padding:0 var(--hs-space)}
.ta-header{position:sticky;top:0;z-index:20}
.ta-announce{background:var(--hs-dark);color:#fff;text-align:center;font-size:.78rem;font-weight:600;padding:.35rem var(--hs-space);border-bottom:1px solid #27272a}
.ta-top{background:var(--hs-dark);color:#fff}
.ta-top-row{display:flex;align-items:center;gap:var(--hs-space);min-height:4.2rem;flex-wrap:wrap}
.ta-brand{flex-shrink:0;font-family:var(--hs-font-heading);font-weight:800;font-size:1.25rem;letter-spacing:.02em;color:#fff!important;text-decoration:none;display:inline-flex;align-items:center;text-transform:uppercase}
.ta-brand img{display:block;height:2.6rem;width:auto;max-width:12rem}
.ta-tools{margin-left:auto;display:flex;align-items:center;gap:1rem;position:relative}
.ta-actions a{color:#fff;font-weight:700;text-decoration:none;white-space:nowrap;font-size:.9rem}
.ta-search summary{list-style:none;cursor:pointer;color:#fff;display:flex;padding:.4rem}
.ta-search summary::-webkit-details-marker{display:none}
.ta-search form{position:absolute;right:0;top:calc(100% + .6rem);display:flex;width:min(22rem,86vw);background:#fff;border-radius:var(--hs-radius);box-shadow:0 8px 24px rgba(0,0,0,.35);overflow:hidden;z-index:6}
.ta-search input{flex:1;min-width:0;font:inherit;border:0;padding:.7rem .9rem;color:#111}
.ta-search button{background:var(--hs-accent);color:var(--hs-on-accent);border:0;padding:0 1.1rem;font:inherit;font-weight:700;cursor:pointer}
/* menu chính: tiền tố ta-nav (SiteNav) */
.ta-nav{position:relative;order:3;flex:1 1 100%}
.ta-nav-toggle{background:none;border:1px solid #3f3f46;color:#fff;font:inherit;font-weight:700;padding:.45rem .9rem;border-radius:var(--hs-radius);cursor:pointer}
.ta-nav-list,.ta-nav-sub{list-style:none;margin:0;padding:0}
.ta-nav-list{display:none;background:#18181b;border-radius:var(--hs-radius);padding:.4rem;margin-top:.5rem}
.ta-nav-list.is-open{display:block}
.ta-nav-list a{display:block;padding:.6rem .75rem;color:#fff;text-decoration:none;font-weight:600}
.ta-nav-sub{padding-left:1rem}.ta-nav-sub a{font-weight:400;color:#d4d4d8}
@media(min-width:56rem){
.ta-nav{order:0;flex:1 1 0;min-width:0}
.ta-nav-toggle{display:none}
.ta-nav-list{display:flex;justify-content:center;flex-wrap:wrap;background:none;padding:0;margin:0;gap:.25rem}
.ta-nav-list>li{position:relative}
.ta-nav-list>li>a{padding:.5rem .6rem;text-transform:uppercase;font-size:.78rem;font-weight:700;letter-spacing:0;border-bottom:2px solid transparent}
.ta-nav-list>li>a:hover{color:var(--hs-accent);border-bottom-color:var(--hs-accent)}
.ta-nav-sub{display:none;position:absolute;left:0;top:100%;background:#fff;color:var(--hs-text);border-radius:var(--hs-radius);box-shadow:0 8px 24px rgba(0,0,0,.25);min-width:15rem;padding:.4rem;z-index:5}
.ta-nav-sub a{color:var(--hs-text)}.ta-nav-sub a:hover{background:var(--hs-surface)}
.ta-nav-list li:hover>.ta-nav-sub,.ta-nav-list li:focus-within>.ta-nav-sub{display:block}
.ta-nav-list .has-sub>a::after{content:" ⌄";font-size:.8em}
}
/* thanh phụ: Danh mục + cam kết */
.ta-sub{background:#fff;border-bottom:1px solid var(--hs-border);box-shadow:0 1px 0 rgba(0,0,0,.04)}
.ta-sub-row{display:flex;align-items:stretch;gap:1.25rem;min-height:3.2rem}
.ta-cat{position:relative;flex-shrink:0}
.ta-cat summary{list-style:none;cursor:pointer;background:var(--hs-accent);color:var(--hs-on-accent);font-weight:800;padding:0 1.25rem;height:100%;min-height:3.2rem;display:flex;align-items:center;gap:.6rem;min-width:11rem}
.ta-cat summary::-webkit-details-marker{display:none}
.ta-cat ul{position:absolute;left:0;top:100%;list-style:none;margin:0;padding:.4rem;background:#fff;border:1px solid var(--hs-border);box-shadow:0 8px 24px rgba(0,0,0,.18);min-width:16rem;max-height:70vh;overflow:auto;z-index:6}
.ta-cat a{display:block;padding:.55rem .75rem;color:var(--hs-text);text-decoration:none;font-weight:600}
.ta-cat a:hover{background:var(--hs-surface)}
.ta-perks{display:none;list-style:none;margin:0;padding:0;gap:1.75rem;align-items:center;font-size:.85rem;color:var(--hs-muted)}
.ta-perks li::before{content:"";display:inline-block;width:.7rem;height:.7rem;border-radius:50%;background:var(--hs-accent);margin-right:.5rem;vertical-align:-.05rem}
@media(min-width:48rem){.ta-perks{display:flex}}
/* chân trang */
.ta-footer{background:var(--hs-dark);color:#e5e5e5;padding:calc(var(--hs-space)*2.5) 0 calc(var(--hs-space)*1.5);margin-top:calc(var(--hs-space)*2)}
.ta-footer a{color:#e5e5e5}.ta-footer a:hover{color:var(--hs-accent)}
.ta-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}.ta-footer p{margin:.3rem 0}
.ta-footer h2{font-size:1rem;color:#fff;margin:0 0 .6rem}.ta-footer-name{color:#fff;font-size:1.1rem}
.ta-footer-grid{display:grid;gap:calc(var(--hs-space)*1.5);grid-template-columns:1fr}
@media(min-width:48rem){.ta-footer-grid{grid-template-columns:2fr 1fr 1fr}}
.ta-copy{display:block;margin-top:1.5rem;opacity:.7}
/* nút liên hệ tròn nổi */
.ta-float{position:fixed;right:1rem;bottom:1rem;display:grid;gap:.6rem;z-index:30}
.ta-float a{width:3rem;height:3rem;border-radius:50%;display:grid;place-items:center;color:#fff!important;font-weight:800;font-size:1.05rem;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.ta-float-call{background:#16a34a}.ta-float-zalo{background:#0068ff;font-size:.78rem!important}.ta-float-mail{background:#0ea5e9}
`
