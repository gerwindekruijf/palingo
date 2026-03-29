const CACHE = 'palingo-v1';

// App shell — static assets to cache on install
const PRECACHE = [
	'/',
	'/palabra-del-dia',
	'/lingo',
	'/login',
	'/manifest.json'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle same-origin requests
	if (url.origin !== self.location.origin) return;

	// For navigation requests: network first, fall back to cached shell
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Cache fresh navigations
					const clone = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(() => {
					// Offline: return cached version of the same page, or home
					return caches.match(request).then(
						(cached) => cached ?? caches.match('/') ?? offlinePage()
					);
				})
		);
		return;
	}

	// For API / form POST requests: network only — show offline error if unavailable
	if (request.method === 'POST' || url.pathname.startsWith('/api/')) {
		event.respondWith(
			fetch(request).catch(
				() => new Response(
					JSON.stringify({ error: 'Sin conexión — conecta a internet para jugar' }),
					{ status: 503, headers: { 'Content-Type': 'application/json' } }
				)
			)
		);
		return;
	}

	// Static assets: cache first, network fallback
	event.respondWith(
		caches.match(request).then(
			(cached) => cached ?? fetch(request).then((response) => {
				if (response.ok) {
					const clone = response.clone();
					caches.open(CACHE).then((cache) => cache.put(request, clone));
				}
				return response;
			})
		)
	);
});

function offlinePage() {
	return new Response(
		`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Palingo — Sin conexión</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
    .box { text-align: center; padding: 2rem; }
    h1 { font-size: 2rem; font-weight: 900; letter-spacing: .1em; }
    p { color: #6b7280; margin-top: .5rem; }
  </style>
</head>
<body>
  <div class="box">
    <h1>PALINGO</h1>
    <p>Necesitas conexión a internet para jugar.</p>
    <p style="margin-top:1rem;font-size:.875rem">Conéctate y recarga la página.</p>
  </div>
</body>
</html>`,
		{ headers: { 'Content-Type': 'text/html' } }
	);
}
