import type { Metadata } from 'next'
import { Manrope, Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ClerkProvider } from '@clerk/nextjs'
import { AppLayout } from '@/components/layout/AppLayout'
import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-display' })
const inter = Inter({ subsets: ['latin'], variable: '--font-body' })

export const metadata: Metadata = {
  title: 'FitFamily',
  description: 'Family fitness tracking',
  manifest: '/manifest.json',
  icons: {
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages()
  return (
    <ClerkProvider>
      <html lang="en" className={`${manrope.variable} ${inter.variable}`}>
        <body>
          <NextIntlClientProvider messages={messages}>
            <AppLayout>
              {children}
            </AppLayout>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
