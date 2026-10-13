// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const isUserPage = typeof repo === 'string' && repo.endsWith('.github.io');

// https://astro.build/config
export default defineConfig({
  // Derived from CI so GitHub Pages URLs are correct without hardcoding.
  site: owner ? `https://${owner}.github.io` : undefined,
  // Project pages live under /<repo>/; user pages and local dev use /.
  base: isUserPage ? '/' : repo ? `/${repo}` : '/',
  vite: {
    plugins: [tailwindcss()],
  },
});
