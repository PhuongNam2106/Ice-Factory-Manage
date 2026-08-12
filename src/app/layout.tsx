import { SerwistProvider } from '@serwist/turbopack/react'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quản lý xưởng nước đá',
  description: 'Ứng dụng quản lý vận hành xưởng nước đá theo đơn vị bao.',
  applicationName: 'Quản lý xưởng nước đá',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#075985',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  )
}
