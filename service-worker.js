/**
 * Service Worker – Almoxarifado Colafix
 * Estratégia:
 *   - Cache-First para assets estáticos (ícones, manifest)
 *   - Network-First para o HTML principal (garante sempre versão atualizada)
 *   - Stale-While-Revalidate para demais requisições
 *
 * Compatível com GitHub Pages (caminhos relativos).
 * Versão do cache: incrementar CACHE_VERSION ao publicar nova versão.
 */

const CACHE_VERSION = 'colafix-v56';
const CACHE_STATIC  = CACHE_VERSION + '-static';

// Assets que serão pré-cacheados na instalação
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/responsive.css',
  './js/config-sheets.js',
  './js/state.js',
  './js/permissions.js',
  './js/utils.js',
  './js/estoque.js',
  './js/conferencia.js',
  './js/divergencias.js',
  './js/recebimento.js',
  './js/pendentes.js',
  './js/requisicao.js',
  './js/movimentacao.js',
  './js/confirmacao-sistema.js',
  './js/operador.js',
  './js/timeline.js',
  './js/sync.js',
  './js/historico.js',
  './js/pdf.js',
  './js/sheets-api.js',
  './js/expedicao.js',
  './js/polling.js',
  './js/auth.js',
  './js/init.js',
  './js/sw-register.js',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png',
  './icons/logo.png'
];

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Ativa imediatamente sem esperar o fechamento de abas antigas
      return self.skipWaiting();
    })
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('colafix-') && name !== CACHE_STATIC)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Assume controle de todas as abas abertas imediatamente
      return self.clients.claim();
    })
  );
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-GET e requisições externas (Google Sheets, Drive, etc.)
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // HTML principal: Network-First (sempre busca versão atualizada)
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: retorna do cache
          return caches.match(request).then((cached) => cached || caches.match('./'));
        })
    );
    return;
  }

  // Assets estáticos (ícones, manifest): Cache-First
  if (
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_STATIC).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Demais requisições: Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      });
    })
  );
});

// ─── MENSAGENS ────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  // Permite forçar atualização via postMessage({ type: 'SKIP_WAITING' })
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
