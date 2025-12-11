import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error - turbo is valid but might not be in the types yet
    turbo: {
      resolveAlias: {
        "thread-stream/test": "false",
        "thread-stream/benchmarks": "false",
      },
      // @ts-ignore
      rules: {
        "*.test.js": ["null-loader"],
      }
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /node_modules[\\/](thread-stream|pino)[\\/](test|benchmarks)[\\/].*\.(js|ts|mjs)$/,
      use: "null-loader",
    });
    return config;
  },
};

export default nextConfig;
