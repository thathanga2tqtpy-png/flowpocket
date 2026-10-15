/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react"],
  webpack: (config, { dev }) => {
    if (dev) {
      // Use in-memory cache to prevent OneDrive syncing & locking .pack.gz files on Windows
      config.cache = {
        type: "memory",
      };
    }
    return config;
  },
};

export default nextConfig;
