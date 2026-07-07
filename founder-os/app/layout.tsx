import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import { LocaleProvider } from "@/components/locale-provider"
import { SwRegister } from "@/components/sw-register"
import { getLocale } from "@/lib/i18n-server"
import "./globals.css"

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Nexa",
  description: "Momentum, measured. The personal operating system for a solo founder.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nexa",
  },
}

export const viewport: Viewport = {
  themeColor: "#FCFBF7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // On-screen keyboard resizes the layout instead of floating over it,
  // so the fixed dock never hovers mid-screen while typing (Android).
  interactiveWidget: "resizes-content",
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
        <SwRegister />
      </body>
    </html>
  )
}
