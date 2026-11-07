import { Barlow, Be_Vietnam_Pro, Chakra_Petch, Inter, Manrope, Noto_Sans_KR, Plus_Jakarta_Sans } from 'next/font/google'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import styles from './fonts.module.css'

// Mọi font đều có subset tiếng Việt (và Noto Sans KR cho tiếng Hàn). Khai báo ở đây, quản trị viên chọn trong admin (xem FONTS ở blocks).
// next/font đòi giá trị tĩnh nên không dùng spread. Chỉ font mặc định (Be Vietnam Pro) được preload; font khác tải khi theme dùng đến.
const be = Be_Vietnam_Pro({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '700'], variable: '--font-be-vietnam-pro' })
const manrope = Manrope({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '500', '600', '700', '800'], variable: '--font-manrope', preload: false })
const inter = Inter({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-inter', preload: false })
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '500', '600', '700', '800'], variable: '--font-plus-jakarta-sans', preload: false })
const notoKr = Noto_Sans_KR({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-noto-sans-kr', preload: false })
const barlow = Barlow({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['600', '700'], variable: '--font-barlow', preload: false })

const chakra = Chakra_Petch({ subsets: ['vietnamese', 'latin'], display: 'swap', weight: ['400', '500', '600', '700'], variable: '--font-chakra-petch', preload: false })

export const fontClassNames = [...[be, manrope, inter, plusJakarta, notoKr, barlow, chakra].map((f) => f.variable), styles.mono].join(' ')
