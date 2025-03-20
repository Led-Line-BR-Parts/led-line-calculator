// LED LINE BR PARTS - Calculadora - Service Worker
const CACHE_NAME = 'led-line-br-parts-calculadora-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/site.webmanifest',
    '/favicon.ico',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png'
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

// Interceptação de requisições
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - retorna a resposta do cache
                if (response) {
                    return response;
                }
                
                // Clonar a requisição
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest)
                    .then(response => {
                        // Verificar se obtivemos uma resposta válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clonar a resposta
                        const responseToCache = response.clone();
                        
                        // Abrir o cache e armazenar a resposta
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
    );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        // Deletar cache antigo
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Sincronização em segundo plano (opcional)
self.addEventListener('sync', event => {
    if (event.tag === 'syncOrcamentos') {
        event.waitUntil(syncOrcamentos());
    }
});

// Função para sincronizar orçamentos (mockup)
function syncOrcamentos() {
    // Aqui você implementaria a sincronização com um servidor
    return Promise.resolve();
}
