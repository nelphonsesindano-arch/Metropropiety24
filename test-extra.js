'use strict';
/* Tests des fonctions complémentaires : e-mails (faux serveur SMTP), favoris, avis, alertes, export, suppression de compte, contact, pages, sauvegarde */
const {spawn,execFileSync}=require('node:child_process'),net=require('node:net'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mails=[];
const smtp=net.createServer(s=>{let buf='',data=false,cur='';s.on('error',()=>{});s.write('220 fake\r\n');
 s.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\r\n'))>=0){const l=buf.slice(0,i);buf=buf.slice(i+2);
  if(data){if(l==='.'){data=false;mails.push(cur);cur='';s.write('250 ok\r\n')}else cur+=l+'\n'}
  else if(/^DATA/i.test(l)){data=true;s.write('354 go\r\n')}else if(/^QUIT/i.test(l)){s.write('221 bye\r\n');s.end()}else s.write('250 ok\r\n')}})});
const parse=m=>{const[h,b]=m.split('\n\n');return{to:/^To: (.+)$/m.exec(h)[1],subject:Buffer.from(/Subject: =\?UTF-8\?B\?(.+?)\?=/.exec(h)[1],'base64').toString(),body:Buffer.from(b.replace(/\n/g,''),'base64').toString()}};
const mailTo=async(to,sub)=>{for(let i=0;i<40;i++){const f=mails.map(parse).find(x=>x.to===to&&x.subject.includes(sub));if(f)return f;await sleep(50)}throw new Error('E-mail non reçu : '+to+' / '+sub)};
const jar=B=>{let c='';return async(m,u,b)=>{const r=await fetch(B+u,{method:m,headers:{...(m!=='GET'?{'Content-Type':'application/json'}:{}),Cookie:c},body:m!=='GET'?JSON.stringify(b||{}):undefined});const s=r.headers.get('set-cookie');if(s)c=s.split(';')[0];let j={};try{j=await r.json()}catch{}return{s:r.status,...j}}};
const jpeg='data:image/jpeg;base64,'+Buffer.concat([Buffer.from([0xFF,0xD8,0xFF,0xE0]),Buffer.alloc(300,7)]).toString('base64');
const L={t:'Maison 3 chambres',type:'Maison',tr:'Location',vi:'Lubumbashi',q:'Golf',prix:450,dev:'USD',ch:3,bain:2,m2:140,cond:'Caution 1 mois',fv:'Aucun',hon:'Aucun',desc:'Test'};
(async()=>{const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mh24x-')),bk=fs.mkdtempSync(path.join(os.tmpdir(),'mh24b-'));let srv;
 try{
  await new Promise(r=>smtp.listen(0,'127.0.0.1',r));const PORT=3900+Math.floor(Math.random()*90),B='http://127.0.0.1:'+PORT;
  srv=spawn(process.execPath,['--disable-warning=ExperimentalWarning','server.js'],{env:{...process.env,PORT,DATA_DIR:tmp,SMS_PROVIDER:'none',SMTP_HOST:'127.0.0.1',SMTP_PORT:smtp.address().port,SMTP_SECURE:'none',SMTP_FROM:'MetroHome24 <no-reply@test.cd>',ADMIN_EMAIL:'admin@test.cd',ADMIN_PHONE:'0990000001',ADMIN_PASSWORD:'MotDePasseAdmin1!',PUBLIC_URL:'https://exemple.cd'},stdio:['ignore','ignore','inherit']});
  for(let i=0;i<50;i++){try{if((await fetch(B+'/api/health')).ok)break}catch{}await sleep(100)}
  const a=jar(B),o=jar(B),b=jar(B),anon=jar(B);let r;
  assert.equal((await anon('GET','/api/health')).mail,true);
  /* contact */
  assert.equal((await anon('POST','/api/contact',{name:'A',email:'x',message:'court'})).s,400);
  assert.equal((await anon('POST','/api/contact',{name:'Client',email:'client@test.cd',message:'Bonjour, une question sur une annonce.'})).s,201);
  assert.match((await mailTo('admin@test.cd','contact')).body,/client@test.cd/);
  await a('POST','/api/login',{id:'0990000001',password:'MotDePasseAdmin1!'});assert.equal((await a('GET','/api/admin/contacts')).contacts.length,1);
  /* pages, SEO */
  for(const p of ['/cgu','/confidentialite','/anti-fraude','/a-propos','/comment-ca-marche','/contact']){const x=await fetch(B+p);assert.equal(x.status,200,p);assert.match(await x.text(),/MetroHome24/)}
  const nf=await fetch(B+'/introuvable');assert.equal(nf.status,404);assert.match(await nf.text(),/Page introuvable/);
  assert.match(await (await fetch(B+'/robots.txt')).text(),/Sitemap: https:\/\/exemple\.cd\/sitemap\.xml/);assert.match(await (await fetch(B+'/sitemap.xml')).text(),/<urlset/);
  /* comptes */
  assert.equal((await o('POST','/api/register',{name:'Olivier Mwamba',phone:'0991110001',email:'olivier@test.cd',role:'Propriétaire',idno:'ID1111',password:'motdepasse1'})).s,201);
  assert.equal((await b('POST','/api/register',{name:'Bob Martin',phone:'0991110002',email:'bob@test.cd',role:'Chercheur',password:'motdepasse2'})).s,201);
  /* alertes + annonce approuvée => e-mails */
  assert.equal((await b('POST','/api/alerts',{label:'Maison à Golf',q:{tr:'Location',type:'Maison',q:'Golf',prixMax:600,chMin:2}})).s,201);
  assert.equal((await b('POST','/api/alerts',{label:'Vente villa',q:{tr:'Vente',type:'Villa'}})).s,201);
  assert.equal((await b('GET','/api/alerts')).alerts.length,2);
  r=await o('POST','/api/listings',{status:'En attente',listing:L,photos:[jpeg]});assert.equal(r.s,201);const id=r.id;
  await a('POST',`/api/admin/listings/${id}/decision`,{decision:'approve'});
  assert.match((await mailTo('olivier@test.cd','publiée')).body,/approuvée/);
  assert.match((await mailTo('bob@test.cd','Nouvelle annonce')).body,/Maison à Golf/);
  await sleep(200);assert.equal(mails.map(parse).filter(x=>x.to==='bob@test.cd'&&x.subject.includes('Nouvelle annonce')).length,1,'seule l’alerte correspondante déclenche un e-mail');
  /* favoris */
  assert.equal((await b('POST','/api/favorites',{listing_id:id,on:true})).s,200);assert.deepEqual((await b('GET','/api/favorites')).ids,[id]);
  assert.equal((await b('POST','/api/favorites',{listing_id:id,on:false})).s,200);assert.deepEqual((await b('GET','/api/favorites')).ids,[]);
  await b('POST','/api/favorites',{listing_id:id,on:true});
  /* messages, visites, avis */
  assert.equal((await b('POST','/api/reviews',{listing_id:id,stars:5,text:'Super bien'})).s,403,'avis seulement après une demande de visite');
  assert.equal((await b('POST','/api/messages',{listing_id:id,body:'Bonjour, disponible ?'})).s,201);assert.match((await mailTo('olivier@test.cd','Nouveau message')).body,/disponible/);
  assert.equal((await b('POST','/api/visits',{listing_id:id,date:'2026-12-01',hour:'09:00'})).s,201);await mailTo('olivier@test.cd','demande de visite');
  assert.equal((await b('POST','/api/reviews',{listing_id:id,stars:9,text:'x'})).s,400);
  assert.equal((await b('POST','/api/reviews',{listing_id:id,stars:5,text:'Bien conforme aux photos'})).s,200);
  assert.equal((await b('POST','/api/reviews',{listing_id:id,stars:4,text:'Mis à jour : très bien'})).s,200,'un seul avis par personne, modifiable');
  assert.equal((await o('POST','/api/reviews',{listing_id:id,stars:5,text:'Mon propre bien'})).s,403);
  const pub=(await anon('GET','/api/listings')).listings[0];assert.deepEqual(pub.rev,[{n:'Bob',s:4,t:'Mis à jour : très bien'}],'prénom seulement');
  /* export puis suppression de compte */
  const ex=await b('GET','/api/me/export');assert.equal(ex.reviews.length,1);assert.equal(ex.favorites.length,1);assert.equal(ex.alerts.length,2);assert.equal(ex.messages.length,1);
  assert.equal((await b('DELETE','/api/me',{password:'faux'})).s,401);assert.equal((await b('DELETE','/api/me',{password:'motdepasse2'})).s,200);
  assert.equal((await b('GET','/api/me')).user,null);assert.equal((await anon('POST','/api/login',{id:'bob@test.cd',password:'motdepasse2'})).s,401);
  assert.equal((await anon('GET','/api/listings')).listings[0].rev.length,0,'avis supprimés avec le compte');
  /* sauvegarde puis suppression du propriétaire */
  const env={...process.env,DATA_DIR:tmp,BACKUP_DIR:bk};execFileSync(process.execPath,['--disable-warning=ExperimentalWarning','backup.js'],{env});
  const d=fs.readdirSync(bk)[0];assert.ok(fs.statSync(path.join(bk,d,'metrohome24.db')).size>0);assert.ok(fs.readdirSync(path.join(bk,d,'uploads')).length>=1);
  const photo=pub.photos[0];assert.equal((await fetch(B+photo)).status,200);
  assert.equal((await o('DELETE','/api/me',{password:'motdepasse1'})).s,200);
  assert.equal((await anon('GET','/api/listings')).listings.length,0);assert.equal((await fetch(B+photo)).status,404,'photos supprimées');
  console.log('TESTS COMPLÉMENTAIRES : TOUT PASSE')
 }catch(e){console.error('ÉCHEC :',e.stack.split('\n').slice(0,4).join('\n'));process.exitCode=1}
 finally{if(srv)srv.kill();smtp.close();fs.rmSync(tmp,{recursive:true,force:true});fs.rmSync(bk,{recursive:true,force:true})}})();
