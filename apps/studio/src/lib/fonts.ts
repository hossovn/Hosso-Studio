import { Barlow, Be_Vietnam_Pro, Chakra_Petch, JetBrains_Mono } from 'next/font/google'

// Mọi font đều có subset tiếng Việt. Khai báo ở đây, quản trị viên chọn trong admin (xem FONTS ở blocks).
// next/font đòi giá trị tĩnh nên không dùng spread. Chỉ font mặc định (Be Vietnam Pro) được preload; font khác tải khi theme dùng đến.
const be = Be_Vietnam_Pro({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '700'], variable: '--font-be-vietnam-pro' })
const barlow = Barlow({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['600', '700'], variable: '--font-barlow', preload: false })
const mono = JetBrains_Mono({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '700'], variable: '--font-jetbrains-mono', preload: false })

const chakra = Chakra_Petch({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-chakra-petch', preload: false })

export const fontClassNames = [be, barlow, mono, chakra].map((f) => f.variable).join(' ')
