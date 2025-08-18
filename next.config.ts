import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/photos/**',
      },
    ],
  },
  // Increase max body size for video uploads (5GB)
  experimental: {
    serverActions: {
      bodySizeLimit: '5gb',
    },
  },
}

export default nextConfig
