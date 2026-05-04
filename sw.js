// ═══════════════════════════════════════════════
//  Service Worker — 辦公室代買記帳系統
//  策略：App Shell 離線快取 + API 請求永遠走網路
// ═══════════════════════════════════════════════

const CACHE_NAME = "office-bank-v1";

// 需要快取的本地靜態資源（App Shell）
const STATIC_ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// ── 安裝：快取靜態資源 ──
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] 快取靜態資源");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── 啟動：清除舊版快取 ──
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("[SW] 刪除舊快取:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch：分兩種策略 ──
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Google Fonts、Apps Script API → 永遠走網路，不快取
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com") ||
    url.hostname.includes("script.google.com")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 本地靜態資源 → Cache First（有快取用快取，沒有再去網路）
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 成功拿到就順便存起來
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 完全離線時，回傳主頁面
      return caches.match("./index.html");
    })
  );
});
