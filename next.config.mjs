/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "jimp", "pdf-lib", "bcryptjs"],
  },
};

export default nextConfig;