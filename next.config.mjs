/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    REPLICATE_API_KEY: process.env.REPLICATE_API_KEY,
  },

  // Prevent NextAuth from double-encoding callbackUrl on Vercel
  experimental: {
    serverActions: {
      allowedOrigins: ["brandbloom.vercel.app"],
    },
  },

  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/api/auth/:path*",
        headers: [
          { key: "X-Forwarded-Proto", value: "https" },
        ],
      },
    ];
  },
};

export default nextConfig;
