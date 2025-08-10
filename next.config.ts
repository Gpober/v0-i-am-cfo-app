/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["ijeuusvwqcnljctkvjdi.supabase.co", "lh3.googleusercontent.com"],
  },
  // Ensure build outputs go to correct locations
  distDir: ".next",
  // Prevent creation of root-level directories
  experimental: {
    outputFileTracingRoot: process.cwd(),
  },
}

module.exports = nextConfig
