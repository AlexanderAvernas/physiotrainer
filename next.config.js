/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      appDir: true,
    },
    images: {
      domains: ['your-supabase-project.supabase.co'],
    },
  }

  module.exports = nextConfig
