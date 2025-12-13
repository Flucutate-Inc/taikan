/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parseを外部化（Node.js専用ライブラリのため）
      config.externals = config.externals || [];
      config.externals.push('pdf-parse');
    }
    return config;
  },
}

module.exports = nextConfig


