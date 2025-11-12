/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.NODE_ENV === 'production' ? '/coooool.github.io' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/coooool.github.io' : '',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

module.exports = nextConfig

