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

/* Khối hai cột */
.hs-two-grid{display:grid;gap:clamp(1.25rem,3vw,3rem);align-items:center;grid-template-columns:1fr}
@media(min-width:48rem){.hs-two-grid{grid-template-columns:1fr 1fr}.hs-two.is-right .hs-two-img{order:2}}
.hs-two-img{border-radius:var(--hs-radius);overflow:hidden;background:var(--hs-surface);aspect-ratio:4/3}
.hs-two-img img,.hs-two-ph{display:block;width:100%;height:100%;object-fit:cover}.hs-two-img.is-contain img{object-fit:contain}
.hs-two-text h2{margin-top:0}
/* Kiểu riêng từng khối (chọn trong trình dựng) */
.hs-bg-white{background:#fff}.hs-bg-surface{background:var(--hs-surface)}
.hs-bg-dark{background:var(--hs-dark,#111);color:#fff}.hs-bg-dark a:not(.hs-btn){color:inherit}.hs-bg-dark p{color:#e5e5e5}
.hs-bg-accent{background:var(--hs-accent);color:var(--hs-on-accent,#111)}.hs-bg-primary{background:var(--hs-primary);color:var(--hs-on-primary,#fff)}
.hs-bg-primary p,.hs-bg-accent p{color:inherit}
.hs-pt-none{padding-top:0}.hs-pt-sm{padding-top:1rem}.hs-pt-md{padding-top:2.5rem}.hs-pt-lg{padding-top:5rem}
.hs-pb-none{padding-bottom:0}.hs-pb-sm{padding-bottom:1rem}.hs-pb-md{padding-bottom:2.5rem}.hs-pb-lg{padding-bottom:5rem}
.hs-ta-left{text-align:left}.hs-ta-center{text-align:center}.hs-ta-right{text-align:right}
.hs-styled.hs-bg-dark .hs-text p,.hs-styled.hs-bg-dark .hs-text li,.hs-styled.hs-bg-dark .hs-text strong,.hs-styled.hs-bg-dark h2,.hs-styled.hs-bg-dark h1{color:#f5f5f5}
.hs-styled.hs-bg-accent .hs-text p,.hs-styled.hs-bg-accent .hs-text li,.hs-styled.hs-bg-primary .hs-text p,.hs-styled.hs-bg-primary .hs-text li,.hs-styled.hs-bg-primary h2{color:inherit}

/* Ảnh dọc và các mục chữ */
.hs-isec-grid{display:grid;gap:clamp(1.25rem,3vw,3rem);grid-template-columns:1fr}
@media(min-width:56rem){.hs-isec-grid{grid-template-columns:5fr 7fr;align-items:stretch}}
.hs-isec-img{position:relative;border-radius:var(--hs-radius);overflow:hidden;min-height:20rem;background:#2a2a2d;color:#fff;display:flex;align-items:center}
.hs-isec-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hs-isec-img::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(17,17,17,.15),rgba(17,17,17,.7))}
.hs-isec-img h2{position:relative;z-index:1;margin:0;padding:0 clamp(1.5rem,3vw,2.5rem);color:#fff;font-size:clamp(2rem,3.4vw,2.8rem);line-height:1.1}
.hs-isec-item{padding:clamp(1.25rem,2.5vw,2rem) 0}.hs-isec-item:first-child{padding-top:0}.hs-isec-item+.hs-isec-item{border-top:1px solid var(--hs-border)}
.hs-isec-item h3{margin:0 0 1rem;font-size:1rem;letter-spacing:.04em;text-transform:uppercase;color:var(--hs-accent)}

/* Cỡ chữ, viền, bo góc, bóng, hiệu ứng từng khối */
.hs-fs-sm{zoom:.9}.hs-fs-lg{zoom:1.15}.hs-fs-xl{zoom:1.3}
.hs-bd-thin{border:1px solid var(--hs-border)}.hs-bd-accent{border:2px solid var(--hs-accent)}.hs-bd-thick{border:4px solid var(--hs-text)}
.hs-rd-none{border-radius:0}.hs-rd-md{border-radius:var(--hs-radius);overflow:hidden}.hs-rd-lg{border-radius:calc(var(--hs-radius)*3);overflow:hidden}
.hs-sh-sm{box-shadow:0 1px 5px rgba(0,0,0,.16)}.hs-sh-md{box-shadow:0 10px 28px -12px rgba(0,0,0,.35)}
.hs-hv-lift,.hs-hv-grow{transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.hs-hv-lift:hover{transform:translateY(-4px);box-shadow:0 14px 30px -14px rgba(0,0,0,.4)}.hs-hv-grow:hover{transform:scale(1.02)}
@keyframes hs-fade{from{opacity:0}to{opacity:1}}
@keyframes hs-up{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
@keyframes hs-zoom{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:no-preference){@supports(animation-timeline:view()){
.hs-an-fade,.hs-an-up,.hs-an-zoom{animation-timing-function:cubic-bezier(.16,1,.3,1);animation-fill-mode:both;animation-timeline:view();animation-range:entry 0% entry 40%}
.hs-an-fade{animation-name:hs-fade}.hs-an-up{animation-name:hs-up}.hs-an-zoom{animation-name:hs-zoom}}}
@media(max-width:39.99rem){.hs-hide-m{display:none}}
@media(min-width:40rem) and (max-width:63.99rem){.hs-hide-t{display:none}}
@media(min-width:64rem){.hs-hide-d{display:none}}
@media(prefers-reduced-motion:reduce){.hs-hv-lift,.hs-hv-grow{transition:none}.hs-hv-lift:hover,.hs-hv-grow:hover{transform:none}}
`
