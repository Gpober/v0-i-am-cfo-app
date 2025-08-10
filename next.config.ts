/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'ijeuusvwqcnljctkvjdi.supabase.co',
      'lh3.googleusercontent.com'
    ],
  }
  // Removed experimental and logging sections
}

module.exports = nextConfig
