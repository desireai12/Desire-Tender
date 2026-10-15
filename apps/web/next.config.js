const { execSync } = require('child_process');

let commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
if (!commitSha) {
  try {
    commitSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    commitSha = 'local-preview';
  }
}
const vercelEnv = process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'preview' : 'development');
const buildTime = new Date().toISOString();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: commitSha,
    NEXT_PUBLIC_VERCEL_ENV: vercelEnv,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
