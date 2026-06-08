import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ModeProvider } from '@/lib/context/ModeContext'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'FitFamily',
  description: 'Family fitness tracking',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ModeProvider>
            {children}
          </ModeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
