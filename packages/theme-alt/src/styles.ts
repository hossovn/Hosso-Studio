// Theme tối, kỹ thuật. Mobile-first, màu/font/khoảng cách lấy từ biến --hs-*.
export const css = `
.hs-theme{background:var(--hs-bg);color:var(--hs-text);font-family:var(--hs-font-body);line-height:1.65;min-height:100vh}
.hs-theme *{box-sizing:border-box}
.hs-theme h1,.hs-theme h2,.hs-theme h3{font-family:var(--hs-font-heading);text-transform:uppercase;line-height:1.05;margin:0 0 .5em;letter-spacing:.01em}
.hs-theme a{color:var(--hs-primary)}
.hs-theme :focus-visible{outline:2px solid var(--hs-primary);outline-offset:3px}
.hs-skip{position:absolute;left:-999px}.hs-skip:focus{left:var(--hs-space);top:var(--hs-space);background:var(--hs-primary);color:var(--hs-on-primary);padding:.5rem 1rem;z-index:10}
.hs-hp{position:absolute;left:-999px}
.hs-sent{display:none;color:var(--hs-primary);font-weight:600}.hs-sent:target{display:block}
.hs-missing{border:1px dashed var(--hs-border);padding:1rem;color:var(--hs-muted)}
.ha-wrap{max-width:72rem;margin:0 auto;padding:0 var(--hs-space)}
.ha-section{padding:calc(var(--hs-space)*3) 0;border-top:1px solid var(--hs-border)}
.ha-cols{display:grid;gap:var(--hs-space)}
@media(min-width:48rem){.ha-cols{grid-template-columns:1fr 2fr;gap:calc(var(--hs-space)*3)}}
.ha-cols h2{font-size:clamp(1.6rem,4vw,2.4rem)}
.ha-cols p{margin:0 0 1em;color:var(--hs-muted)}
.ha-h2{font-size:clamp(1.6rem,4vw,2.4rem)}
.ha-hero{padding:calc(var(--hs-space)*4) 0 calc(var(--hs-space)*3);background-image:linear-gradient(var(--hs-border) 1px,transparent 1px),linear-gradient(90deg,var(--hs-border) 1px,transparent 1px);background-size:3rem 3rem;background-position:-1px -1px}
.ha-hero h1{font-size:clamp(2.6rem,11vw,6.5rem);max-width:12ch;margin-bottom:.4em}
.ha-eyebrow{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--hs-primary);letter-spacing:.12em;font-size:.85rem;margin:0 0 1rem}
.ha-hero-row{display:grid;gap:var(--hs-space);align-items:end}
@media(min-width:48rem){.ha-hero-row{grid-template-columns:1fr auto}}
.ha-lead{color:var(--hs-muted);font-size:1.15rem;max-width:40rem;margin:0}
.ha-btn{display:inline-block;background:var(--hs-primary);color:var(--hs-on-primary)!important;padding:.85rem 1.6rem;border-radius:var(--hs-radius);font-weight:700;text-decoration:none;text-transform:uppercase;letter-spacing:.06em;border:0;cursor:pointer;font:inherit;font-weight:700;clip-path:polygon(0 0,calc(100% - .7rem) 0,100% .7rem,100% 100%,0 100%)}
.ha-specs{list-style:none;margin:0;padding:0;border-top:1px solid var(--hs-border)}
.ha-specs li{display:grid;gap:.25rem 1.5rem;padding:1.25rem 0;border-bottom:1px solid var(--hs-border);grid-template-columns:3rem 1fr}
@media(min-width:48rem){.ha-specs li{grid-template-columns:4rem 1fr 2fr;align-items:baseline}}
.ha-num{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--hs-primary)}
.ha-specs h3{font-size:1.5rem;margin:0}
.ha-specs p{margin:0;color:var(--hs-muted);grid-column:2}
@media(min-width:48rem){.ha-specs p{grid-column:auto}}
.ha-figure{margin:0;border-top:1px solid var(--hs-border);border-bottom:1px solid var(--hs-border)}
.ha-figure img{width:100%;height:auto;display:block}
.ha-figure figcaption{color:var(--hs-muted);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.8rem;padding-top:.75rem;padding-bottom:.75rem}
.ha-contact{background:var(--hs-surface)}
.ha-form{display:grid;gap:var(--hs-space)}
.ha-form label{display:grid;gap:.3rem;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em;color:var(--hs-muted)}
.ha-form input,.ha-form textarea{font:inherit;font-size:1rem;text-transform:none;letter-spacing:0;padding:.75rem .9rem;background:var(--hs-bg);color:var(--hs-text);border:1px solid var(--hs-border);border-radius:var(--hs-radius)}
.ha-form input:focus,.ha-form textarea:focus{border-color:var(--hs-primary)}
.ha-form .ha-btn{justify-self:start}
.ha-footer{border-top:1px solid var(--hs-border);padding:calc(var(--hs-space)*2) 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.85rem;color:var(--hs-muted)}
.ha-footer ul{list-style:none;margin:0;padding:0;display:flex;gap:1.5rem;flex-wrap:wrap}
@media(min-width:48rem){.ha-footer ul{justify-content:flex-end}}
.ha-footer a{text-transform:uppercase;letter-spacing:.08em}
`
