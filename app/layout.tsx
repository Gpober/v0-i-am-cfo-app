import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "I AM CFO - Financial Dashboard",
  description: "Comprehensive financial management dashboard",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
