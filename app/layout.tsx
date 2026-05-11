import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WVS Finance',
  description:
    'Research lab designing permissionless convex-hedge instruments for frontier markets',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es-CO" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
