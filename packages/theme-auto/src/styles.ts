import { hsContentCss } from '@hosso/studio-blocks'

// Nội dung dùng chung từ blocks; phần dưới là header/footer riêng của theme (tiền tố ta-).
export const css =
  hsContentCss +
  `
.ta-wrap{max-width:76rem;margin:0 auto;padding:0 var(--hs-space)}
.ta-header{position:sticky;top:0;z-index:20}
.ta-announce{background:var(--hs-dark);color:#fff;text-align:center;font-size:.78rem;font-weight:600;padding:.35rem var(--hs-space);border-bottom:1px solid #27272a}
.ta-top{background:var(--hs-dark);color:#fff}
.ta-top-row{display:flex;align-items:center;gap:var(--hs-space);min-height:4.2rem;flex-wrap:wrap;padding-block:.35rem}
.ta-brand{flex-shrink:0;font-family:var(--hs-font-heading);font-weight:800;font-size:1.25rem;letter-spacing:.02em;color:#fff!important;text-decoration:none;display:inline-flex;align-items:center;text-transform:uppercase}
.ta-brand img{display:block;height:2.6rem;width:auto;max-width:12rem}
.ta-tools{margin-left:auto;display:flex;align-items:center;gap:1rem;position:relative}
.ta-actions{display:flex;align-items:center;gap:1rem;flex-wrap:nowrap}.ta-actions>*{display:inline-flex;align-items:center;gap:.5rem}
.ta-actions a{color:#fff;font-weight:700;text-decoration:none;white-space:nowrap;font-size:.85rem;display:inline-flex;align-items:center;opacity:.9;transition:color .15s,opacity .15s}
.ta-actions a:hover{color:var(--hs-accent);opacity:1}
.ta-actions sup{background:var(--hs-accent);color:var(--hs-on-accent);border-radius:999px;font-size:.65rem;line-height:1;padding:.2rem .4rem;margin-left:.15rem;position:relative;top:-.5rem}
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
.ta-nav{order:3;flex:1 1 100%;min-width:0;border-top:1px solid #27272a;margin-top:.1rem}
.ta-nav-toggle{display:none}
.ta-nav-list{display:flex;justify-content:flex-start;flex-wrap:wrap;background:none;padding:0;margin:0;gap:.5rem}
.ta-nav-list>li{position:relative}
.ta-nav-list>li>a{padding:.7rem .7rem;text-transform:uppercase;font-size:.78rem;font-weight:700;letter-spacing:0;border-bottom:2px solid transparent}
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

/* nâng cấp giao diện: tiêu đề, danh mục, slider, chuyển động nhẹ */
main h2{font-size:clamp(1.6rem,2.6vw,2.2rem);line-height:1.15;letter-spacing:-.02em;font-weight:800;margin:0 0 1.5rem;text-align:left}
main h2::after{content:'';display:block;width:2.75rem;height:4px;margin-top:.7rem;background:var(--hs-accent);border-radius:2px}
main h2.ss-center{text-align:center}main h2.ss-center::after{margin-inline:auto}main h2::after{width:2.75rem!important}
main .ss-slider{max-width:92rem;width:calc(100% - 2*var(--hs-space));margin:clamp(1.25rem,3vw,2.25rem) auto 0;border-radius:calc(var(--hs-radius)*2);overflow:hidden;box-shadow:0 18px 40px -22px rgba(17,17,17,.45)}
.ss-slider-dots{bottom:1rem}
.ss-slider-dots button{width:.5rem;height:.5rem;background:rgba(255,255,255,.65);transition:width .25s,background .25s}
.ss-slider-dots button[aria-current=true]{width:1.6rem;border-radius:999px;background:var(--hs-accent)}
.ss-cats{gap:1rem;align-items:stretch}.ss-cats li{display:flex}.ss-cats a{flex:1;align-content:start}
.ss-cats a{position:relative;background:var(--hs-surface);border:1px solid transparent;border-radius:calc(var(--hs-radius)*2);padding:1.1rem .6rem 1rem;font-size:.9rem;font-weight:700;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,border-color .25s,background .25s}
.ss-cats a::after{content:'';position:absolute;left:1.25rem;right:1.25rem;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--hs-accent);transform:scaleX(0);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.ss-cats a:hover{transform:translateY(-4px);background:var(--hs-bg);border-color:var(--hs-border);box-shadow:0 14px 26px -16px rgba(17,17,17,.35);color:var(--hs-text)}
.ss-cats a:hover::after{transform:scaleX(1)}
.ss-cats img,.ss-cat-ph{max-width:8rem;background:transparent;mix-blend-mode:multiply}
.hs-text p{max-width:62ch;color:var(--hs-muted);line-height:1.7}
.ta-nav-list>li>a{transition:color .15s,border-color .15s}
.ta-cat summary{letter-spacing:.01em}
.ta-footer{border-top:4px solid var(--hs-accent)}
@media(prefers-reduced-motion:no-preference){@supports(animation-timeline:view()){
.ss-cats li,main .hs-section .hs-wrap,main .sp-section .sp-wrap{animation:ta-rise both cubic-bezier(.16,1,.3,1);animation-timeline:view();animation-range:entry 0% entry 35%}
@keyframes ta-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}}}

/* mọi trang: banner tiêu đề, văn bản, biểu mẫu, nút, thẻ sản phẩm và bài viết */
.hs-hero:not(.has-image){background:radial-gradient(52rem 20rem at 88% -30%,rgba(245,163,26,.2),transparent 62%),#111;color:#fff;padding:clamp(2.5rem,7vw,5rem) 0;border-bottom:4px solid var(--hs-accent)}
.hs-hero:not(.has-image) h1{color:#fff;font-size:clamp(2rem,4.6vw,3.4rem);line-height:1.08;letter-spacing:-.03em;font-weight:800;max-width:22ch;margin:0 0 .9rem}
.hs-hero:not(.has-image) h1::after{content:'';display:block;width:3.25rem;height:4px;margin-top:1rem;background:var(--hs-accent);border-radius:2px}
.hs-hero:not(.has-image) p{color:#d4d4d8;font-size:clamp(1rem,1.5vw,1.2rem);line-height:1.6;max-width:40rem}
.hs-wrap{max-width:72rem}
.hs-text{max-width:46rem;font-size:1.0625rem;line-height:1.8}.hs-text p{color:#3f3f46}.hs-text strong{color:var(--hs-text)}
.hs-text h2{margin-top:2.25rem}
.hs-section+.hs-section{border-top:1px solid var(--hs-border)}
main :focus-visible{outline:2px solid var(--hs-accent);outline-offset:3px;border-radius:4px}
.ss-btn,.sp-btn{padding:.8rem 1.6rem;font-weight:700;border-radius:var(--hs-radius);transition:transform .2s cubic-bezier(.16,1,.3,1),box-shadow .2s,filter .2s}
.ss-btn:hover,.sp-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 20px -12px rgba(17,17,17,.55);filter:brightness(1.06)}
.ss-btn:active,.sp-btn:active:not(:disabled){transform:scale(.98);box-shadow:none}
.ss-form,.sp-form{gap:1.1rem}
.ss-form input:not([type=checkbox]),.ss-form textarea,.ss-form select,.sp-form input:not([type=radio]),.sp-form textarea,.sp-filters input,.sp-filters select{padding:.8rem 1rem;border:1px solid #d4d4d8;background:#fff;transition:border-color .15s,box-shadow .15s}
.ss-form input:focus,.ss-form textarea:focus,.ss-form select:focus,.sp-form input:focus,.sp-form textarea:focus,.sp-filters input:focus,.sp-filters select:focus{outline:0;border-color:var(--hs-accent);box-shadow:0 0 0 3px rgba(245,163,26,.28)}
.ss-form{max-width:38rem;padding:clamp(1.25rem,3vw,2rem);background:var(--hs-surface);border-radius:calc(var(--hs-radius)*2)}
.sp-filters{background:var(--hs-surface);border-color:transparent;border-radius:calc(var(--hs-radius)*2);padding:1rem 1.1rem}
.sp-note{text-align:center;padding:2.5rem 1rem;border:1px dashed #d4d4d8;border-radius:calc(var(--hs-radius)*2);background:var(--hs-surface)}
.sp-grid{gap:1.1rem}
.sp-card{border-color:transparent;background:var(--hs-surface);border-radius:calc(var(--hs-radius)*2);padding:.9rem;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,background .25s}
.sp-card:hover{transform:translateY(-4px);background:var(--hs-bg);box-shadow:0 16px 28px -18px rgba(17,17,17,.4);border-color:var(--hs-border)}
.sp-card h3{font-size:1rem;font-weight:700}.sp-price{font-size:1.1rem;color:var(--hs-text)}.sp-price-lg{font-size:1.9rem;color:var(--hs-primary)}
.sp-cats{gap:1rem}.sp-cats a{background:var(--hs-surface);border-color:transparent;border-radius:calc(var(--hs-radius)*2);font-weight:700;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s,background .25s}
.sp-cats a:hover{transform:translateY(-4px);background:var(--hs-bg);box-shadow:0 14px 26px -16px rgba(17,17,17,.35)}
.sp-cats img,.sp-cat-ph{background:transparent;mix-blend-mode:multiply}
.sp-cart li,.sp-detail-img{border-radius:calc(var(--hs-radius)*2)}
.ss-post-card{border-color:transparent;background:var(--hs-surface);border-radius:calc(var(--hs-radius)*2);transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.ss-post-card img{transition:transform .5s cubic-bezier(.16,1,.3,1)}
.ss-post-card:hover{transform:translateY(-4px);box-shadow:0 16px 28px -18px rgba(17,17,17,.4)}.ss-post-card:hover img{transform:scale(1.04)}
.ss-post-card{overflow:hidden}
.ss-article-head h1{letter-spacing:-.03em;font-weight:800}
.ss-crumbs{padding-top:1.25rem}
@media(prefers-reduced-motion:no-preference){
@keyframes ta-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.hs-hero h1,.hs-hero p{animation:ta-in .7s both cubic-bezier(.16,1,.3,1)}.hs-hero p{animation-delay:.08s}}
@media(prefers-reduced-motion:reduce){.ss-btn,.sp-btn,.sp-card,.ss-post-card,.ss-cats a,.sp-cats a{transition:none}.ss-post-card:hover img{transform:none}}

/* trang Về chúng tôi: nền xen kẽ, thẻ giá trị */
.hs-hero~.hs-section:nth-of-type(odd){background:var(--hs-surface);border-top:0}
.hs-hero~.hs-section+.hs-section{border-top:0}
.hs-grid{gap:1.25rem}
@media(min-width:60rem){.hs-grid:has(>.hs-card:nth-child(4)){grid-template-columns:repeat(4,1fr)}}
.hs-card{position:relative;background:var(--hs-bg);border:1px solid var(--hs-border);border-top:3px solid var(--hs-accent);border-radius:calc(var(--hs-radius)*2);padding:1.5rem;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.hs-card:hover{transform:translateY(-4px);box-shadow:0 16px 28px -18px rgba(17,17,17,.4)}
.hs-card h3{font-size:1.1rem;font-weight:800;margin:0 0 .6rem;letter-spacing:-.01em}.hs-card p{line-height:1.65}
@media(prefers-reduced-motion:reduce){.hs-card{transition:none}}

@media(min-width:56rem){.hs-hero~.hs-section .hs-text{max-width:none;display:grid;grid-template-columns:minmax(11rem,1fr) 2.4fr;column-gap:clamp(2rem,5vw,4.5rem);align-items:start}
.hs-hero~.hs-section .hs-text>h2{grid-column:1;grid-row:1/span 6;position:sticky;top:7rem;margin:0}
.hs-hero~.hs-section .hs-text>p{grid-column:2;max-width:46rem}}



/* chân trang sáng, bốn cột */
.ta-footer{background:var(--hs-bg);color:var(--hs-text);border-top:1px solid var(--hs-border);padding:clamp(2.5rem,5vw,4rem) 0 1.75rem;margin-top:calc(var(--hs-space)*2)}
.ta-footer a{color:inherit;text-decoration:none}.ta-footer a:hover{color:var(--hs-primary)}
.ta-footer h2{font-size:1.05rem;font-weight:800;color:var(--hs-text);margin:0 0 1rem;letter-spacing:-.01em}
.ta-footer h2::after{display:none}
.ta-footer-grid{grid-template-columns:1fr;gap:2rem}
@media(min-width:48rem){.ta-footer-grid{grid-template-columns:1fr 1fr}}
@media(min-width:64rem){.ta-footer-grid{grid-template-columns:1.5fr 1fr 1.4fr .8fr;gap:2.5rem}}
.ta-footer-name{display:block;color:var(--hs-text);font-size:1rem;margin-bottom:.5rem}
.ta-legal{color:var(--hs-muted);line-height:1.7;margin:0}
.ta-footer-links{gap:.2rem}.ta-footer-links a{display:inline-block;padding:.35rem 0;color:var(--hs-muted);transition:color .15s,transform .2s}.ta-footer-links a:hover{transform:translateX(3px)}
.ta-footer-contact{gap:.9rem}.ta-footer-contact li{display:grid;grid-template-columns:1.25rem 1fr;gap:.75rem;align-items:start;color:var(--hs-muted);line-height:1.55}
.ta-footer-contact svg{color:var(--hs-accent);margin-top:.15rem;flex:none}
.ta-copy{display:block;text-align:center;margin-top:2.25rem;padding-top:1.25rem;border-top:1px solid var(--hs-border);color:var(--hs-muted);opacity:1}

@media(max-width:47.99rem){.ta-float{grid-auto-flow:column;gap:.5rem;right:.75rem;bottom:.75rem}.ta-float a{width:2.6rem;height:2.6rem;font-size:.95rem;box-shadow:0 3px 10px rgba(0,0,0,.3)}.ta-footer{padding-bottom:5rem}}

@media(max-width:47.99rem){.ta-header{position:static}.ta-top-row{min-height:3.4rem;gap:.5rem 1rem}}



.hs-text ul{list-style:none;margin:0 0 1em;padding:0;display:grid;gap:.7rem}
.hs-text li{position:relative;padding-left:1.4rem;line-height:1.7;color:#3f3f46}
.hs-text li::before{content:'';position:absolute;left:0;top:.7em;width:.5rem;height:.5rem;border-radius:50%;background:var(--hs-accent)}
@media(min-width:56rem){.hs-hero~.hs-section .hs-text>ul{grid-column:2;max-width:46rem}}

/* bám giao diện thanhcuongauto.com: header một hàng, thẻ trắng ảnh lớn, tiêu đề chữ hoa mảnh */
@media(min-width:56rem){
.ta-top-row{flex-wrap:nowrap;min-height:4.4rem;padding-block:0}
.ta-nav{order:0;flex:1 1 0;border-top:0;margin-top:0}
.ta-nav-list{justify-content:center;gap:.1rem}
.ta-nav-list>li>a{padding:1.6rem .8rem;font-size:.8rem;border-bottom:3px solid transparent}
.ta-nav-list>li>a:hover{border-bottom-color:var(--hs-accent)}}
main .ss-section h2,main .sp-section h2{text-align:center;text-transform:uppercase;font-weight:400;font-size:clamp(1.5rem,2.6vw,2rem);letter-spacing:.01em;margin:0 0 1.75rem}
main .ss-section h2::after,main .sp-section h2::after{display:none}
main .ss-section{padding-block:clamp(1.75rem,3vw,2.75rem)}
main .ss-slider{max-width:76rem;width:calc(100% - 2*var(--hs-space));border-radius:4px;box-shadow:none;margin-top:1rem}
.ss-cats{gap:1rem}
.ss-cats a{background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:0 0 1rem;box-shadow:0 1px 3px rgba(17,17,17,.05);overflow:hidden;gap:.85rem;font-weight:600;font-size:.88rem}
.ss-cats a::after{display:none}
.ss-cats img,.ss-cat-ph{width:100%;max-width:none;aspect-ratio:1;object-fit:cover;border-radius:0;mix-blend-mode:normal;background:#f5f5f5}
.ss-cats a>span:last-child{padding-inline:.5rem}
.ss-cats a:hover{transform:translateY(-3px);box-shadow:0 10px 24px -10px rgba(17,17,17,.28);border-color:#d4d4d8;background:#fff}
.sp-grid{gap:1.1rem}
.sp-card{background:#fff;border:1px solid #ececec;border-radius:6px;padding:0 0 1rem;box-shadow:0 1px 4px rgba(17,17,17,.06);overflow:hidden;gap:.45rem}
.sp-card>*:not(.sp-card-img){padding-inline:.9rem}
.sp-card-img{border-radius:0;aspect-ratio:1;background:#fff}
.sp-card:hover{transform:translateY(-3px);box-shadow:0 12px 26px -12px rgba(17,17,17,.3);background:#fff}
.sp-price{color:var(--hs-primary)}
.sp-cats a{background:#fff;border:1px solid #e5e5e5;border-radius:6px;box-shadow:0 1px 3px rgba(17,17,17,.05);padding:0 0 1rem;overflow:hidden}
.sp-cats img,.sp-cat-ph{aspect-ratio:1;object-fit:cover;mix-blend-mode:normal;background:#f5f5f5}

/* chữ và thẻ sản phẩm theo thanhcuongauto.com (Chakra Petch) */
main .ss-section h2,main .sp-section h2{font-weight:500;font-size:clamp(1.6rem,2.8vw,2.3rem);color:#222;letter-spacing:0}
.ta-nav-list>li>a,.ta-cat summary,.ta-brand{letter-spacing:.01em}
.sp-card{border:0;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.16);border-radius:3px;gap:.6rem}
.sp-card:hover{box-shadow:0 8px 22px -8px rgba(0,0,0,.28)}
.sp-card h3{font-weight:400;font-size:.92rem;line-height:1.55;color:#222}
.sp-card .sp-meta{font-size:.78rem}
.sp-price{font-weight:700}
.ss-cats a,.sp-cats a{border-radius:3px;font-weight:500}

/* CSS của plugin shop nạp sau theme nên tăng độ ưu tiên cho thẻ sản phẩm */
main .sp-card{background:#fff;border:0;border-radius:3px;padding:0 0 1rem;box-shadow:0 1px 5px rgba(0,0,0,.14)}
main .sp-card:hover{background:#fff;box-shadow:0 8px 22px -8px rgba(0,0,0,.28)}
main .sp-card-img{border-radius:0;background:#fff}
main .sp-cats a,main .sp-filters{background:#fff}
main .sp-filters{background:var(--hs-surface)}

/* chi tiết sản phẩm theo thanhcuongauto.com */
main .sp-back{font-size:.85rem;color:var(--hs-muted);text-decoration:none;margin-bottom:1.25rem}main .sp-back:hover{color:var(--hs-primary)}
main .sp-detail{gap:clamp(1.5rem,3vw,3rem);align-items:start}
@media(min-width:48rem){main .sp-detail{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)}}
main .sp-detail-img{border:1px solid #e5e5e5;border-radius:0;padding:0;background:#fff}
main .sp-detail-img img{width:100%;aspect-ratio:1;object-fit:contain}
main .sp-detail h1{font-size:clamp(1.35rem,2.2vw,1.75rem);line-height:1.3;font-weight:600;margin:0 0 .6rem;color:#222}
main .sp-price-lg{font-size:1.9rem;font-weight:700;color:var(--hs-primary);margin:.4rem 0 1rem;padding-bottom:1rem;border-bottom:1px solid #eee}
main .sp-spec{grid-template-columns:max-content 1fr;gap:.55rem 1.25rem;margin:0 0 1.25rem;padding-bottom:1rem;border-bottom:1px solid #eee;font-size:.9rem}
main .sp-spec dt{color:var(--hs-muted)}main .sp-spec dd{color:#222}main .sp-spec a{color:var(--hs-primary);text-decoration:none}
main .sp-add .sp-btn{padding:.95rem 2rem;font-size:1rem;text-transform:uppercase;letter-spacing:.03em;border-radius:3px}
main .sp-tabs{margin-top:2.5rem;border-top:1px solid #e5e5e5}
main .sp-tabs h2{display:inline-block;margin:0 0 1.25rem;padding:.9rem 0;font-size:.95rem;font-weight:600;letter-spacing:.04em;border-bottom:2px solid #222}
main .sp-tabs p{line-height:1.8;color:#3f3f46;max-width:60rem}
main .sp-section:has(.sp-detail) h2:not(.sp-tabs h2){text-align:left;text-transform:uppercase;font-size:1.1rem;font-weight:600;letter-spacing:.03em;margin:2.5rem 0 1.25rem}

/* tab Mô tả / Thông tin bổ sung (radio, không cần JS) */
main .sp-tabset{margin-top:2.5rem;border-top:1px solid #e5e5e5;display:flex;flex-wrap:wrap;gap:0 1.75rem}
main .sp-tabset>input{position:absolute;opacity:0;pointer-events:none}
main .sp-tabset>label{padding:.95rem 0;font-size:.9rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--hs-muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s}
main .sp-tabset>label:hover{color:#222}
main .sp-tabset>input:checked+label{color:#222;border-bottom-color:#222}
main .sp-tabset>input:focus-visible+label{outline:2px solid var(--hs-accent);outline-offset:3px}
main .sp-tabset .sp-panel{display:none;flex:1 0 100%;padding:1.25rem 0 0}
main .sp-tabset>#sp-tab-desc:checked~.sp-panel-desc,main .sp-tabset>#sp-tab-info:checked~.sp-panel-info{display:block}
main .sp-tabset .sp-panel p{line-height:1.8;color:#3f3f46;max-width:60rem;margin:0}
main .sp-info{width:100%;border-collapse:collapse}
main .sp-info th,main .sp-info td{padding:.9rem 0;text-align:left;border-bottom:1px solid #eee;font-size:.95rem}
main .sp-info th{width:40%;font-weight:600;text-transform:uppercase;letter-spacing:.03em;font-size:.85rem;color:#222}
main .sp-info td{color:var(--hs-muted)}

/* Khối sản phẩm WIM: thẻ trắng ảnh vuông như bên shop */
@media(min-width:40rem){main .wp-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:64rem){main .wp-grid{grid-template-columns:repeat(5,1fr)}}
main .wp-grid{gap:1.1rem}
main .wp-card{background:#fff;border:0;border-radius:3px;padding:0 0 1rem;box-shadow:0 1px 5px rgba(0,0,0,.14);overflow:hidden;gap:.5rem;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
main .wp-card:hover{transform:translateY(-3px);box-shadow:0 8px 22px -8px rgba(0,0,0,.28)}
main .wp-card>*:not(.wp-img){padding-inline:.9rem}
main .wp-img{display:block;aspect-ratio:1;background:#fff;border-bottom:1px solid #f0f0f0}
main .wp-img img,main .wp-detail-img img{width:100%;height:100%;object-fit:contain;display:block}
main .wp-noimg{display:block;width:100%;height:100%;background:#f5f5f5 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23c4c4c4' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Ccircle cx='9' cy='9' r='1.5'/%3E%3Cpath d='m21 15-5-5L5 21'/%3E%3C/svg%3E") center/3.5rem no-repeat}
main .wp-card h3{font-size:.95rem;font-weight:500;line-height:1.5;color:#222}main .wp-card h3 a{text-decoration:none}main .wp-card h3 a:hover{color:var(--hs-primary)}
main .wp-price{font-size:1.1rem}
main .wp-detail{display:grid;gap:.75rem;grid-template-columns:1fr}
@media(min-width:48rem){main .wp-detail{grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:3rem;align-items:start}main .wp-detail>.wp-detail-img{grid-row:1/span 8}main .wp-detail>*:not(.wp-detail-img){grid-column:2}}
main .wp-detail-img{aspect-ratio:1;border:1px solid #e5e5e5;background:#fff}
main .wp-detail h1{font-size:clamp(1.35rem,2.2vw,1.75rem);font-weight:600;line-height:1.3;margin:0}
main .wp-price-lg{font-size:1.9rem;padding-bottom:1rem;border-bottom:1px solid #eee}

/* Trang danh sách sản phẩm WIM: cột danh mục bên trái, thanh lọc phía trên, lưới 4 cột */
main .wp-shop{display:grid;gap:1.5rem;grid-template-columns:1fr}
@media(min-width:56rem){main .wp-shop{grid-template-columns:15rem minmax(0,1fr);gap:2rem}}
main .wp-side h2{font-size:1rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em;text-align:left;margin:0 0 .75rem}main .wp-side h2::after{display:none}
main .wp-side ul{list-style:none;margin:0;padding:0;display:grid}
main .wp-side a{display:block;padding:.65rem .25rem;border-bottom:1px solid #eee;color:#222;text-decoration:none;transition:color .15s,padding .2s}
main .wp-side a:hover{color:var(--hs-primary);padding-left:.6rem}
main .wp-side a[aria-current=page]{color:var(--hs-primary);font-weight:700;border-left:3px solid var(--hs-accent);padding-left:.7rem}
main .wp-bar{display:flex;flex-wrap:wrap;gap:.75rem 1rem;align-items:center;justify-content:space-between;margin-bottom:1.25rem}
main .wp-crumbs{font-size:1.05rem;text-transform:uppercase;color:var(--hs-muted)}main .wp-crumbs a{color:inherit;text-decoration:none}main .wp-crumbs a:hover{color:var(--hs-primary)}main .wp-crumbs strong{color:#222;font-weight:600}
main .wp-sortform{display:flex;gap:.5rem;flex-wrap:wrap}
main .wp-sortform select{font:inherit;padding:.6rem .8rem;border:1px solid #d4d4d8;border-radius:3px;background:#fff;min-width:11rem}
main .wp-sortform select:focus{outline:0;border-color:var(--hs-accent);box-shadow:0 0 0 3px rgba(245,163,26,.28)}
main .wp-sortform button{font:inherit;font-weight:600;padding:.6rem 1.1rem;border:0;border-radius:3px;background:#222;color:#fff;cursor:pointer}main .wp-sortform button:hover{background:var(--hs-primary)}
@media(min-width:64rem){main .wp-shop .wp-grid{grid-template-columns:repeat(4,1fr)}}
main .wp-shop .wp-meta{display:none}

/* Chi tiết sản phẩm WIM: thư viện ảnh, chính sách, chia sẻ, tab, sản phẩm tương tự; thẻ đổi ảnh khi rê chuột */
main .wp-img{position:relative;overflow:hidden}
main .wp-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transition:opacity .35s}
main .wp-img .wp-img-2{opacity:0}
main .wp-card:hover .wp-img .wp-img-2{opacity:1}
main .wp-noimg{position:absolute;inset:0}
main .wp-detail-img{border:0;background:none}
main .wp-gallery-main{position:relative;aspect-ratio:1;border:1px solid #e5e5e5;background:#fff;overflow:hidden}
main .wp-gallery-main img{width:100%;height:100%;object-fit:contain;display:block}
main .wp-gal-btn{position:absolute;top:50%;transform:translateY(-50%);width:2.4rem;height:2.4rem;border:0;border-radius:50%;background:rgba(255,255,255,.9);box-shadow:0 1px 6px rgba(0,0,0,.25);font-size:1.5rem;line-height:1;cursor:pointer;color:#222;z-index:2;transition:background .15s,transform .15s}
main .wp-gal-btn:hover{background:#fff;transform:translateY(-50%) scale(1.08)}
main .wp-gal-btn.is-prev{left:.6rem}main .wp-gal-btn.is-next{right:.6rem}
main .wp-thumbs{list-style:none;margin:.75rem 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem}
main .wp-thumbs button{display:block;width:100%;aspect-ratio:1;padding:0;border:1px solid #e5e5e5;background:#fff;cursor:pointer;opacity:.7;transition:opacity .15s,border-color .15s}
main .wp-thumbs button:hover,main .wp-thumbs button[aria-current=true]{opacity:1;border-color:#222}
main .wp-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
main .wp-crumbs{font-size:.9rem;color:var(--hs-muted)}
main .wp-detail .wp-crumbs{text-transform:none}
main .wp-share{display:flex;gap:.5rem;margin:.25rem 0 .5rem}
main .wp-share-btn{width:2.3rem;height:2.3rem;display:grid;place-items:center;border:1px solid #cfcfcf;border-radius:50%;background:#fff;color:#555;font:600 .95rem/1 inherit;text-decoration:none;cursor:pointer;transition:background .15s,color .15s,border-color .15s}
main .wp-share-btn:hover{background:#222;border-color:#222;color:#fff}
main .wp-policy{margin-top:.5rem}
main .wp-policy h2{font-size:1.5rem;font-weight:500;text-align:left;text-transform:none;margin:0 0 1rem}main .wp-policy h2::after{display:none}
main .wp-policy ul{list-style:none;margin:0;padding:0;display:grid;gap:1rem}
main .wp-policy li{position:relative;padding-left:2.4rem;line-height:1.6;color:#333}
main .wp-policy li::before{content:'✓';position:absolute;left:0;top:.1rem;width:1.5rem;height:1.5rem;border-radius:50%;background:var(--hs-accent);color:#111;display:grid;place-items:center;font-size:.85rem;font-weight:700}
main .wp-tabset{margin-top:2.5rem;border-top:1px solid #e5e5e5;display:flex;flex-wrap:wrap;gap:0 1.75rem}
main .wp-tabset>input{position:absolute;opacity:0;pointer-events:none}
main .wp-tabset>label{padding:.95rem 0;font-size:.9rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--hs-muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
main .wp-tabset>label:hover{color:#222}
main .wp-tabset>input:checked+label{color:#222;border-bottom-color:#222}
main .wp-tabset>input:focus-visible+label{outline:2px solid var(--hs-accent);outline-offset:3px}
main .wp-tabset .wp-panel{display:none;flex:1 0 100%;padding:1.25rem 0 0}
main .wp-tabset>#wp-tab-desc:checked~.wp-panel-desc,main .wp-tabset>#wp-tab-info:checked~.wp-panel-info{display:block}
main .wp-tabset .wp-panel p{line-height:1.8;color:#3f3f46;max-width:60rem;margin:0}
main .wp-info{width:100%;border-collapse:collapse}
main .wp-info th,main .wp-info td{padding:.9rem 0;text-align:left;border-bottom:1px solid #eee;font-size:.95rem}
main .wp-info th{width:40%;font-weight:600;text-transform:uppercase;letter-spacing:.03em;font-size:.85rem;color:#222}main .wp-info td{color:var(--hs-muted)}
main .wp-related{margin-top:2.5rem;border-top:1px solid #e5e5e5;padding-top:2rem}
main .wp-related h2{text-align:left;text-transform:uppercase;font-size:1.1rem;font-weight:600;margin:0 0 1.25rem}main .wp-related h2::after{display:none}
main .wp-carousel{position:relative}
main .wp-carousel-track{list-style:none;margin:0;padding:.25rem .25rem 1rem;display:flex;gap:1.1rem;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
main .wp-carousel-track::-webkit-scrollbar{display:none}
main .wp-carousel-track>li{flex:0 0 calc(50% - .55rem);scroll-snap-align:start}
@media(min-width:48rem){main .wp-carousel-track>li{flex-basis:calc(25% - .83rem)}}
main .wp-carousel .wp-gal-btn{top:35%}
main .wp-detail-img .wp-noimg{position:relative;display:block;aspect-ratio:1}
`
