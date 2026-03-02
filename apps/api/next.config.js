/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CRITICAL: Enables Docker deployment for AWS migration
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
