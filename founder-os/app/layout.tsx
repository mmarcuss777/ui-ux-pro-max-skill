import type { Metadata } from "next"
import { Inter } from "next/font/google"

import { LocaleProvider } from "@/components/locale-provider"
import { getLocale } from "@/lib/i18n-server"
import "./globals.css"

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Nexa",
  description: "Momentum, measured. The personal operating system for a solo founder.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = getLocale()

  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans`}>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  )
}
