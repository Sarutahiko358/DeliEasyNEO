/* sw.js — DeliEasy Service Worker v2.2 */
const CACHE_NAME = 'delieasy-v26';
const PRE_CACHE = [
  './',
  './index.html',
  './firebase-config.js',
  './storage.js',
  './earns-db.js',
  './expenses-db.js',
  './firebase-sync.js',
  './calendar.js',
  './stats.js',
  './expense.js',
  './tax.js',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  /* v2 Styles */
  './styles/base.css',
  './styles/design-styles.css',
  './styles/color-palettes.css',
  './styles/components.css',
  './styles/sidebar.css',
  './styles/overlay.css',
  './styles/fab.css',
  './styles/widgets.css',
  './styles/presets.css',
  './styles/home.css',
  './styles/topbar.css',
  './styles/bottombar.css',
  './styles/right-panel.css',
  './styles/calendar.css',
  './styles/stats.css',
  './styles/desktop.css',
  /* v2 Scripts */
  './js/utils.js',
  './js/sidebar.js',
  './js/overlay.js',
  './js/overlay-customizer.js',
  './js/fab.js',
  './js/widgets.js',
  './js/presets.js',
  './js/topbar.js',
  './js/bottombar.js',
  './js/right-panel.js',
  './js/home.js',
  './js/earn-input.js',
  './js/expense-input.js',
  './js/calendar-view.js',
  './js/stats-view.js',
  './js/tax-view.js',
  './js/expense-view.js',
  './js/pf-manage.js',
  './js/custom-overlays.js',
  './js/settings-view.js',
  './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.origin !== location.origin &&
      !url.hostname.includes('gstatic') &&
      !url.hostname.includes('googleapis') &&
      !url.hostname.includes('fonts.googleapis') &&
      !url.hostname.includes('fonts.gstatic') &&
      !url.hostname.includes('flagcdn') &&
      !url.hostname.includes('cdn.jsdelivr') &&
      !url.hostname.includes('unpkg') &&
      !url.hostname.includes('firebaseio') &&
      !url.hostname.includes('firebaseapp')) {
    return;
  }

  if (url.hostname.includes('firebaseio') || url.hostname.includes('firestore.googleapis')) {
    return;
  }

  if (url.hostname.includes('fonts.googleapis') ||
      url.hostname.includes('fonts.gstatic') ||
      url.hostname.includes('flagcdn')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  if (url.hostname.includes('cdn.jsdelivr') ||
      url.hostname.includes('unpkg') ||
      url.hostname.includes('gstatic')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          const fetched = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          const fetched = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }
});
