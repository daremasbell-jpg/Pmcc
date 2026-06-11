/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase serverless function timeout to 120s (Vercel Pro allows 300s)
  serverRuntimeConfig: {
    functionTimeout: 120,
  },
  // Disable static optimization for API routes
  output: 'standalone',
};
module.exports = nextConfig;
