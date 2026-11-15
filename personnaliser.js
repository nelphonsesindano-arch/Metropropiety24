'use strict';
/* Remplit vos informations légales dans toutes les pages. Usage : npm run personnaliser   (ou : npm run personnaliser -- --verifier) */
const fs=require('node:fs'),path=require('node:path'),rl=require('node:readline/promises');
const PUB=path.join(__dirname,'public'),pages=fs.readdirSync(PUB).filter(f=>f.endsWith('.html')).map(f=>path.join(PUB,f));
const left=()=>pages.flatMap(f=>(fs.readFileSync(f,'utf8').match(/\[[A-ZÉ°/ ]{4,40}\]|\[fournisseurs à préciser\]/g)||[]).map(m=>path.basename(f)+' : '+m));
(async()=>{
 if(process.argv.includes('--verifier')){const l=left();console.log(l.length?'Champs encore à remplir :\n'+l.join('\n'):'Aucun champ à remplir : les pages sont complètes.');return}
 const r=rl.createInterface({input:process.stdin,output:process.stdout});
 const it=r[Symbol.asyncIterator]();
 const ask=async(q,d='')=>{process.stdout.write(q+(d?' ['+d+']':'')+' : ');const x=await it.next();return((x.value||'').trim()||d)};
 const v={nom:await ask('Nom légal de la société'),adr:await ask('Adresse complète'),rccm:await ask('N° RCCM / ID NAT'),mail:await ask('E-mail de contact'),tel:await ask('Téléphone / WhatsApp (ex. 243990000000)')};
 r.close();
 for(const f of pages){let t=fs.readFileSync(f,'utf8');
  t=t.replaceAll('[NOM LÉGAL DE LA SOCIÉTÉ]',v.nom).replaceAll('[ADRESSE]',v.adr).replaceAll('[N° RCCM / ID NAT]',v.rccm).replaceAll('[E-MAIL DE CONTACT]',v.mail);fs.writeFileSync(f,t)}
 const dp=path.join(PUB,'assets','data.js');let d=fs.readFileSync(dp,'utf8');
 d=d.replace(/email:'[^']*'/,"email:'"+v.mail.replace(/'/g,'')+"'").replace(/phone:'[^']*'/,"phone:'"+(t=>t.startsWith('0')?'243'+t.slice(1):t)(v.tel.replace(/\D/g,''))+"'");fs.writeFileSync(dp,d);
 console.log('Terminé. Il reste à préciser vos fournisseurs dans confidentialite.html, puis à faire relire les textes par un juriste.');const l=left();if(l.length)console.log(l.join('\n'))})();
