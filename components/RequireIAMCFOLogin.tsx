"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function RequireIAMCFOLogin({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user has the IAMCFO_LOGIN file/token
    const checkAuth = () => {
      const iamcfoLogin = localStorage.getItem("IAMCFO_LOGIN")
      if (iamcfoLogin) {
        setIsAuthenticated(true)
      } else {
        router.push("/login")
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
