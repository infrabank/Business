import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.llmcost.app'

export const metadata: Metadata = {
  title: {
    default: 'LLM Cost Manager - Track & Optimize Your AI Spending',
    template: '%s | LLM Cost Manager',
  },
  description: 'One dashboard for all your LLM API costs. Track OpenAI, Anthropic, and Google AI spending. Smart proxy with caching, model routing, and budget alerts.',
  keywords: ['LLM', 'AI cost management', 'OpenAI', 'Anthropic', 'Google AI', 'API proxy', 'cost optimization', 'token tracking'],
  authors: [{ name: 'LLM Cost Manager' }],
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: APP_URL,
    siteName: 'LLM Cost Manager',
    title: 'LLM Cost Manager - Track & Optimize Your AI Spending',
    description: 'One dashboard for all your LLM API costs. Smart proxy with caching, model routing, and budget alerts.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Cost Manager',
    description: 'One dashboard for all your LLM API costs. Smart proxy with caching, model routing, and budget alerts.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
