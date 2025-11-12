import type { Metadata } from 'next'
import localFont from 'next/font/local'
import '@fontsource/fira-code'
import './globals.css'
import FloatingBar from '@/components/FloatingBar'

const appleSDGothicNeo = localFont({
  src: [
    {
      path: '../assets/fonts/AppleSDGothicNeo-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../assets/fonts/AppleSDGothicNeo-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/AppleSDGothicNeo-SemiBold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../assets/fonts/AppleSDGothicNeo-Bold.woff2',
      weight: '700',
      style: 'weight',
    },
    {
      path: '../assets/fonts/AppleSDGothicNeo-ExtraBold.woff2',
      weight: '800',
      style: 'weight',
    },
    {
      path: '../assets/fonts/AppleSDGothicNeo-Black.woff2',
      weight: '900',
      style: 'weight',
    },
  ],
  variable: '--font-apple-sd-gothic-neo',
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Cool Blog',
  description: 'Notion 기반 기술 블로그',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={appleSDGothicNeo.variable}>
      <body>
        <FloatingBar />
        {children}
      </body>
    </html>
  )
}

