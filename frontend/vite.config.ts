/// <reference types="vitest/config" />
import path from 'path';
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// ----------------------------------------------------------------------

const PORT = 8080;
const isTest = process.env.VITEST === 'true';

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/pages',
      generatedRouteTree: './src/route-tree.gen.ts',
    }),
    react(),
    !isTest &&
      checker({
        typescript: true,
        eslint: {
          useFlatConfig: true,
          lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
          dev: { logLevel: ['error'] },
        },
        overlay: { position: 'tl', initialIsOpen: false },
      }),
  ],
  resolve: {
    alias: [{ find: /^src(.+)/, replacement: path.resolve(process.cwd(), 'src/$1') }],
  },
  server: {
    port: PORT,
    host: true,
    // backend (NestJS) — docker compose yoki `npm run start:dev`
    proxy: { '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3000' },
  },
  preview: { port: PORT, host: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
