import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TeamChat AI',
  description: 'Real-time team chat with AI assistant',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen">{children}</body>
    </html>
  )
}
