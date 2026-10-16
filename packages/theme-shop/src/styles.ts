import { hsContentCss } from '@hosso/studio-blocks'

// Nội dung dùng chung từ blocks; phần dưới là header/footer riêng của theme (tiền tố sh-).
export const css =
  hsContentCss +
  `
.sh-wrap{max-width:72rem;margin:0 auto;padding:0 var(--hs-space)}
.sh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.sh-header{position:sticky;top:0;z-index:20}
.sh-announce{background:var(--hs-accent);color:var(--hs-on-accent);text-align:center;font-size:.82rem;font-weight:600;padding:.35rem var(--hs-space)}
.sh-main{background:var(--hs-dark);color:#fff}
.sh-main-row{display:flex;align-items:center;gap:var(--hs-space);min-height:4rem;flex-wrap:wrap;padding-top:.5rem;padding-bottom:.5rem}
.sh-brand{flex-shrink:0;font-family:var(--hs-font-heading);font-weight:800;font-size:1.3rem;color:#fff!important;text-decoration:none;display:inline-flex;align-items:center}
.sh-brand img{display:block;height:2.5rem;width:auto;max-width:11rem}
.sh-search{flex:1 1 100%;order:3;display:flex}
.sh-search input{flex:1;min-width:0;font:inherit;padding:.6rem .9rem;border:0;border-radius:var(--hs-radius) 0 0 var(--hs-radius)}
.sh-search button{background:var(--hs-accent);color:var(--hs-on-accent);border:0;border-radius:0 var(--hs-radius) var(--hs-radius) 0;padding:0 1.1rem;font:inherit;font-weight:700;cursor:pointer}
.sh-tools{margin-left:auto;display:flex;align-items:center;gap:1.25rem}
.sh-hotline{display:none;color:#fff!important;text-decoration:none;line-height:1.2}.sh-hotline small{display:block;font-size:.7rem;opacity:.75;text-transform:uppercase}
.sh-actions a{color:#fff;font-weight:700;text-decoration:none;white-space:nowrap}
@media(min-width:56rem){.sh-search{order:0;flex:1 1 20rem;max-width:34rem}.sh-hotline{display:block}}
.sh-bar{background:var(--hs-accent);color:var(--hs-on-accent)}
.sh-nav{position:relative}
.sh-nav-toggle{background:none;border:0;color:var(--hs-on-accent);font:inherit;font-weight:700;padding:.65rem 0;cursor:pointer}
.sh-nav-list,.sh-nav-sub{list-style:none;margin:0;padding:0}
.sh-nav-list{display:none;position:absolute;left:0;top:100%;background:#fff;color:var(--hs-text);min-width:16rem;border:1px solid var(--hs-border);box-shadow:0 8px 24px rgba(0,0,0,.15);padding:.4rem;z-index:5}
.sh-nav-list.is-open{display:block}
.sh-nav-list a{display:block;padding:.6rem .75rem;color:inherit;text-decoration:none;font-weight:600}
.sh-nav-list a:hover{background:var(--hs-surface)}
.sh-nav-sub{padding-left:1rem}.sh-nav-sub a{font-weight:400;color:var(--hs-muted)}
@media(min-width:56rem){
.sh-nav-toggle{display:none}
.sh-nav-list{display:flex;position:static;background:none;color:inherit;border:0;box-shadow:none;padding:0;min-width:0;gap:0}
.sh-nav-list>li{position:relative}
.sh-nav-list>li>a{padding:.7rem 1rem;text-transform:uppercase;font-size:.85rem;letter-spacing:.02em;font-weight:700}
.sh-nav-list>li>a:hover{background:rgba(0,0,0,.12)}
.sh-nav-sub{display:none;position:absolute;left:0;top:100%;background:#fff;color:var(--hs-text);border:1px solid var(--hs-border);box-shadow:0 8px 24px rgba(0,0,0,.15);min-width:15rem;padding:.4rem;z-index:5}
.sh-nav-list li:hover>.sh-nav-sub,.sh-nav-list li:focus-within>.sh-nav-sub{display:block}
.sh-nav-list .has-sub>a::after{content:" ▾";font-size:.75em}
}
.sh-footer{background:var(--hs-dark);color:#e5e7eb;padding:calc(var(--hs-space)*2.5) 0 calc(var(--hs-space)*1.5);margin-top:calc(var(--hs-space)*2)}
.sh-footer a{color:#e5e7eb}.sh-footer a:hover{color:var(--hs-accent)}
.sh-footer ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}.sh-footer p{margin:.3rem 0}
.sh-footer h2{font-size:1rem;color:#fff;margin:0 0 .6rem}.sh-footer-name{color:#fff;font-size:1.1rem}
.sh-footer-grid{display:grid;gap:calc(var(--hs-space)*1.5);grid-template-columns:1fr}
@media(min-width:48rem){.sh-footer-grid{grid-template-columns:2fr 1fr 1fr}}
.sh-copy{display:block;margin-top:1.5rem;opacity:.7}
.sh-float{position:fixed;right:1rem;bottom:1rem;display:grid;gap:.5rem;z-index:30}
.sh-float a{background:var(--hs-accent);color:var(--hs-on-accent)!important;border-radius:999px;padding:.65rem 1.1rem;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.3)}
`
