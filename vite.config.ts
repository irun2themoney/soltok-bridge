import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        nodePolyfills({
          include: ['buffer', 'crypto', 'stream', 'util'],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SOLANA_RPC_URL': JSON.stringify(env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'),
        'process.env.ESCROW_PROGRAM_ID': JSON.stringify(env.ESCROW_PROGRAM_ID || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
          output: {
            manualChunks: {
              'solana': ['@solana/web3.js', '@solana/spl-token'],
              'wallet-adapter': [
                '@solana/wallet-adapter-react',
                '@solana/wallet-adapter-react-ui',
                '@solana/wallet-adapter-wallets'
              ]
            }
          }
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis'
          }
        }
      }
    };
});
