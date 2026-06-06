const CACHE_NAME = 'bingo-client-cache-v4';

// Voice files that must be cached for offline gameplay
const VOICE_FILES = [];
for (let i = 1; i <= 75; i++) {
  VOICE_FILES.push(`/voices/${i}.mp3`);
}
VOICE_FILES.push('/voices/begning.mp3');
VOICE_FILES.push('/voices/winner.mp3');
VOICE_FILES.push('/voices/not_winner.mp3');
VOICE_FILES.push('/voices/not_registered.mp3');

// Core files to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  ...VOICE_FILES
];

// Install: precache core assets + all voice files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching core assets and voice files');
        return cache.addAll(PRECACHE_URLS);
      })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for everything else
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache on localhost — let Vite dev server serve fresh files
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Never intercept non-GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept API calls — they must always go to the network
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api')) return;

  // Never intercept admin dashboard requests
  if (url.pathname.startsWith('/admin')) return;

  // For everything else (client app): cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache — fetch from network and cache it
        return fetch(event.request.clone()).then(response => {
          // Only cache valid responses
          if (!response || response.status !== 200) {
            return response;
          }

          // Don't cache opaque or cross-origin responses that aren't fonts
          if (response.type !== 'basic' && !url.hostname.includes('fonts')) {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            // Only cache http/https requests
            if (url.protocol.startsWith('http')) {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        }).catch(() => {
          // Offline fallback: return index.html for navigation requests (SPA routing)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // For other resources, just fail silently
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
