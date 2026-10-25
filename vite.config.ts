import { defineConfig } from 'vitest/config';

// Service Worker собирается отдельной точкой входа в /sw.js без хеша:
// у воркера адрес должен быть постоянным.
export default defineConfig({
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
