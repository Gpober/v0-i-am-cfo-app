"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { approvedEmails } from "@/lib/approvedEmails"

interface RequireIAMCFOLoginProps {
  children: React.ReactNode
}

export function RequireIAMCFOLogin({ children }: RequireIAMCFOLoginProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    const savedEmail = localStorage.getItem("iamcfo_user_email")
    if (savedEmail && approvedEmails.includes(savedEmail)) {
      setIsAuthenticated(true)
      setEmail(savedEmail)
    }
    setLoading(false)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    if (!approvedEmails.includes(email)) {
      setError("Access denied. Your email is not authorized.")
      return
    }

    localStorage.setItem("iamcfo_user_email", email)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("iamcfo_user_email")
    setIsAuthenticated(false)
    setEmail("")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <span className="text-blue-600 font-bold text-xl">CF</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">I AM CFO Access</h2>
            <p className="mt-2 text-center text-sm text-gray-600">Enter your authorized email to continue</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <div className="text-red-600 text-sm text-center">{error}</div>}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Access Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">
                Logged in as: <span className="font-medium">{email}</span>
              </span>
            </div>
            <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-gray-900">
              Logout
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}
