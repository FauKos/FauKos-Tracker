// Red primero, caché si no hay conexión. La app funciona offline desde la segunda vez que se abre.
// ponytail: la caché acumula versiones viejas de los archivos; limpiarla si algún día pesa.
const CACHE = 'rumbo'
const INICIO = self.registration.scope // la página de la app, esté en la raíz o en una subcarpeta

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  const clave = req.mode === 'navigate' ? INICIO : req
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(req)
        if (res.ok) cache.put(clave, res.clone())
        return res
      } catch {
        return (await cache.match(clave)) ?? Response.error()
      }
    }),
  )
})
