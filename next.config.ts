/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Netlify
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
  },
  // Remove experimental and logging sections completely for Netlify
}

module.exports = nextConfig
