// CSS nội dung của bộ renderer hs-* (hero, văn bản, ảnh, video, tính năng, form). Dùng biến --hs-* của theme.
export const hsContentCss = `
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
.hs-video{margin:0}.hs-video-frame{position:relative;aspect-ratio:16/9;background:#000;border-radius:var(--hs-radius);overflow:hidden}.hs-video-frame iframe,.hs-video-frame video{position:absolute;inset:0;width:100%;height:100%;border:0}.hs-video figcaption{color:var(--hs-muted);font-size:.9rem;margin-top:.5rem}
.hs-hero{position:relative;overflow:hidden}.hs-hero>.hs-wrap{position:relative;z-index:1}.hs-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}.hs-hero.has-image::after{content:"";position:absolute;inset:0;background:rgba(0,0,0,.55);z-index:0}.hs-hero.has-image{color:#fff}.hs-hero.has-image h1{color:#fff}.hs-hero.has-image p{color:#e5e7eb}
`
