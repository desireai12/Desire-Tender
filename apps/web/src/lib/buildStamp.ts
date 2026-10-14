export interface BuildStamp {
  commit_sha: string;
  commit_hash: string;
  short_sha: string;
  vercel_env: string;
  build_time: string;
}

export function getBuildStamp(): BuildStamp {
  const commit = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'preview-update';
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || 'preview';
  const time = process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString();
  return {
    commit_sha: commit,
    commit_hash: commit,
    short_sha: commit.length >= 7 ? commit.slice(0, 7) : commit,
    vercel_env: env,
    build_time: time
  };
}
