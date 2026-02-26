/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    REPLICATE_API_KEY: process.env.REPLICATE_API_KEY,
  },
  async redirects() {
    return [
      { source: "/favicon.ico", destination: "/icon.svg", permanent: false },
    ];
  },
};

export default nextConfig;
