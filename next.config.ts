/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'ijeuusvwqcnljctkvjdi.supabase.co', // Your Supabase domain
      'lh3.googleusercontent.com' // If using Google auth
    ],
  },
  experimental: {
    serverActions: true, // If using Next.js server actions
  },
  logging: {
    fetches: {
      fullUrl: true, // Helps debug Supabase API calls
    },
  }
}

module.exports = nextConfig
