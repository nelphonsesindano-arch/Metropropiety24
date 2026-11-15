'use strict';
/* Test de bout en bout : npm test (démarre des serveurs temporaires et un faux fournisseur SMS) */
const {spawn}=require('node:child_process'),http=require('node:http'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),port=()=>4000+Math.floor(Math.random()*5000);
const jar=B=>{let c='';return async(m,u,b)=>{const r=await fetch(B+u,{method:m,headers:{...(m!=='GET'?{'Content-Type':'application/json'}:{}),Cookie:c},body:m!=='GET'?JSON.stringify(b||{}):undefined});const s=r.headers.get('set-cookie');if(s)c=s.split(';')[0];let j={};try{j=await r.json()}catch{}return{s:r.status,...j}}};
const jpeg='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(300,7)]).toString('base64');
const jpeg2='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(300,9)]).toString('base64');
const L={t:'Maison 3 chambres',type:'Maison',tr:'Location',vi:'Lubumbashi',q:'Golf',prix:450,dev:'USD',ch:3,bain:2,m2:140,cond:'Caution 1 mois',fv:'Aucun',hon:'Aucun',desc:'Test'};
const mock=()=>new Promise(ok=>{const got=[];const s=http.createServer((q,r)=>{let b='';q.on('data',d=>b+=d);q.on('end',()=>{got.push({url:q.url,h:q.headers,f:new URLSearchParams(b)});r.writeHead(201,{'Content-Type':'application/json'});r.end('{}')})}).listen(0,()=>ok({got,s,P:s.address().port}))});
async function start(env){const P=port(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mh24-')),B='http://127.0.0.1:'+P;
 const p=spawn(process.execPath,['--disable-warning=ExperimentalWarning','server.js'],{env:{...process.env,PORT:P,DATA_DIR:tmp,ADMIN_PHONE:'0990000001',ADMIN_PASSWORD:'MotDePasseAdmin1!',...env},stdio:['ignore','ignore','inherit']});
 for(let i=0;i<60;i++){try{if((await fetch(B+'/api/health')).ok)break}catch{}await sleep(100)}
 return{B,stop:()=>{p.kill();fs.rmSync(tmp,{recursive:true,force:true})}}}
const code=m=>/(\d{6})/.exec(m.f.get('message')||m.f.get('Body'))[1];
(async()=>{const stops=[];try{
 /* 1. serveur avec SMS (faux Africa's Talking) */
 const M=await mock();stops.push(()=>M.s.close());
 const S=await start({SMS_PROVIDER:'africastalking',AT_USERNAME:'sandbox',AT_API_KEY:'key123',SMS_API_BASE:'http://127.0.0.1:'+M.P});stops.push(S.stop);
 const u=jar(S.B),a=jar(S.B),v=jar(S.B);let r;
 assert.equal((await u('GET','/api/health')).sms,true);
 assert.equal((await u('GET','/api/me')).user,null);
 assert.equal((await u('POST','/api/register',{name:'Aline K',phone:'0991112233',email:'aline@test.cd',role:'Propriétaire',idno:'ID12345',password:'court'})).s,400);
 r=await u('POST','/api/register',{name:'Aline K',phone:'0991112233',email:'aline@test.cd',role:'Propriétaire',idno:'ID12345',password:'motdepasse1'});assert.equal(r.s,201);assert.equal(r.user.phoneVerified,false);
 assert.equal((await jar(S.B)('POST','/api/register',{name:'Xavier',phone:'0991112233',email:'a@b.cd',password:'motdepasse1'})).s,409);
 assert.equal((await u('POST','/api/listings',{status:'En attente',listing:L,photos:[jpeg]})).s,403,'publier exige un téléphone vérifié');
 /* OTP */
 assert.equal((await u('POST','/api/otp/send')).s,200);
 assert.equal(M.got.length,1);assert.equal(M.got[0].h.apikey,'key123');assert.equal(M.got[0].f.get('to'),'+243991112233');assert.equal(M.got[0].url,'/version1/messaging');
 assert.equal((await u('POST','/api/otp/send')).s,429,'délai entre deux codes');
 assert.equal((await u('POST','/api/otp/verify',{code:'000000'})).s,400);
 r=await u('POST','/api/otp/verify',{code:code(M.got[0])});assert.equal(r.s,200);assert.equal(r.user.phoneVerified,true);
 assert.equal((await u('POST','/api/otp/verify',{code:code(M.got[0])})).s,400,'code à usage unique');
 /* publication */
 assert.equal((await u('POST','/api/listings',{status:'En attente',listing:L,photos:[]})).s,400,'photo obligatoire');
 assert.equal((await u('POST','/api/listings',{status:'En attente',listing:L,photos:['data:image/jpeg;base64,AAAA']})).s,400,'photo invalide');
 r=await u('POST','/api/listings',{status:'En attente',listing:L,photos:[jpeg,jpeg2]});assert.equal(r.s,201);const id=r.id;
 assert.equal((await u('GET','/api/listings')).listings.length,0,'invisible avant validation');
 assert.equal((await u('GET','/api/admin/listings')).s,403);
 assert.equal((await a('POST','/api/login',{id:'0990000001',password:'faux'})).s,401);
 r=await a('POST','/api/login',{id:'0990000001',password:'MotDePasseAdmin1!'});assert.equal(r.user.isAdmin,true);
 assert.equal((await a('GET','/api/admin/listings')).listings[0].owner.idno,'ID12345');
 assert.equal((await a('POST',`/api/admin/listings/${id}/decision`,{decision:'refuse'})).s,400);
 const n0=M.got.length;
 assert.equal((await a('POST',`/api/admin/listings/${id}/decision`,{decision:'approve',identityChecked:true})).s,200);
 await sleep(200);assert.equal(M.got.length,n0+1);assert.match(M.got[n0].f.get('message'),/approuvée/,'SMS de décision');
 let pub=(await jar(S.B)('GET','/api/listings')).listings;assert.equal(pub.length,1);assert.equal(pub[0].owner.email,undefined);assert.equal(pub[0].owner.phoneVerified,true);assert.ok(pub[0].v.includes('Téléphone vérifié')&&pub[0].v.includes('Identité vérifiée'));
 const ph=pub[0].photos;assert.equal((await fetch(S.B+ph[0])).status,200);
 /* modification : revalidation, photos retirées */
 assert.equal((await v('POST','/api/register',{name:'Bob',phone:'0997778899',email:'bob@test.cd',role:'Chercheur',password:'motdepasse2'})).s,201);
 assert.equal((await v('PATCH','/api/listings/'+id,{listing:L,photos:[ph[0]]})).s,404,'on ne modifie pas l’annonce d’un autre');
 assert.equal((await u('PATCH','/api/listings/'+id,{listing:{...L,prix:99999},photos:['/uploads/inconnu.jpg']})).s,400,'photo étrangère refusée');
 r=await u('PATCH','/api/listings/'+id,{listing:{...L,prix:500},photos:[ph[0],jpeg2],mandat:false});assert.equal(r.s,200);assert.equal(r.status,'En attente');
 assert.equal((await jar(S.B)('GET','/api/listings')).listings.length,0,'retour en validation après modification');
 assert.equal((await u('GET','/api/my')).listings[0].photos.length,2);
 await a('POST',`/api/admin/listings/${id}/decision`,{decision:'approve'});
 pub=(await jar(S.B)('GET','/api/listings')).listings;assert.equal(pub[0].prix,500);
 r=await u('PATCH','/api/listings/'+id,{listing:{...L,prix:500},photos:[pub[0].photos[0]]});assert.equal(r.s,200);
 assert.equal((await fetch(S.B+ph[1])).status,404,'photo supprimée du disque');await a('POST',`/api/admin/listings/${id}/decision`,{decision:'approve'});
 assert.equal((await v('PATCH',`/api/listings/${id}/status`,{status:'Louée'})).s,404);
 assert.equal((await u('PATCH',`/api/listings/${id}/status`,{status:'Louée'})).s,200);assert.equal((await jar(S.B)('GET','/api/listings')).listings.length,0);
 assert.equal((await u('PATCH',`/api/listings/${id}/status`,{status:'Active'})).s,200);assert.equal((await jar(S.B)('GET','/api/listings')).listings.length,1);
 assert.equal((await u('PATCH',`/api/listings/${id}/status`,{status:'Hack'})).s,400);
 /* messages, visites, signalements */
 assert.equal((await jar(S.B)('POST','/api/messages',{listing_id:id,body:'Bonjour'})).s,401);
 assert.equal((await v('POST','/api/messages',{listing_id:id,body:'Bonjour, disponible ?'})).s,201);
 assert.equal((await v('POST','/api/visits',{listing_id:id,date:'2026-12-01',hour:'09:00'})).s,201);
 assert.equal((await v('POST','/api/reports',{listing_id:id,reason:'Prix douteux'})).s,201);
 assert.equal((await u('GET','/api/inbox')).received.length,2);
 /* mot de passe oublié */
 const nf=M.got.length;
 assert.equal((await jar(S.B)('POST','/api/password/forgot',{id:'inconnu@test.cd'})).s,200);await sleep(100);assert.equal(M.got.length,nf,'aucun SMS pour un compte inexistant');
 assert.equal((await jar(S.B)('POST','/api/password/forgot',{id:'aline@test.cd'})).s,200);await sleep(100);assert.equal(M.got.length,nf+1);
 const rc=code(M.got[nf]),w=jar(S.B);
 assert.equal((await w('POST','/api/password/reset',{id:'aline@test.cd',code:'111111',password:'nouveaumdp1'})).s,400);
 assert.equal((await w('POST','/api/password/reset',{id:'aline@test.cd',code:rc,password:'court'})).s,400);
 assert.equal((await w('POST','/api/password/reset',{id:'aline@test.cd',code:rc,password:'nouveaumdp1'})).s,200);
 assert.equal((await u('GET','/api/me')).user,null,'ancienne session invalidée');
 assert.equal((await jar(S.B)('POST','/api/login',{id:'aline@test.cd',password:'motdepasse1'})).s,401);
 const u2=jar(S.B);assert.equal((await u2('POST','/api/login',{id:'0991112233',password:'nouveaumdp1'})).s,200);
 assert.equal((await u2('POST','/api/me/password',{old:'faux',new:'autremdp123'})).s,401);
 assert.equal((await u2('POST','/api/me/password',{old:'nouveaumdp1',new:'autremdp123'})).s,200);assert.equal((await u2('GET','/api/me')).user.name,'Aline K');
 /* administration des comptes */
 const users=(await a('GET','/api/admin/users')).users,bob=users.find(x=>x.email==='bob@test.cd');
 assert.equal((await a('POST',`/api/admin/users/${bob.id}/password`,{password:'court'})).s,400);
 assert.equal((await a('POST',`/api/admin/users/${bob.id}/password`,{password:'ProvisoireLong1'})).s,200);assert.equal((await v('GET','/api/me')).user,null);
 assert.equal((await jar(S.B)('POST','/api/login',{id:'bob@test.cd',password:'ProvisoireLong1'})).s,200);
 await a('POST',`/api/admin/users/${bob.id}/ban`,{banned:true});assert.equal((await jar(S.B)('POST','/api/login',{id:'bob@test.cd',password:'ProvisoireLong1'})).s,401);
 /* sécurité HTTP */
 assert.equal((await fetch(S.B+'/api/register',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await fetch(S.B+'/api/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'})).status,403);
 for(const x of['/..%2f..%2fserver.js','/%2e%2e/server.js','/data/metrohome24.db','/.env'])assert.equal((await fetch(S.B+x)).status,404);
 assert.equal((await fetch(S.B+'/')).status,200);
 assert.equal((await u2('DELETE','/api/listings/'+id)).s,200);
 /* 2. Twilio (faux serveur) */
 const T=await mock();stops.push(()=>T.s.close());
 const S2=await start({SMS_PROVIDER:'twilio',TWILIO_SID:'ACtest',TWILIO_TOKEN:'tok',TWILIO_FROM:'+15550001111',SMS_API_BASE:'http://127.0.0.1:'+T.P});stops.push(S2.stop);
 const t=jar(S2.B);await t('POST','/api/register',{name:'Chloé',phone:'0995556677',email:'c@test.cd',role:'Propriétaire',idno:'ID999999',password:'motdepasse1'});
 assert.equal((await t('POST','/api/otp/send')).s,200);assert.equal(T.got[0].url,'/2010-04-01/Accounts/ACtest/Messages.json');
 assert.equal(T.got[0].h.authorization,'Basic '+Buffer.from('ACtest:tok').toString('base64'));assert.equal(T.got[0].f.get('From'),'+15550001111');assert.equal(T.got[0].f.get('To'),'+243995556677');
 /* 3. sans SMS */
 const S3=await start({SMS_PROVIDER:'none'});stops.push(S3.stop);const z=jar(S3.B);
 assert.equal((await z('GET','/api/health')).sms,false);
 await z('POST','/api/register',{name:'Denis',phone:'0994443322',email:'d@test.cd',role:'Propriétaire',idno:'ID777777',password:'motdepasse1'});
 assert.equal((await z('POST','/api/otp/send')).s,503);assert.equal((await z('POST','/api/password/forgot',{id:'d@test.cd'})).s,503);
 assert.equal((await z('POST','/api/listings',{status:'En attente',listing:L,photos:[jpeg]})).s,201,'sans SMS la vérification n’est pas exigée');
 console.log('TOUS LES TESTS PASSENT');
}catch(e){console.error('ÉCHEC :',e.stack.split('\n').slice(0,4).join('\n'));process.exitCode=1}finally{stops.forEach(f=>{try{f()}catch{}})}})();
