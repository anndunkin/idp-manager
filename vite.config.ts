import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['better-sqlite3', 'electron'],
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    environmentMatchGlobs: [
      ['tests/database.test.ts', 'node'],
      ['tests/exports.test.ts', 'node'],
      ['tests/fileManagement.test.ts', 'node'],
      ['tests/milestoneLabels.test.ts', 'node'],
      ['tests/security.test.ts', 'node'],
    ],
    alias: [
      { find: 'electron', replacement: '/home/user/workspace/idp-manager/tests/__mocks__/electron.ts' },
    ],
  },
})
