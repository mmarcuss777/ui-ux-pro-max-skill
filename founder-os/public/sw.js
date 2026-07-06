// Nexa app-shell cache. Only ever touches build-hashed static assets and
// icons — never HTML navigations or API/Supabase calls — so relaunching the
// installed app paints instantly while data always stays live from network.
const CACHE = "nexa-shell-v1";
const CACHEABLE = [/^\/_next\/static\//, /^\/icon-\d+\.png$/, /^\/apple-touch-icon\.png$/, /^\/favicon-32\.png$/, /^\/manifest\.json$/];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!CACHEABLE.some((pattern) => pattern.test(url.pathname))) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
