import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const parentURL = context.parentURL || pathToFileURL(process.cwd() + '/').href;
    const baseURL = new URL(specifier, parentURL);
    for (const ext of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.js']) {
      try {
        const fullURL = new URL(baseURL.href + ext);
        const fullPath = fileURLToPath(fullURL);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return {
            url: fullURL.href,
            shortCircuit: true,
          };
        }
      } catch (e) {}
    }
  }
  return nextResolve(specifier, context);
}
