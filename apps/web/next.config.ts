import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@nexus-core/shared'],
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
}

export default nextConfig
