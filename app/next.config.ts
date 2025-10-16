import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    // Stub React Native-only deps pulled by MetaMask SDK in web builds
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native": false,
      "@react-native-async-storage/async-storage": false,
    };
    config.externals.push("pino-pretty", "encoding");
    return config;
  },
};

export default nextConfig;
