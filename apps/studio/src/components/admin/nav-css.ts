// CSS sidebar admin (class hn-*). Ghi đè bố cục .nav mặc định của Payload; màu nhấn lấy từ --hosso-brand.
export const navCss = `
:root{--nav-width:248px;--hn-bg:#fff;--hn-bg2:#f3f4f6;--hn-sub:#fafafa;--hn-text:#374151;--hn-dim:#6b7280;--hn-line:#e5e7eb}
html[data-hn-collapsed="true"]{--nav-width:64px}
.nav{background:var(--hn-bg)!important;color:var(--hn-text)!important;border-right:1px solid var(--hn-line)!important;padding:0!important;width:var(--nav-width)!important;overflow:visible!important}
.nav__scroll{padding:0!important;height:100%!important;overflow:hidden!important}
.nav__header{background:transparent}
.hn-wrap{height:100%;padding:0!important}
.hn{display:flex;flex-direction:column;height:100vh;position:sticky;top:0;font-size:14px;line-height:1.3}
.hn,.hn *{font-family:inherit;box-sizing:border-box}
.hn a{color:inherit;text-decoration:none}
.hn-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.hn-icon{flex-shrink:0}
.hn-brand{display:flex;align-items:center;gap:10px;padding:16px 16px 12px;color:var(--hn-text)!important}
.hn-brand img{border-radius:6px;flex-shrink:0}
.hn-brand strong{display:block;font-size:15px}.hn-brand small{color:var(--hn-dim);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.hn-search{display:flex;align-items:center;gap:8px;margin:0 12px 8px;padding:7px 10px;background:var(--hn-bg2);border-radius:8px;color:var(--hn-dim);cursor:text}
.hn-search input{flex:1;min-width:0;background:none;border:0;outline:0;color:var(--hn-text);font:inherit;padding:0}
.hn-search:focus-within{box-shadow:0 0 0 2px var(--hosso-brand)}
.hn-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:4px 0 8px;scrollbar-width:none}.hn-scroll::-webkit-scrollbar{display:none}
.hn-heading{padding:14px 18px 6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--hn-dim)}
.hn-list,.hn-sub{list-style:none;margin:0;padding:0}
.hn-empty{padding:10px 18px;color:var(--hn-dim)}
.hn-item{position:relative}
.hn-row{display:flex;align-items:center}
.hn-link{flex:1;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;margin:1px 8px;border-radius:8px;color:var(--hn-text)!important;min-width:0;border-left:0}
.hn-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.hn-link .hn-label{flex:1}
.hn-item:hover>.hn-row .hn-link,.hn-link:focus-visible{background:var(--hn-bg2);color:var(--hosso-brand)!important}
.hn-item.is-active>.hn-row .hn-link{background:color-mix(in srgb,var(--hosso-brand) 12%,#fff);color:var(--hosso-brand)!important;font-weight:600}
.hn-quick{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;margin-right:2px;color:var(--hn-dim)!important;opacity:0;transition:opacity .15s,background .15s}
.hn-item:hover .hn-quick,.hn-quick:focus-visible{opacity:1}.hn-quick:hover{background:var(--hosso-brand);color:var(--hn-text)!important}
.hn-toggle{display:grid;place-items:center;width:28px;height:28px;margin-right:8px;background:none;border:0;color:var(--hn-dim);cursor:pointer;border-radius:6px}
.hn-toggle svg{transition:transform .15s}.hn-item.is-open>.hn-row .hn-toggle svg{transform:rotate(90deg)}
.hn-badge{min-width:20px;padding:1px 6px;border-radius:999px;background:#e5e7eb;color:var(--hn-text);font-size:11px;font-weight:700;text-align:center}
.hn-badge.is-alert{background:#d63638;color:#fff}
.hn-sub{display:none;background:var(--hn-sub)}
.hn-sub-title{display:none}
.hn-item.is-open>.hn-sub{display:block}
.hn-sub a{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:7px 14px 7px 52px;color:var(--hn-dim)!important}
.hn-sub a:hover,.hn-sub a.is-active{color:var(--hn-text)!important}
.hn-sub a.is-active{font-weight:600}
.hn-foot{flex-shrink:0;border-top:1px solid var(--hn-line);padding:8px 0}
.hn-site,.hn-collapse{display:flex;align-items:center;gap:12px;width:100%;padding:9px 16px;color:var(--hn-text)!important;background:none;border:0;font:inherit;cursor:pointer;text-align:left}
.hn-site:hover,.hn-collapse:hover{color:var(--hosso-brand)!important;background:var(--hn-bg2)}
.hn-user{display:flex;align-items:center;gap:10px;padding:8px 16px}
.hn-profile{display:flex;align-items:center;gap:10px;flex:1;min-width:0;color:inherit;text-decoration:none}
.hn-avatar{width:30px;height:30px;border-radius:50%;background:var(--hosso-brand);color:#fff;display:grid;place-items:center;font-weight:700;flex-shrink:0}
.hn-user .hn-label{flex:1}.hn-user strong{display:block;color:var(--hn-text);font-size:12px;overflow:hidden;text-overflow:ellipsis}.hn-user small{color:var(--hn-dim);font-size:11px}
.hn-logout{flex-shrink:0}.hn-logout a,.hn-logout svg{color:var(--hn-dim)!important}.hn-logout .stroke{stroke:var(--hn-dim)!important}
.hn-collapse svg{transition:transform .2s}
/* Thu gọn: chỉ còn biểu tượng; mục con bung ra bên phải khi rê chuột (như WordPress) */
.hn[data-collapsed="true"] .hn-label,.hn[data-collapsed="true"] .hn-heading,.hn[data-collapsed="true"] .hn-search input,.hn[data-collapsed="true"] .hn-search span,.hn[data-collapsed="true"] .hn-toggle,.hn[data-collapsed="true"] .hn-quick,.hn[data-collapsed="true"] .hn-badge,.hn[data-collapsed="true"] .hn-logout{display:none}
.hn[data-collapsed="true"] .hn-search{justify-content:center;margin:0 8px 8px}
.hn[data-collapsed="true"] .hn-brand{justify-content:center;padding:14px 0}
.hn[data-collapsed="true"] .hn-link,.hn[data-collapsed="true"] .hn-site,.hn[data-collapsed="true"] .hn-collapse{justify-content:center;padding-left:0;padding-right:0;border-left-color:transparent}
.hn[data-collapsed="true"] .hn-collapse svg{transform:rotate(180deg)}
.hn[data-collapsed="true"] .hn-user{justify-content:center;padding:8px 0}
.hn[data-collapsed="true"] .hn-scroll{overflow:visible}
.hn[data-collapsed="true"] .hn-sub{position:absolute;left:100%;top:0;min-width:200px;border-radius:0 8px 8px 0;box-shadow:6px 6px 18px rgba(0,0,0,.15);display:none;z-index:50}
.hn[data-collapsed="true"] .hn-item:hover>.hn-sub,.hn[data-collapsed="true"] .hn-item:focus-within>.hn-sub{display:block}
.hn[data-collapsed="true"] .hn-sub-title{display:block;padding:10px 14px;color:var(--hn-text);font-weight:700;border-bottom:1px solid var(--hn-line)}
.hn[data-collapsed="true"] .hn-sub a{padding-left:14px}
/* Desktop: sidebar luôn hiện (thu gọn bằng nút riêng), bỏ nút hamburger của Payload */
@media (min-width:1025px){.nav{opacity:1!important}.nav__header{display:none}.template-default{grid-template-columns:var(--nav-width) minmax(0,1fr)!important}.hamburger,.app-header__mobile-nav-toggler,.app-header .nav-toggler{display:none}}
@media (max-width:1024px){.hn{height:100%}}
`
