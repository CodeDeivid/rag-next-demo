import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Native ONNX runtime must stay a plain Node require, not bundled.
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
