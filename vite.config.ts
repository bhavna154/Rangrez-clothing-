import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes.ts';

dotenv.config();

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          const apiApp = express();
          apiApp.use(cors());
          apiApp.use(express.json({ limit: '50mb' }));
          apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
          apiApp.use('/api', apiRouter);

          const uploadsDir = path.resolve(__dirname, 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
          }
          apiApp.use('/uploads', express.static(uploadsDir));

          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/uploads'))) {
              (apiApp as any)(req, res, next);
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
