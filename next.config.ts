/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: { resolve: { fallback: any } }, { isServer }: any) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  output: "export",
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
