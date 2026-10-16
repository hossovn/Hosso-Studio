import { hsContentCss } from '@hosso/studio-blocks'

// Nội dung dùng chung từ blocks; phần dưới là header/footer riêng của theme.
export const css =
  hsContentCss +
  `
.hs-announce{background:var(--hs-text);color:var(--hs-bg);text-align:center;font-size:.85rem;padding:.4rem var(--hs-space)}
.hs-header{background:var(--hs-bg);border-bottom:1px solid var(--hs-border);position:sticky;top:0;z-index:20}
.hs-header-row{display:flex;align-items:center;gap:var(--hs-space);min-height:4rem;flex-wrap:wrap}
.hs-brand{flex-shrink:0;font-family:var(--hs-font-heading);font-weight:700;font-size:1.25rem;color:var(--hs-text)!important;text-decoration:none;display:inline-flex;align-items:center}
.hs-brand img{display:block;height:2.5rem;width:auto}
.hs-nav{margin-left:auto;position:relative}
.hs-nav-toggle{display:inline-block;background:none;border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:.45rem .8rem;font:inherit;color:var(--hs-text);cursor:pointer}
.hs-nav-list,.hs-nav-sub{list-style:none;margin:0;padding:0}
.hs-nav-list{display:none;position:absolute;right:0;top:calc(100% + .5rem);background:var(--hs-bg);border:1px solid var(--hs-border);border-radius:var(--hs-radius);min-width:15rem;padding:.5rem;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.hs-nav-list.is-open{display:block}
.hs-nav-list a{display:block;padding:.55rem .75rem;color:var(--hs-text);text-decoration:none;border-radius:var(--hs-radius)}
.hs-nav-list a:hover{background:var(--hs-surface)}
.hs-nav-sub{padding-left:1rem}.hs-nav-sub a{color:var(--hs-muted);font-size:.95rem}
.hs-header-actions a{color:var(--hs-text);font-weight:600;text-decoration:none}
@media(min-width:56rem){
.hs-nav-toggle{display:none}
.hs-nav-list{display:flex;position:static;border:0;box-shadow:none;padding:0;background:none;gap:.25rem;min-width:0}
.hs-nav-list li{position:relative}
.hs-nav-sub{display:none;position:absolute;left:0;top:100%;background:var(--hs-bg);border:1px solid var(--hs-border);border-radius:var(--hs-radius);min-width:14rem;padding:.4rem;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.hs-nav-list li:hover>.hs-nav-sub,.hs-nav-list li:focus-within>.hs-nav-sub{display:block}
.hs-nav-list .has-sub>a::after{content:" ▾";font-size:.7em}
}
.hs-sitefooter{background:var(--hs-text);color:var(--hs-bg);padding:calc(var(--hs-space)*2.5) 0 calc(var(--hs-space)*1.5);margin-top:calc(var(--hs-space)*2)}
.hs-sitefooter a{color:var(--hs-bg)}.hs-sitefooter ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
.hs-sitefooter h2{font-size:1rem;margin:0 0 .5rem}.hs-sitefooter p{margin:.25rem 0}
.hs-footer-grid{display:grid;gap:calc(var(--hs-space)*1.5);grid-template-columns:1fr}
@media(min-width:48rem){.hs-footer-grid{grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))}}
.hs-sitefooter small{display:block;margin-top:1.5rem;opacity:.75}
.hs-float{position:fixed;right:1rem;bottom:1rem;display:grid;gap:.5rem;z-index:30}
.hs-float a{background:var(--hs-primary);color:var(--hs-on-primary)!important;border-radius:999px;padding:.65rem 1.1rem;font-weight:600;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25)}
.hs-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.hs-search{order:3;flex:1 1 100%}.hs-search input{width:100%;font:inherit;padding:.5rem .8rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
@media(min-width:56rem){.hs-search{order:0;flex:0 1 16rem;margin-left:1rem}.hs-nav{margin-left:0}.hs-header-actions{margin-left:auto}}

`