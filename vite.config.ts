import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import type { Connect, Plugin } from 'vite';

const mockUsersPlugin = (): Plugin => {
  return {
    name: 'mock-users-writer',
    apply: 'serve', // 개발 서버에서만 동작
    configureServer(server) {
      const mockFilePath = path.resolve(process.cwd(), 'mock-users.json');

      const handler: Connect.NextHandleFunction = (req, res, next) => {
        if (req.method !== 'POST' || req.url !== '/__mock__/users') {
          return next();
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            fs.writeFileSync(mockFilePath, body || '[]', 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                success: false,
                message: 'Failed to write mock file',
              })
            );
          }
        });
      };

      server.middlewares.use(handler);
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), mockUsersPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
