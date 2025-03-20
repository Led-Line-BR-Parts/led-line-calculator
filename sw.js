const CACHE_NAME = 'calculadora-v1.2';
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
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Todos os recursos foram armazenados em cache');
        return self.skipWaiting(); // Força o Service Worker em waiting a se tornar o ativo
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Excluindo cache antigo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('Service Worker: Ativado e controlando a página');
      return self.clients.claim(); // Faz o SW assumir o controle de todos os clientes imediatamente
    })
  );
});

// Estratégia de cache: Stale-While-Revalidate
// Primeiro tenta do cache, depois da rede, e então atualiza o cache
self.addEventListener('fetch', event => {
  // Ignorar URLs de API ou análise
  if (event.request.url.includes('analytics') || 
      event.request.url.includes('awesomeapi.com.br') || 
      event.request.url.includes('exchangerate-api.com')) {
    return;
  }
  
  // Para requisições GET, usamos a estratégia de cache
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // Clonar a requisição porque ela só pode ser usada uma vez
          const fetchPromise = fetch(event.request.clone())
            .then(networkResponse => {
              // Verificar se a resposta é válida
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                // Clonar a resposta porque ela só pode ser usada uma vez
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(error => {
              console.log('Service Worker: Falha ao buscar recurso na rede', error);
              // Se houver um erro, retornamos a resposta em cache ou uma página offline
              return cachedResponse;
            });
          
          // Retornar a resposta em cache imediatamente se disponível, 
          // ou esperar a resposta da rede
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});

// Sincronizar dados quando online
self.addEventListener('sync', event => {
  console.log('Service Worker: Evento de sincronização detectado', event.tag);
  
  if (event.tag === 'sync-orcamentos') {
    event.waitUntil(syncData());
  }
});

// Função para sincronizar dados
async function syncData() {
  console.log('Service Worker: Sincronizando dados...');
  
  // Notificar todos os clientes abertos para sincronizar dados
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });
  
  allClients.forEach(client => {
    client.postMessage({
      type: 'SYNC_REQUIRED',
      message: 'A sincronização é necessária'
    });
  });
}

// Gerenciar notificações push
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view', 
        title: 'Ver'
      },
      {
        action: 'close', 
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gerenciar cliques em notificações
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  const primaryKey = notification.data.primaryKey;
  
  notification.close();
  
  if (action === 'view') {
    const url = notification.data.url || '/';
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});

// Adicionar manipulador de mensagens para comunicação com cliente
self.addEventListener('message', event => {
  console.log('Service Worker: Mensagem recebida do cliente', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gerenciamento avançado de falhas na rede
const netErrorHandlers = {
  fetchWithTimeout: (request, timeout = 8000) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Network request timeout"));
      }, timeout);
      
      fetch(request).then(
        (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(err);
        }
      );
    });
  },
  
  handleNetworkError: async (request) => {
    try {
      // Tentar buscar da rede com timeout
      return await netErrorHandlers.fetchWithTimeout(request);
    } catch (error) {
      console.error('Erro de rede:', error);
      
      // Verificar se é uma API de cotação com fallback
      if (request.url.includes('awesomeapi.com.br')) {
        try {
          // Tentar API alternativa
          const fallbackResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
          return fallbackResponse;
        } catch (fallbackError) {
          // Se falhar, verificar no cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se não houver cache, retornar resposta de erro offline customizada
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'Você está offline. Por favor, verifique sua conexão.'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      }
      
      // Para outros tipos de requisição, tentar o cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Se a navegação falhar e não estiver em cache, redirecionar para página offline
      if (request.mode === 'navigate') {
        const offlinePage = await caches.match('./index.html');
        if (offlinePage) {
          return offlinePage;
        }
      }
      
      // Para todos os outros casos, retornar um erro genérico
      return new Response('Falha na rede', { status: 408, headers: { 'Content-Type': 'text/plain' } });
    }
  }
};
