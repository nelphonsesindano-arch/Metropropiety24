'use strict';
/* MetroHome24 : serveur (Node.js 22.13+, aucune dépendance npm, base SQLite) */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {sendMail,enabled:mailEnabled}=require('./mail');
try{process.loadEnvFile(path.join(__dirname,'.env'))}catch{}
const PORT=+process.env.PORT||3000,PUB=path.join(__dirname,'public');
const DATA=process.env.DATA_DIR||path.join(__dirname,'data'),UP=path.join(DATA,'uploads');
const TRUST=process.env.TRUST_PROXY==='1',SECURE=process.env.COOKIE_SECURE==='1';
fs.mkdirSync(UP,{recursive:true});
let SECRET=process.env.SESSION_SECRET;
if(!SECRET){const f=path.join(DATA,'secret.key');if(!fs.existsSync(f))fs.writeFileSync(f,crypto.randomBytes(32).toString('hex'),{mode:0o600});SECRET=fs.readFileSync(f,'utf8').trim()}
const SMS=(process.env.SMS_PROVIDER||'none').toLowerCase(),SMS_ON=SMS!=='none',SMS_BASE=process.env.SMS_API_BASE||'';
if(!['none','console','africastalking','twilio'].includes(SMS)){console.error('SMS_PROVIDER inconnu : none, console, africastalking ou twilio');process.exit(1)}
const need_env=SMS==='africastalking'?['AT_USERNAME','AT_API_KEY']:SMS==='twilio'?['TWILIO_SID','TWILIO_TOKEN']:[];
for(const k of need_env)if(!process.env[k]){console.error('Variable manquante pour '+SMS+' : '+k);process.exit(1)}
if(SMS==='twilio'&&!process.env.TWILIO_FROM&&!process.env.TWILIO_MESSAGING_SID){console.error('TWILIO_FROM ou TWILIO_MESSAGING_SID requis');process.exit(1)}
async function sendSms(phone,text){const to='+'+phone;
 if(SMS==='console'){console.log('[SMS -> '+to+'] '+text);return}
 if(SMS==='africastalking'){const base=SMS_BASE||(process.env.AT_SANDBOX==='1'?'https://api.sandbox.africastalking.com':'https://api.africastalking.com');
  const f=new URLSearchParams({username:process.env.AT_USERNAME,to,message:text});if(process.env.AT_SENDER)f.set('from',process.env.AT_SENDER);
  const r=await fetch(base+'/version1/messaging',{method:'POST',headers:{apiKey:process.env.AT_API_KEY,Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:f});if(!r.ok)throw new Error('SMS refusé ('+r.status+')');return}
 if(SMS==='twilio'){const base=SMS_BASE||'https://api.twilio.com',sid=process.env.TWILIO_SID,f=new URLSearchParams({To:to,Body:text});
  if(process.env.TWILIO_MESSAGING_SID)f.set('MessagingServiceSid',process.env.TWILIO_MESSAGING_SID);else f.set('From',process.env.TWILIO_FROM);
  const r=await fetch(base+'/2010-04-01/Accounts/'+sid+'/Messages.json',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(sid+':'+process.env.TWILIO_TOKEN).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:f});if(!r.ok)throw new Error('SMS refusé ('+r.status+')')}}
const db=new DatabaseSync(path.join(DATA,'metrohome24.db'));
db.exec(`PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL,ville TEXT,role TEXT NOT NULL,idno TEXT,pass TEXT NOT NULL,salt TEXT NOT NULL,is_admin INTEGER DEFAULT 0,banned INTEGER DEFAULT 0,created INTEGER);
CREATE TABLE IF NOT EXISTS listings(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),status TEXT NOT NULL,reason TEXT,data TEXT NOT NULL,photos TEXT NOT NULL,created INTEGER,updated INTEGER);
CREATE INDEX IF NOT EXISTS ix_l_status ON listings(status);
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,listing_id INTEGER,user_id INTEGER,reason TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,listing_id INTEGER,from_id INTEGER,body TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS visits(id INTEGER PRIMARY KEY,listing_id INTEGER,from_id INTEGER,vdate TEXT,vhour TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS otp(phone TEXT,purpose TEXT,code TEXT,expires INTEGER,attempts INTEGER DEFAULT 0,created INTEGER,PRIMARY KEY(phone,purpose));
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,user_id INTEGER,action TEXT,detail TEXT,created INTEGER);`);
const all=(s,...a)=>db.prepare(s).all(...a),one=(s,...a)=>db.prepare(s).get(...a),run=(s,...a)=>{const r=db.prepare(s).run(...a);return Number(r.lastInsertRowid)};
for(const[t,c,def]of[['users','phone_verified','INTEGER DEFAULT 0'],['users','token_ver','INTEGER DEFAULT 0'],['listings','approved','INTEGER DEFAULT 0']])
 if(!all('PRAGMA table_info('+t+')').some(x=>x.name===c))db.exec('ALTER TABLE '+t+' ADD COLUMN '+c+' '+def);
db.exec("UPDATE listings SET approved=1 WHERE status='Active' AND approved=0");
db.exec(`CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY,listing_id INTEGER NOT NULL,user_id INTEGER NOT NULL,stars INTEGER,text TEXT,created INTEGER,UNIQUE(listing_id,user_id));
CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER,listing_id INTEGER,PRIMARY KEY(user_id,listing_id));
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY,user_id INTEGER,label TEXT,q TEXT,created INTEGER);
CREATE TABLE IF NOT EXISTS contacts(id INTEGER PRIMARY KEY,name TEXT,email TEXT,message TEXT,created INTEGER);`);
const audit=(u,a,d)=>run('INSERT INTO audit(user_id,action,detail,created) VALUES(?,?,?,?)',u,a,String(d).slice(0,300),Date.now());
const bad=(m,c=400)=>Object.assign(new Error(m),{code:c});
const S=(v,n)=>String(v??'').trim().slice(0,n);
const N=(v,a,b)=>{v=Number(v);if(!Number.isFinite(v)||v<a||v>b)throw bad('Valeur numérique invalide');return v};
const normPhone=s=>{let d=String(s||'').replace(/\D/g,'');if(d.startsWith('0'))d='243'+d.slice(1);return d};
const ROLES=['Chercheur','Propriétaire','Commissionnaire','Agence'],TYPES=['Maison','Villa','Appartement','Studio','Parcelle','Terrain','Bureau','Boutique','Entrepôt'],DEV=['USD','CDF'],TR=['Location','Vente'];
/* mots de passe et sessions */
const hashPw=(p,salt)=>crypto.scryptSync(p,salt,64).toString('hex');
const sign=s=>crypto.createHmac('sha256',SECRET).update(s).digest('base64url');
const mkTok=(u,v)=>{const p=Buffer.from(JSON.stringify({u,v,e:Date.now()+30*864e5})).toString('base64url');return p+'.'+sign(p)};
function readTok(t){try{const[p,s]=String(t||'').split('.');if(!s)return;const a=Buffer.from(sign(p)),b=Buffer.from(s);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return;const o=JSON.parse(Buffer.from(p,'base64url'));return o.e>Date.now()?o:undefined}catch{}}
const cookies=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(c=>c.trim().split('=')).filter(c=>c[0]).map(c=>[c[0],c.slice(1).join('=')]));
const hits=new Map();
const limited=(ip,k,max,win)=>{const key=k+ip,n=Date.now(),h=hits.get(key);if(!h||h.r<n){hits.set(key,{c:1,r:n+win});return false}return ++h.c>max};
setInterval(()=>{const n=Date.now();for(const[k,v]of hits)if(v.r<n)hits.delete(k)},60000).unref();
const otpHash=(ph,pu,c)=>crypto.createHmac('sha256',SECRET).update(ph+'|'+pu+'|'+c).digest('hex');
const cooling=(ph,pu)=>{const o=one('SELECT created FROM otp WHERE phone=? AND purpose=?',ph,pu);return !!o&&Date.now()-o.created<60000};
function otpMake(ph,pu){const c=String(crypto.randomInt(0,1e6)).padStart(6,'0');run('INSERT OR REPLACE INTO otp(phone,purpose,code,expires,attempts,created) VALUES(?,?,?,?,0,?)',ph,pu,otpHash(ph,pu,c),Date.now()+6e5,Date.now());return c}
function otpCheck(ph,pu,code){const o=one('SELECT * FROM otp WHERE phone=? AND purpose=?',ph,pu);if(!o||o.expires<Date.now()||o.attempts>=5)return false;
 run('UPDATE otp SET attempts=attempts+1 WHERE phone=? AND purpose=?',ph,pu);
 const a=Buffer.from(otpHash(ph,pu,String(code||'').trim())),b=Buffer.from(o.code);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;
 run('DELETE FROM otp WHERE phone=? AND purpose=?',ph,pu);return true}
const newPw=pw=>{pw=String(pw||'');if(pw.length<8||pw.length>200)throw bad('Mot de passe : 8 caractères minimum');const salt=crypto.randomBytes(16).toString('hex');return[hashPw(pw,salt),salt]};
const mail=(to,subject,text)=>{if(to&&mailEnabled())sendMail({to,subject,text}).catch(e=>console.error('E-mail :',e.message))};
const notifyOwner=(lid,subject,text)=>{const o=one('SELECT u.email,u.name,l.data FROM listings l JOIN users u ON u.id=l.user_id WHERE l.id=?',lid);if(o)mail(o.email,subject,`Bonjour ${o.name},\n\nAnnonce : ${JSON.parse(o.data).t}\n${text}\n\nConnectez-vous à MetroHome24 pour répondre.`)};
const reviewsOf=id=>all('SELECT u.name n,r.stars s,r.text t FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.listing_id=? ORDER BY r.created DESC LIMIT 20',id).map(r=>({n:String(r.n).split(' ')[0],s:r.s,t:r.t}));
/* sorties */
const pubUser=u=>u?{id:u.id,name:u.name,phone:u.phone,email:u.email,ville:u.ville,role:u.role,idno:u.idno||'',isAdmin:!!u.is_admin,phoneVerified:!!u.phone_verified}:null;
const SEL='SELECT l.*,u.name uname,u.role urole,u.phone uphone,u.email uemail,u.idno uidno,u.ville uville,u.phone_verified uver FROM listings l JOIN users u ON u.id=l.user_id ';
const outL=(r,admin)=>{const d=JSON.parse(r.data);return{id:r.id,...d,rev:reviewsOf(r.id),per:d.tr==='Location'?'/mois':'',st:r.status,reason:r.reason||undefined,d:Math.floor(r.created/1000),photos:JSON.parse(r.photos),user:true,v:r.uver?[...(d.v||[]).filter(x=>x!=='Non vérifié'),'Téléphone vérifié']:(d.v||['Non vérifié']),pub:r.urole==='Chercheur'?'Propriétaire':r.urole,owner:{name:r.uname,role:r.urole,phone:r.uphone,phoneVerified:!!r.uver,...(admin?{email:r.uemail,idno:r.uidno,ville:r.uville}:{})}}};
function savePhoto(u){const m=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(u||'');if(!m)throw bad('Photo invalide');const b=Buffer.from(m[2],'base64');
 if(b.length<100||b.length>2.5e6)throw bad('Photo trop lourde (2,5 Mo max)');
 const ok=m[1]==='jpeg'?(b[0]===0xFF&&b[1]===0xD8):m[1]==='png'?b.subarray(1,4).toString()==='PNG':(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP');
 if(!ok)throw bad('Photo invalide');const n=crypto.randomBytes(12).toString('hex')+'.'+(m[1]==='jpeg'?'jpg':m[1]);fs.writeFileSync(path.join(UP,n),b);return'/uploads/'+n}
const rmPhotos=js=>JSON.parse(js).forEach(u=>{try{fs.unlinkSync(path.join(UP,path.basename(u)))}catch{}});
const VILLES=(process.env.VILLES||'Lubumbashi,Likasi,Kipushi,Kasenga,Kambove,Pweto,Sakania,Mitwaba').split(',').map(v=>v.trim()).filter(Boolean);
function cleanListing(x,role){x=x||{};const t=S(x.t,120),q=S(x.q,80),vi=S(x.vi,60);
 if(t.length<4||!q||!vi)throw bad('Titre, ville et quartier obligatoires');
 if(!VILLES.includes(vi))throw bad('Ville ou territoire hors du Haut-Katanga');
 if(!TYPES.includes(x.type)||!TR.includes(x.tr)||!DEV.includes(x.dev))throw bad('Type, transaction ou devise invalide');
 const d={t,type:x.type,tr:x.tr,vi,c:S(x.c,60),q,prix:N(x.prix,1,1e9),dev:x.dev,ch:N(x.ch||0,0,50),bain:N(x.bain||0,0,50),m2:N(x.m2||0,0,1e6),cond:S(x.cond,200)||'Non précisé',fv:S(x.fv,120)||'Aucun',hon:S(x.hon,200)||'Aucun',desc:S(x.desc,2000)};
 if(role!=='Propriétaire'&&(d.hon==='Aucun'||d.hon.length<3))throw bad('Honoraires obligatoires pour un intermédiaire');return d}
/* HTTP */
const send=(res,code,obj,h={})=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...h});res.end(JSON.stringify(obj))};
const body=(req,max)=>new Promise((ok,ko)=>{let n=0;const c=[];req.on('data',d=>{n+=d.length;if(n>max){ko(bad('Requête trop volumineuse',413));req.destroy()}else c.push(d)});req.on('end',()=>{try{ok(c.length?JSON.parse(Buffer.concat(c).toString()):{})}catch{ko(bad('JSON invalide'))}});req.on('error',ko)});
const MT={'.webmanifest':'application/manifest+json','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
function serve(req,res,u){let p;try{p=decodeURIComponent(u)}catch{res.writeHead(400);return res.end()}
 let base=PUB,imm=false;if(p.startsWith('/uploads/')){base=UP;p=p.slice(8);imm=true}
 if(p.split('/').some(s=>s.startsWith('.')||s.includes('\0'))){res.writeHead(404);return res.end('Introuvable')}
 let f=path.normalize(path.join(base,p==='/'?'index.html':p));
 if(!f.startsWith(base+path.sep)){res.writeHead(404);return res.end('Introuvable')}
 if(!path.extname(f)&&base===PUB&&fs.existsSync(f+'.html'))f+='.html';
 fs.stat(f,(e,s)=>{if(e||!s.isFile()){const nf=path.join(PUB,'404.html');if(base===PUB&&!path.extname(p)&&fs.existsSync(nf)){res.writeHead(404,{'Content-Type':MT['.html']});return res.end(fs.readFileSync(nf))}res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Introuvable')}
  const ext=path.extname(f).toLowerCase();if(!MT[ext]){res.writeHead(404);return res.end()}
  res.writeHead(200,{'Content-Type':MT[ext],'Content-Length':s.size,'Cache-Control':imm?'public, max-age=2592000, immutable':(ext==='.html'||f.endsWith('sw.js'))?'no-cache':'public, max-age=3600'});
  if(req.method==='HEAD')return res.end();fs.createReadStream(f).pipe(res)})}
async function api(req,res,url,ip){
 const m=req.method,p=url.pathname,secure=SECURE||(TRUST&&req.headers['x-forwarded-proto']==='https');
 if(m!=='GET'&&m!=='HEAD'){if(!/^application\/json/.test(req.headers['content-type']||''))throw bad('Content-Type JSON requis',415);
  const o=req.headers.origin;if(o){let h;try{h=new URL(o).host}catch{}if(h!==(TRUST&&req.headers['x-forwarded-host']||req.headers.host))throw bad('Origine refusée',403)}}
 const tk=readTok(cookies(req).mh);let me=tk&&one('SELECT * FROM users WHERE id=?',tk.u);if(me&&(me.banned||(me.token_ver||0)!==(tk.v||0)))me=null;
 const need=()=>{if(!me)throw bad('Connexion requise',401);return me},admin=()=>{if(!need().is_admin)throw bad('Accès réservé',403);return me};
 const login=u=>({'Set-Cookie':`mh=${mkTok(u.id,u.token_ver||0)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${30*86400}${secure?'; Secure':''}`});
 let r;
 if(p==='/api/health')return send(res,200,{ok:true,sms:SMS_ON,mail:mailEnabled()});
 if(p==='/api/me'&&m==='GET')return send(res,200,{user:pubUser(me)});
 if(p==='/api/register'&&m==='POST'){if(limited(ip,'reg',10,36e5))throw bad('Trop de tentatives',429);const b=await body(req,2e4);
  const name=S(b.name,80),phone=normPhone(b.phone),email=S(b.email,120).toLowerCase(),pw=String(b.password||''),role=ROLES.includes(b.role)?b.role:'Chercheur';
  if(name.length<2||phone.length<9||phone.length>15||!/^\S+@\S+\.\S+$/.test(email))throw bad('Nom, téléphone et e-mail valides requis');
  if(pw.length<8||pw.length>200)throw bad('Mot de passe : 8 caractères minimum');
  if(role!=='Chercheur'&&S(b.idno,40).length<4)throw bad('Numéro de pièce d’identité requis pour publier');
  if(one('SELECT id FROM users WHERE phone=? OR email=?',phone,email))throw bad('Un compte existe déjà avec ce téléphone ou cet e-mail',409);
  const salt=crypto.randomBytes(16).toString('hex'),id=run('INSERT INTO users(name,phone,email,ville,role,idno,pass,salt,created) VALUES(?,?,?,?,?,?,?,?,?)',name,phone,email,S(b.ville,60)||'Lubumbashi',role,S(b.idno,40),hashPw(pw,salt),salt,Date.now());
  return send(res,201,{user:pubUser(one('SELECT * FROM users WHERE id=?',id))},login({id}))}
 if(p==='/api/login'&&m==='POST'){if(limited(ip,'log',10,9e5))throw bad('Trop de tentatives, réessayez dans 15 minutes',429);const b=await body(req,2e4),k=S(b.id,120).toLowerCase();
  const u=one('SELECT * FROM users WHERE email=? OR phone=?',k,normPhone(k));const h=hashPw(String(b.password||''),u?u.salt:'0');
  if(!u||u.banned||!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(u.pass)))throw bad('Identifiants incorrects',401);
  return send(res,200,{user:pubUser(u)},login(u))}
 if(p==='/api/logout'&&m==='POST')return send(res,200,{ok:true},{'Set-Cookie':'mh=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});
 if(p==='/api/me'&&m==='PATCH'){need();const b=await body(req,2e4),role=ROLES.includes(b.role)?b.role:me.role,idno=S(b.idno,40)||me.idno||'';
  if(role!=='Chercheur'&&idno.length<4)throw bad('Numéro de pièce d’identité requis');if(me.is_admin&&role!==me.role)throw bad('Rôle admin inchangeable');
  run('UPDATE users SET role=?,idno=? WHERE id=?',role,idno,me.id);return send(res,200,{user:pubUser(one('SELECT * FROM users WHERE id=?',me.id))})}
 if(p==='/api/listings'&&m==='GET')return send(res,200,{listings:all(SEL+"WHERE l.status='Active' AND u.banned=0 ORDER BY l.created DESC LIMIT 500").map(x=>outL(x))});
 if(p==='/api/my'&&m==='GET'){need();return send(res,200,{listings:all(SEL+'WHERE l.user_id=? ORDER BY l.created DESC',me.id).map(x=>outL(x))})}
 if(p==='/api/listings'&&m==='POST'){need();const b=await body(req,9e6);
  if(me.role==='Chercheur'||!me.idno)throw bad('Compte Propriétaire avec pièce d’identité requis pour publier',403);
  const st=b.status==='Brouillon'?'Brouillon':'En attente';
  if(st!=='Brouillon'&&SMS_ON&&!me.phone_verified)throw bad('Vérifiez votre numéro par SMS avant de publier',403);
  if(one("SELECT COUNT(*) c FROM listings WHERE user_id=? AND status IN('En attente','Brouillon')",me.id).c>=20)throw bad('Trop d’annonces en attente',429);
  const d=cleanListing(b.listing,me.role);if(me.role!=='Propriétaire'&&b.mandat!==true)throw bad('Mandat du propriétaire requis');
  const ph=Array.isArray(b.photos)?b.photos.slice(0,5):[];if(st!=='Brouillon'&&!ph.length)throw bad('Au moins une photo est obligatoire');
  const urls=ph.map(savePhoto),id=run('INSERT INTO listings(user_id,status,data,photos,created,updated) VALUES(?,?,?,?,?,?)',me.id,st,JSON.stringify({...d,v:['Non vérifié']}),JSON.stringify(urls),Date.now(),Date.now());
  return send(res,201,{id,status:st})}
 let x;
 if((x=/^\/api\/listings\/(\d+)$/.exec(p))&&m==='DELETE'){need();const l=one('SELECT * FROM listings WHERE id=?',+x[1]);if(!l||(l.user_id!==me.id&&!me.is_admin))throw bad('Introuvable',404);
  rmPhotos(l.photos);run('DELETE FROM listings WHERE id=?',l.id);if(me.is_admin)audit(me.id,'delete_listing',l.id);return send(res,200,{ok:true})}
 if(p==='/api/reports'&&m==='POST'){need();const b=await body(req,1e4);if(limited(ip,'rep',20,36e5))throw bad('Trop de signalements',429);
  if(!one('SELECT id FROM listings WHERE id=?',+b.listing_id))throw bad('Annonce introuvable',404);const w=S(b.reason,500);if(w.length<3)throw bad('Motif requis');
  run('INSERT INTO reports(listing_id,user_id,reason,created) VALUES(?,?,?,?)',+b.listing_id,me.id,w,Date.now());return send(res,201,{ok:true})}
 if(p==='/api/messages'&&m==='POST'){need();const b=await body(req,1e4);if(limited(ip,'msg',40,36e5))throw bad('Trop de messages',429);
  if(!one("SELECT id FROM listings WHERE id=? AND status='Active'",+b.listing_id))throw bad('Annonce introuvable',404);const t=S(b.body,1000);if(t.length<2)throw bad('Message vide');
  run('INSERT INTO messages(listing_id,from_id,body,created) VALUES(?,?,?,?)',+b.listing_id,me.id,t,Date.now());
  notifyOwner(+b.listing_id,'Nouveau message sur votre annonce','Message reçu : '+S(b.body,300));return send(res,201,{ok:true})}
 if(p==='/api/visits'&&m==='POST'){need();const b=await body(req,1e4);if(limited(ip,'vis',20,36e5))throw bad('Trop de demandes',429);
  if(!one("SELECT id FROM listings WHERE id=? AND status='Active'",+b.listing_id))throw bad('Annonce introuvable',404);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')||!/^\d{2}:\d{2}$/.test(b.hour||''))throw bad('Date ou heure invalide');
  run('INSERT INTO visits(listing_id,from_id,vdate,vhour,created) VALUES(?,?,?,?,?)',+b.listing_id,me.id,b.date,b.hour,Date.now());
  notifyOwner(+b.listing_id,'Nouvelle demande de visite','Visite demandée le '+b.date+' à '+b.hour+'.');return send(res,201,{ok:true})}
 if(p==='/api/inbox'&&m==='GET'){need();const J='JOIN listings l ON l.id=x.listing_id JOIN users u ON u.id=x.from_id ';
  const D=JSON.parse;return send(res,200,{
   received:[...all('SELECT x.body,x.created,l.data,u.name,u.phone,\'message\' k FROM messages x '+J+'WHERE l.user_id=?',me.id),...all('SELECT x.vdate||\' \'||x.vhour body,x.created,l.data,u.name,u.phone,\'visite\' k FROM visits x '+J+'WHERE l.user_id=?',me.id)].sort((a,b)=>b.created-a.created).map(r=>({k:r.k,body:r.body,from:r.name,phone:r.phone,listing:D(r.data).t})),
   sent:[...all('SELECT x.body,x.created,l.data,\'message\' k FROM messages x JOIN listings l ON l.id=x.listing_id WHERE x.from_id=?',me.id),...all('SELECT x.vdate d,x.vhour h,x.created,l.data,\'visite\' k FROM visits x JOIN listings l ON l.id=x.listing_id WHERE x.from_id=?',me.id)].sort((a,b)=>b.created-a.created).map(r=>({k:r.k,body:r.body,d:r.d,h:r.h,listing:D(r.data).t}))})}
 if(p==='/api/otp/send'&&m==='POST'){need();if(!SMS_ON)throw bad('Les SMS ne sont pas configurés sur ce serveur',503);if(me.phone_verified)throw bad('Numéro déjà vérifié');
  if(limited(me.phone,'otpv',5,36e5)||limited(ip,'otpip',20,36e5)||cooling(me.phone,'verify'))throw bad('Patientez avant de redemander un code',429);
  await sendSms(me.phone,'MetroHome24 : votre code de vérification est '+otpMake(me.phone,'verify')+' (valable 10 minutes). Ne le communiquez à personne.');return send(res,200,{ok:true})}
 if(p==='/api/otp/verify'&&m==='POST'){need();const b=await body(req,1e3);if(!otpCheck(me.phone,'verify',b.code))throw bad('Code incorrect ou expiré');
  run('UPDATE users SET phone_verified=1 WHERE id=?',me.id);return send(res,200,{user:pubUser(one('SELECT * FROM users WHERE id=?',me.id))})}
 if(p==='/api/password/forgot'&&m==='POST'){if(!SMS_ON)throw bad('Réinitialisation par SMS indisponible : contactez l’administrateur',503);const b=await body(req,1e4);
  if(limited(ip,'fg',10,36e5))throw bad('Trop de demandes',429);const k=S(b.id,120).toLowerCase(),u=one('SELECT * FROM users WHERE email=? OR phone=?',k,normPhone(k));
  if(u&&!u.banned&&!limited(u.phone,'fgp',3,36e5)&&!cooling(u.phone,'reset')){try{await sendSms(u.phone,'MetroHome24 : code de réinitialisation du mot de passe '+otpMake(u.phone,'reset')+' (valable 10 minutes). Ignorez ce message si vous n’êtes pas à l’origine de la demande.')}catch(e){console.error(e.message)}}
  return send(res,200,{ok:true})}
 if(p==='/api/password/reset'&&m==='POST'){const b=await body(req,1e4);if(limited(ip,'rs',15,36e5))throw bad('Trop de tentatives',429);
  const k=S(b.id,120).toLowerCase(),u=one('SELECT * FROM users WHERE email=? OR phone=?',k,normPhone(k)),[h,salt]=newPw(b.password);
  if(!u||u.banned||!otpCheck(u.phone,'reset',b.code))throw bad('Code incorrect ou expiré');
  run('UPDATE users SET pass=?,salt=?,token_ver=token_ver+1,phone_verified=1 WHERE id=?',h,salt,u.id);const n=one('SELECT * FROM users WHERE id=?',u.id);audit(u.id,'password_reset',u.id);return send(res,200,{user:pubUser(n)},login(n))}
 if(p==='/api/me/password'&&m==='POST'){need();if(limited(ip,'pw',10,36e5))throw bad('Trop de tentatives',429);const b=await body(req,1e4),[h,salt]=newPw(b.new);
  const o=Buffer.from(hashPw(String(b.old||''),me.salt));if(!crypto.timingSafeEqual(o,Buffer.from(me.pass)))throw bad('Ancien mot de passe incorrect',401);
  run('UPDATE users SET pass=?,salt=?,token_ver=token_ver+1 WHERE id=?',h,salt,me.id);return send(res,200,{ok:true},login(one('SELECT * FROM users WHERE id=?',me.id)))}
 if((x=/^\/api\/listings\/(\d+)$/.exec(p))&&m==='PATCH'){need();const b=await body(req,9e6),l=one('SELECT * FROM listings WHERE id=? AND user_id=?',+x[1],me.id);if(!l)throw bad('Introuvable',404);
  if(limited(ip,'edit',30,36e5))throw bad('Trop de modifications',429);if(me.role==='Chercheur'||!me.idno)throw bad('Compte Propriétaire avec pièce d’identité requis',403);
  const st=b.status==='Brouillon'?'Brouillon':'En attente';if(st!=='Brouillon'&&SMS_ON&&!me.phone_verified)throw bad('Vérifiez votre numéro par SMS avant de publier',403);
  const d=cleanListing(b.listing,me.role);if(me.role!=='Propriétaire'&&b.mandat!==true)throw bad('Mandat du propriétaire requis');
  const old=JSON.parse(l.photos),inp=Array.isArray(b.photos)?b.photos:[];if(inp.length>5)throw bad('5 photos maximum');
  if(!inp.every(u=>typeof u==='string'&&(old.includes(u)||u.startsWith('data:'))))throw bad('Photo invalide');
  if(st!=='Brouillon'&&!inp.length)throw bad('Au moins une photo est obligatoire');
  const added=inp.filter(u=>u.startsWith('data:')).map(savePhoto),urls=inp.map(u=>u.startsWith('data:')?added.shift():u);
  run('UPDATE listings SET status=?,reason=NULL,data=?,photos=?,updated=? WHERE id=?',st,JSON.stringify({...d,v:['Non vérifié']}),JSON.stringify(urls),Date.now(),l.id);
  old.filter(u=>!urls.includes(u)).forEach(u=>{try{fs.unlinkSync(path.join(UP,path.basename(u)))}catch{}});return send(res,200,{id:l.id,status:st})}
 if((x=/^\/api\/listings\/(\d+)\/status$/.exec(p))&&m==='PATCH'){need();const b=await body(req,1e3),l=one('SELECT * FROM listings WHERE id=? AND user_id=?',+x[1],me.id);if(!l)throw bad('Introuvable',404);
  if(!l.approved)throw bad('Seules les annonces déjà validées peuvent changer de statut');if(!['Active','Louée','Vendue','Suspendue'].includes(b.status))throw bad('Statut invalide');
  run('UPDATE listings SET status=?,updated=? WHERE id=?',b.status,Date.now(),l.id);return send(res,200,{ok:true})}
 /* favoris, avis, alertes, compte, contact */
if(p==='/api/favorites'&&m==='GET'){need();return send(res,200,{ids:all('SELECT listing_id i FROM favorites WHERE user_id=?',me.id).map(r=>r.i)})}
 if(p==='/api/favorites'&&m==='POST'){need();const b=await body(req,1e3),id=+b.listing_id;if(!one('SELECT id FROM listings WHERE id=?',id))throw bad('Introuvable',404);
  if(b.on)run('INSERT OR IGNORE INTO favorites(user_id,listing_id) VALUES(?,?)',me.id,id);else run('DELETE FROM favorites WHERE user_id=? AND listing_id=?',me.id,id);return send(res,200,{ok:true})}
 if(p==='/api/reviews'&&m==='POST'){need();const b=await body(req,2e3),id=+b.listing_id,l=one("SELECT * FROM listings WHERE id=? AND status='Active'",id);if(!l)throw bad('Introuvable',404);
  if(l.user_id===me.id)throw bad('Vous ne pouvez pas noter votre propre annonce',403);
  if(!one('SELECT id FROM visits WHERE listing_id=? AND from_id=?',id,me.id))throw bad('Demandez une visite pour pouvoir donner un avis',403);
  const st=Math.round(Number(b.stars)),tx=S(b.text,500);if(!(st>=1&&st<=5)||tx.length<3)throw bad('Note (1 à 5) et commentaire requis');
  run('INSERT INTO reviews(listing_id,user_id,stars,text,created) VALUES(?,?,?,?,?) ON CONFLICT(listing_id,user_id) DO UPDATE SET stars=excluded.stars,text=excluded.text,created=excluded.created',id,me.id,st,tx,Date.now());return send(res,200,{ok:true})}
 if(p==='/api/alerts'&&m==='GET'){need();return send(res,200,{alerts:all('SELECT id,label,q FROM alerts WHERE user_id=? ORDER BY id DESC',me.id).map(a=>({id:a.id,label:a.label,q:JSON.parse(a.q)}))})}
 if(p==='/api/alerts'&&m==='POST'){need();const b=await body(req,2e3);if(one('SELECT COUNT(*) c FROM alerts WHERE user_id=?',me.id).c>=10)throw bad('10 alertes maximum');
  const q=b.q||{},c={tr:TR.includes(q.tr)?q.tr:'',type:TYPES.includes(q.type)?q.type:'',vi:S(q.vi,60),q:S(q.q,80),prixMax:Math.max(0,+q.prixMax||0),chMin:Math.max(0,Math.min(50,+q.chMin||0))};
  return send(res,201,{id:run('INSERT INTO alerts(user_id,label,q,created) VALUES(?,?,?,?)',me.id,S(b.label,120)||'Alerte',JSON.stringify(c),Date.now())})}
 if((x=/^\/api\/alerts\/(\d+)$/.exec(p))&&m==='DELETE'){need();run('DELETE FROM alerts WHERE id=? AND user_id=?',+x[1],me.id);return send(res,200,{ok:true})}
 if(p==='/api/me/export'&&m==='GET'){need();return send(res,200,{exportedAt:new Date().toISOString(),user:pubUser(me),
  listings:all('SELECT id,status,reason,data,created FROM listings WHERE user_id=?',me.id).map(r=>({id:r.id,status:r.status,reason:r.reason,created:r.created,...JSON.parse(r.data)})),
  messages:all('SELECT listing_id,body,created FROM messages WHERE from_id=?',me.id),visits:all('SELECT listing_id,vdate,vhour,created FROM visits WHERE from_id=?',me.id),
  reviews:all('SELECT listing_id,stars,text,created FROM reviews WHERE user_id=?',me.id),favorites:all('SELECT listing_id FROM favorites WHERE user_id=?',me.id),alerts:all('SELECT label,q FROM alerts WHERE user_id=?',me.id)})}
 if(p==='/api/me'&&m==='DELETE'){need();if(me.is_admin)throw bad('Le compte administrateur ne peut pas être supprimé ici',403);if(limited(ip,'del',5,36e5))throw bad('Trop de tentatives',429);const b=await body(req,1e3);
  const h=hashPw(String(b.password||''),me.salt);if(h.length!==me.pass.length||!crypto.timingSafeEqual(Buffer.from(h),Buffer.from(me.pass)))throw bad('Mot de passe incorrect',401);
  all('SELECT photos FROM listings WHERE user_id=?',me.id).forEach(r=>rmPhotos(r.photos));
  for(const q of ['DELETE FROM messages WHERE from_id=?1 OR listing_id IN(SELECT id FROM listings WHERE user_id=?1)','DELETE FROM visits WHERE from_id=?1 OR listing_id IN(SELECT id FROM listings WHERE user_id=?1)','DELETE FROM reviews WHERE user_id=?1 OR listing_id IN(SELECT id FROM listings WHERE user_id=?1)','DELETE FROM favorites WHERE user_id=?1 OR listing_id IN(SELECT id FROM listings WHERE user_id=?1)','DELETE FROM reports WHERE user_id=?1 OR listing_id IN(SELECT id FROM listings WHERE user_id=?1)','DELETE FROM alerts WHERE user_id=?1','DELETE FROM listings WHERE user_id=?1','DELETE FROM users WHERE id=?1'])run(q,me.id);
  audit(me.id,'account_deleted',me.id);return send(res,200,{ok:true},{'Set-Cookie':'mh=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
 if(p==='/api/contact'&&m==='POST'){const b=await body(req,1e4);if(limited(ip,'ct',5,36e5))throw bad('Trop de messages, réessayez plus tard',429);
  const name=S(b.name,80),email=S(b.email,120),msg=S(b.message,2000);if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||msg.length<10)throw bad('Nom, e-mail valide et message (10 caractères min.) requis');
  run('INSERT INTO contacts(name,email,message,created) VALUES(?,?,?,?)',name,email,msg,Date.now());
  mail(process.env.ADMIN_EMAIL,'Nouveau message de contact','De : '+name+' <'+email+'>\n\n'+msg);return send(res,201,{ok:true})}
 if(p==='/api/admin/contacts'&&m==='GET'){admin();return send(res,200,{contacts:all('SELECT * FROM contacts ORDER BY created DESC LIMIT 200')})}
 /* administration */
 if(p==='/api/admin/listings'&&m==='GET'){admin();return send(res,200,{listings:all(SEL+'ORDER BY l.created DESC LIMIT 1000').map(x=>outL(x,true))})}
 if((x=/^\/api\/admin\/listings\/(\d+)\/decision$/.exec(p))&&m==='POST'){admin();const b=await body(req,1e4),l=one('SELECT * FROM listings WHERE id=?',+x[1]);if(!l)throw bad('Introuvable',404);
  const d=JSON.parse(l.data);
  if(b.decision==='approve'){d.v=[b.identityChecked?'Identité vérifiée':'Annonce validée'];run("UPDATE listings SET status='Active',approved=1,reason=NULL,data=?,updated=? WHERE id=?",JSON.stringify(d),Date.now(),l.id)}
  else if(b.decision==='refuse'){const w=S(b.reason,300);if(w.length<3)throw bad('Motif requis');run("UPDATE listings SET status='Refusée',reason=?,updated=? WHERE id=?",w,Date.now(),l.id)}
  else throw bad('Décision invalide');audit(me.id,b.decision,l.id);
  {const o=one('SELECT email,name FROM users WHERE id=?',l.user_id);if(o)mail(o.email,b.decision==='approve'?'Votre annonce est publiée':'Votre annonce a été refusée',b.decision==='approve'?`Bonjour ${o.name},

Votre annonce « ${d.t} » a été approuvée et est maintenant visible.

MetroHome24`:`Bonjour ${o.name},

Votre annonce « ${d.t} » a été refusée.
Motif : ${S(b.reason,300)}

Vous pouvez la modifier et la soumettre à nouveau.

MetroHome24`)}
  if(b.decision==='approve')all('SELECT a.label,a.q,u.email FROM alerts a JOIN users u ON u.id=a.user_id WHERE a.user_id<>? AND u.banned=0',l.user_id).forEach(a=>{const c=JSON.parse(a.q);
   if((!c.tr||c.tr===d.tr)&&(!c.type||c.type===d.type)&&(!c.vi||c.vi===d.vi)&&(!c.q||d.q.toLowerCase().includes(c.q.toLowerCase()))&&(!c.prixMax||(d.dev==='USD'&&d.prix<=c.prixMax))&&d.ch>=(c.chMin||0))
    mail(a.email,'Nouvelle annonce : '+d.t,`Une annonce correspond à votre alerte « ${a.label} » :

${d.t}
${d.prix} ${d.dev} · ${d.q}, ${d.vi}

Voir : ${(process.env.PUBLIC_URL||'').replace(/\/$/,'')}/`)});
  if(SMS_ON){const o=one('SELECT phone FROM users WHERE id=?',l.user_id);if(o)sendSms(o.phone,b.decision==='approve'?'MetroHome24 : votre annonce « '+d.t+' » est approuvée et publiée.':'MetroHome24 : votre annonce « '+d.t+' » a été refusée. Motif : '+S(b.reason,120)).catch(e=>console.error(e.message))}
  return send(res,200,{ok:true})}
 if((x=/^\/api\/admin\/users\/(\d+)\/password$/.exec(p))&&m==='POST'){admin();const b=await body(req,1e3),u=one('SELECT * FROM users WHERE id=?',+x[1]);if(!u||u.is_admin)throw bad('Introuvable',404);
  if(String(b.password||'').length<10)throw bad('Mot de passe provisoire : 10 caractères minimum');const[h,salt]=newPw(b.password);
  run('UPDATE users SET pass=?,salt=?,token_ver=token_ver+1 WHERE id=?',h,salt,u.id);audit(me.id,'admin_reset_password',u.id);return send(res,200,{ok:true})}
 if(p==='/api/admin/reports'&&m==='GET'){admin();return send(res,200,{reports:all('SELECT r.*,u.name uname FROM reports r LEFT JOIN users u ON u.id=r.user_id ORDER BY r.created DESC LIMIT 200')})}
 if(p==='/api/admin/users'&&m==='GET'){admin();return send(res,200,{users:all('SELECT id,name,phone,email,ville,role,idno,is_admin,banned,created FROM users ORDER BY created DESC LIMIT 500')})}
 if((x=/^\/api\/admin\/users\/(\d+)\/ban$/.exec(p))&&m==='POST'){admin();const b=await body(req,1e3),u=one('SELECT * FROM users WHERE id=?',+x[1]);if(!u||u.is_admin)throw bad('Introuvable',404);
  run('UPDATE users SET banned=? WHERE id=?',b.banned?1:0,u.id);audit(me.id,b.banned?'ban':'unban',u.id);return send(res,200,{ok:true})}
 throw bad('Route inconnue',404)}
const srv=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(SECURE)res.setHeader('Strict-Transport-Security','max-age=31536000');
 const ip=(TRUST&&String(req.headers['x-forwarded-for']||'').split(',')[0].trim())||req.socket.remoteAddress||'?';
 try{const url=new URL(req.url,'http://x');
  if(url.pathname.startsWith('/api/'))return await api(req,res,url,ip);
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}
  if(url.pathname==='/robots.txt'||url.pathname==='/sitemap.xml'){const base=(process.env.PUBLIC_URL||('http'+((SECURE||(TRUST&&req.headers['x-forwarded-proto']==='https'))?'s':'')+'://'+((TRUST&&req.headers['x-forwarded-host'])||req.headers.host||'localhost'))).replace(/[^a-zA-Z0-9.:\/_-]/g,'').replace(/\/$/,'');
   if(url.pathname==='/robots.txt'){res.writeHead(200,{'Content-Type':MT['.txt']});return res.end('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: '+base+'/sitemap.xml\n')}
   res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/a-propos','/comment-ca-marche','/contact','/cgu','/confidentialite','/anti-fraude'].map(x=>'<url><loc>'+base+x+'</loc></url>').join('')+'</urlset>')}
  serve(req,res,url.pathname)}
 catch(e){if(!e.code||typeof e.code!=='number'){console.error(e);return send(res,500,{error:'Erreur serveur'})}send(res,e.code,{error:e.message})}});
if(process.env.ADMIN_PHONE&&process.env.ADMIN_PASSWORD&&!one('SELECT id FROM users WHERE is_admin=1')){
 if(process.env.ADMIN_PASSWORD.length<10){console.error('ADMIN_PASSWORD : 10 caractères minimum');process.exit(1)}
 const salt=crypto.randomBytes(16).toString('hex');run('INSERT INTO users(name,phone,email,ville,role,pass,salt,is_admin,phone_verified,created) VALUES(?,?,?,?,?,?,?,1,1,?)','Administrateur',normPhone(process.env.ADMIN_PHONE),(process.env.ADMIN_EMAIL||'admin@metrohome24.local').toLowerCase(),'Lubumbashi','Propriétaire',hashPw(process.env.ADMIN_PASSWORD,salt),salt,Date.now());console.log('Compte administrateur créé.')}
srv.listen(PORT,()=>console.log('MetroHome24 prêt sur http://localhost:'+PORT+' (SMS : '+SMS+')'));
