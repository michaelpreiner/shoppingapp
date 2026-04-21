import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Shopping Liste',
  description: 'Smart Shopping List with Voice Control',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png?v=2',
    apple: '/apple-touch-icon.png?v=2',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shopping',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2" />
      </head>
      <body>{children}</body>
    </html>
  )
}
