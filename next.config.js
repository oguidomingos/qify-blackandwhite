/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is enabled by default in Next.js 14
  typescript: {
    // Temporarily ignore build errors during type checking
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig