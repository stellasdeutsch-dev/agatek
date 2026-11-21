import { defineConfig } from 'astro/config';
export default defineConfig({
  site: 'https://stellasdeutsch-dev.github.io',
  base: '/agatek',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
});
