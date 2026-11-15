/* MetroHome24 : service worker. L'API n'est jamais mise en cache. Changez V pour forcer une mise à jour. */
const V='mh24-v1',SHELL=['/','/assets/style.css','/assets/app.js','/assets/extra.js','/assets/more.js','/assets/api.js','/assets/pro.js','/assets/data.js','/assets/lieux.js','/assets/favicon.svg','/assets/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/uploads/'))return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(x=>{const k=x.clone();caches.open(V).then(c=>c.put('/',k));return x}).catch(()=>caches.match('/').then(x=>x||new Response('Hors connexion',{status:503}))));return}
 e.respondWith(caches.match(r).then(c=>{const n=fetch(r).then(x=>{if(x.ok){const k=x.clone();caches.open(V).then(cc=>cc.put(r,k))}return x}).catch(()=>c);return c||n}))});
