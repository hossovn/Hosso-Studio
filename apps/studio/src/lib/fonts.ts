import { Barlow, Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google'

// Mọi font đều có subset tiếng Việt. Khai báo ở đây, quản trị viên chọn trong admin (xem FONTS ở blocks).
// next/font đòi giá trị tĩnh nên không dùng spread.
const be = Be_Vietnam_Pro({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '600', '700'], variable: '--font-be-vietnam-pro' })
const barlow = Barlow({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '600', '700'], variable: '--font-barlow' })
const mono = JetBrains_Mono({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '700'], variable: '--font-jetbrains-mono' })

export const fontClassNames = [be, barlow, mono].map((f) => f.variable).join(' ')
