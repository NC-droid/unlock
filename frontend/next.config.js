/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Azure Static Web Apps
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
  // Environment variables exposed to browser (NEXT_PUBLIC_ prefix)
  env: {
    NEXT_PUBLIC_API_URL:          process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_AZURE_CLIENT_ID:  process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    NEXT_PUBLIC_AZURE_TENANT_ID:  process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
    NEXT_PUBLIC_AZURE_TENANT_NAME: process.env.NEXT_PUBLIC_AZURE_TENANT_NAME,
    NEXT_PUBLIC_REDIRECT_URI:     process.env.NEXT_PUBLIC_REDIRECT_URI,
  },
};

module.exports = nextConfig;
