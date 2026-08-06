// ============================================================
// sw.js
// Service Worker simples: guarda o "esqueleto" do app em cache
// para abrir rapidamente e funcionar offline. Os dados da lista
// continuam vindo do Firestore (que tem seu próprio cache offline).
// ============================================================

const NOME_CACHE = "casalist-v2";

const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase.js",
  "./manifest.json",
  "./favicon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== NOME_CACHE)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: tenta a rede primeiro (para pegar HTML/CSS/JS atualizados),
// e usa o cache como reserva quando estiver offline.
self.addEventListener("fetch", (evento) => {
  // Não interceptar chamadas ao Firebase/Firestore — deixar o SDK cuidar disso.
  if (evento.request.url.includes("firestore.googleapis.com")) return;
  if (evento.request.url.includes("googleapis.com")) return;
  if (evento.request.url.includes("gstatic.com")) return;

  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(NOME_CACHE).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request))
  );
});
