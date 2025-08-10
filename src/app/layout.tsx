import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import ClientRootLayout from "./ClientRootLayout"

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
      <body>
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  )
}
