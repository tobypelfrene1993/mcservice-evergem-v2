import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const cleanRouteRedirects = {
  '/diensten': '/diensten/',
  '/over-ons': '/over-ons/',
  '/contact': '/contact/',
  '/privacy': '/privacy/',
  '/wettelijke-informatie': '/wettelijke-informatie/',
  '/admin': '/admin/',
};

function redirectCleanRoutes() {
  const attachRedirects = (server) => {
    server.middlewares.use((request, response, next) => {
      const pathname = request.url?.split('?')[0];
      const destination = pathname ? cleanRouteRedirects[pathname] : undefined;

      if (!destination) {
        next();
        return;
      }

      const query = request.url?.includes('?')
        ? request.url.slice(request.url.indexOf('?'))
        : '';

      response.statusCode = 308;
      response.setHeader('Location', `${destination}${query}`);
      response.end();
    });
  };

  return {
    name: 'redirect-clean-routes',
    configureServer: attachRedirects,
    configurePreviewServer: attachRedirects,
  };
}

export default defineConfig({
  appType: 'mpa',
  plugins: [redirectCleanRoutes()],
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        diensten: resolve(import.meta.dirname, 'diensten/index.html'),
        overOns: resolve(import.meta.dirname, 'over-ons/index.html'),
        contact: resolve(import.meta.dirname, 'contact/index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        wettelijkeInformatie: resolve(import.meta.dirname, 'wettelijke-informatie/index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
      },
    },
  },
});
