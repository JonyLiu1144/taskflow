import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? '7hk15ecc9748qsfehmru7lpsap',
    APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID ?? '',
    APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY ?? '',
    APP_AWS_REGION: process.env.APP_AWS_REGION ?? 'ap-northeast-1',
  },
};

export default nextConfig;
