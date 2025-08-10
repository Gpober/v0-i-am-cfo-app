import type React from "react"
import type { Metadata } from "next"
import ClientRootLayout from "./ClientRootLayout"
import "./globals.css" // Import globals.css at the top of the file

export const metadata: Metadata = {
  title: "IAM CFO - Financial Dashboard",
  description: "Comprehensive financial management and reporting dashboard",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ClientRootLayout children={children} />
}
