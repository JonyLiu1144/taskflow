import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? '7hk15ecc9748qsfehmru7lpsap',
  },
};

export default nextConfig;
