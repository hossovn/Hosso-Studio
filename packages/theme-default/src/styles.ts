// Mobile-first; mọi màu/khoảng cách/font lấy từ biến --hs-* do token sinh ra.
export const css = `
.hs-theme{background:var(--hs-bg);color:var(--hs-text);font-family:var(--hs-font-body);line-height:1.6;min-height:100vh}
.hs-theme *{box-sizing:border-box}
.hs-theme h1,.hs-theme h2,.hs-theme h3{font-family:var(--hs-font-heading);line-height:1.2;margin:0 0 .5em;letter-spacing:-.01em}
.hs-theme a{color:var(--hs-primary)}
.hs-theme :focus-visible{outline:3px solid var(--hs-primary);outline-offset:2px}
.hs-wrap{max-width:68rem;margin:0 auto;padding:0 var(--hs-space)}
.hs-section{padding:calc(var(--hs-space)*2.5) 0}
.hs-skip{position:absolute;left:-999px}.hs-skip:focus{left:var(--hs-space);top:var(--hs-space);background:var(--hs-bg);padding:.5rem 1rem;z-index:10}
.hs-btn{display:inline-block;background:var(--hs-primary);color:var(--hs-on-primary)!important;padding:.75rem 1.5rem;border-radius:var(--hs-radius);font-weight:600;text-decoration:none;border:0;cursor:pointer;font:inherit;font-weight:600}
.hs-hero{background:var(--hs-surface);padding:calc(var(--hs-space)*3) 0}
.hs-hero h1{font-size:clamp(1.9rem,6vw,3.25rem);max-width:18ch}
.hs-hero p{color:var(--hs-muted);font-size:1.15rem;max-width:42rem;margin:0 0 1.5rem}
.hs-text{max-width:44rem}.hs-text p{margin:0 0 1em}
.hs-figure{margin:0}.hs-figure img{width:100%;height:auto;border-radius:var(--hs-radius);display:block}
.hs-figure figcaption{color:var(--hs-muted);font-size:.9rem;margin-top:.5rem}
.hs-grid{display:grid;gap:var(--hs-space);grid-template-columns:1fr}
@media(min-width:40rem){.hs-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:60rem){.hs-grid{grid-template-columns:repeat(3,1fr)}}
.hs-card{background:var(--hs-surface);border:1px solid var(--hs-border);border-radius:var(--hs-radius);padding:calc(var(--hs-space)*1.25)}
.hs-card h3{font-size:1.1rem}.hs-card p{margin:0;color:var(--hs-muted)}
.hs-form{display:grid;gap:var(--hs-space);max-width:32rem}
.hs-form label{display:grid;gap:.25rem;font-weight:600}
.hs-form input,.hs-form textarea{font:inherit;padding:.65rem .8rem;border:1px solid var(--hs-border);border-radius:var(--hs-radius);background:var(--hs-bg);color:var(--hs-text)}
.hs-hp{position:absolute;left:-999px}
.hs-sent{display:none;color:var(--hs-primary);font-weight:600}.hs-sent:target{display:block}
.hs-footer{background:var(--hs-text);color:var(--hs-bg);padding:calc(var(--hs-space)*2) 0;margin-top:calc(var(--hs-space)*2)}
.hs-footer a{color:var(--hs-bg)}.hs-footer ul{list-style:none;padding:0;margin:0 0 1rem;display:flex;gap:1.25rem;flex-wrap:wrap}
.hs-missing{border:1px dashed var(--hs-border);padding:1rem;color:var(--hs-muted)}
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
`
