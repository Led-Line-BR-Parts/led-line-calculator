const CACHE_NAME = 'led-line-calculator-pro-v3.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Cacheando arquivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Cache completo');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[ServiceWorker] Erro no cache:', err);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Ativando...');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[ServiceWorker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[ServiceWorker] Ativação completa');
      return self.clients.claim();
    })
  );
});

// Estratégia de cache: Network First com fallback para cache
self.addEventListener('fetch', event => {
  // Ignorar requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // URLs de API que não devem ser cacheadas
  const apiUrls = [
    'api.exchangerate-api.com',
    'economia.awesomeapi.com.br'
  ];
  
  const isApiRequest = apiUrls.some(url => event.request.url.includes(url));
  
  if (isApiRequest) {
    // Para APIs, sempre tentar rede primeiro
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clonar a resposta para cache
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // Se falhar, tentar cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para recursos estáticos, cache primeiro
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            // Retornar do cache
            return response;
          }
          
          // Se não estiver no cache, buscar na rede
          return fetch(event.request)
            .then(response => {
              // Verificar se é uma resposta válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clonar a resposta
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseToCache);
              });
              
              return response;
            });
        })
        .catch(() => {
          // Se tudo falhar, retornar página offline
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        })
    );
  }
});

// Sincronização em background
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Sincronização em background');
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[ServiceWorker] Sincronizando dados...');
  
  // Notificar clientes para sincronizar
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REQUIRED',
      message: 'Sincronização disponível'
    });
  });
}

// Gerenciar mensagens
self.addEventListener('message', event => {
  console.log('[ServiceWorker] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications (preparado para futuro)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nova atualização disponível',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
        icon: './icon-192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: './icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('LED LINE Calculator', options)
  );
});

// Click em notificação
self.addEventListener('notificationclick', event => {
  console.log('[ServiceWorker] Notificação clicada');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Tratamento de erros
self.addEventListener('error', event => {
  console.error('[ServiceWorker] Erro:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[ServiceWorker] Promise rejeitada:', event.reason);
});
