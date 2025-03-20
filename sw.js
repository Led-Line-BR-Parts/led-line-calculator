const CACHE_NAME = 'calculadora-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estratégia de cache: Cache First, depois Network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retornar resposta
        if (response) {
          return response;
        }

        // Clonar a requisição
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Verificar se resposta é válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar a resposta
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Sempre excluir requisições da API de cotação do cache
                if (!event.request.url.includes('awesomeapi.com.br')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        ).catch(() => {
          // Se falhar, tentar retornar uma página offline ou recurso padrão
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Sincronizar dados quando online
self.addEventListener('sync', event => {
  if (event.tag === 'sync-orcamentos') {
    event.waitUntil(syncData());
  }
});

// Função para sincronizar dados
async function syncData() {
  // Código para sincronizar será implementado quando Firebase estiver configurado
  console.log('Sincronizando dados...');
}
