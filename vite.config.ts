import { defineConfig } from 'vitest/config';

// Service Worker собирается отдельной точкой входа в /sw.js без хеша:
// у воркера адрес должен быть постоянным.
// base './': сайт работает из любой папки на любом домене (s10.run, your.s10.run, подпапка).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: { main: 'index.html', sw: 'src/sw.ts' },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
