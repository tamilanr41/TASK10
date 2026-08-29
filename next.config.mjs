/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "jimp", "pdf-lib", "bcryptjs"],
  },
};

export default nextConfig;