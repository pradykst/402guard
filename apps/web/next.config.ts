import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /[\\/]node_modules[\\/](thread-stream|pino)[\\/](test|benchmarks|examples)[\\/]/,
      loader: path.resolve(__dirname, "ignore-loader.js"),
    });
    return config;
  },
};

export default nextConfig;
