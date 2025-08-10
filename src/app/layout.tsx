import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import ClientRootLayout from "./ClientRootLayout"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IAM CFO - Financial Dashboard",
  description: "Comprehensive financial management and reporting dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientRootLayout children={children} />
      </body>
    </html>
  )
}
