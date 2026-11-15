'use strict';
/* Envoi d'e-mails par SMTP, sans dépendance. SMTP_SECURE : starttls (port 587, défaut) | tls (port 465) | none (essais) */
const net=require('node:net'),tls=require('node:tls'),crypto=require('node:crypto');
const cfg=()=>({host:process.env.SMTP_HOST,secure:(process.env.SMTP_SECURE||'starttls').toLowerCase(),user:process.env.SMTP_USER,pass:process.env.SMTP_PASS,from:process.env.SMTP_FROM||process.env.SMTP_USER});
const enabled=()=>{const c=cfg();return !!(c.host&&c.from)};
const addr=s=>{const m=/<([^>]+)>/.exec(s);return(m?m[1]:String(s)).trim()};
const clean=s=>String(s).replace(/[\r\n]+/g,' ').trim();
const b64=s=>Buffer.from(s,'utf8').toString('base64');
function reader(sock){const ready=[],waiters=[];let buf='',cur=[];
 sock.on('data',d=>{buf+=d.toString('utf8');let i;while((i=buf.indexOf('\n'))>=0){const l=buf.slice(0,i).replace(/\r$/,'');buf=buf.slice(i+1);cur.push(l);
  if(/^\d{3}( |$)/.test(l)){const r=cur.join('\n');cur=[];const w=waiters.shift();w?w.ok(r):ready.push(r)}}});
 const die=e=>{while(waiters.length)waiters.shift().ko(e)};sock.on('error',die);sock.on('close',()=>die(new Error('connexion fermée')));
 return()=>ready.length?Promise.resolve(ready.shift()):new Promise((ok,ko)=>waiters.push({ok,ko}))}
async function sendMail({to,subject,text}){const c=cfg();if(!enabled())return false;
 const port=+process.env.SMTP_PORT||(c.secure==='tls'?465:c.secure==='none'?25:587);
 let sock=await new Promise((ok,ko)=>{const s=c.secure==='tls'?tls.connect({host:c.host,port,servername:c.host},()=>ok(s)):net.connect({host:c.host,port},()=>ok(s));s.once('error',ko);s.setTimeout(20000,()=>s.destroy(new Error('délai SMTP dépassé')))});
 let next=reader(sock);
 const cmd=async(l,ok)=>{sock.write(l+'\r\n');const r=await next();if(!r.startsWith(ok))throw new Error('SMTP « '+l.split(' ')[0]+' » refusé : '+r.slice(0,100));return r};
 try{const g=await next();if(!g.startsWith('220'))throw new Error('SMTP accueil : '+g.slice(0,100));
  await cmd('EHLO metrohome24','250');
  if(c.secure==='starttls'){await cmd('STARTTLS','220');sock.removeAllListeners('data');sock.removeAllListeners('close');sock.removeAllListeners('error');sock.on('error',()=>{});
   sock=await new Promise((ok,ko)=>{const s=tls.connect({socket:sock,servername:c.host},()=>ok(s));s.once('error',ko)});next=reader(sock);await cmd('EHLO metrohome24','250')}
  if(c.user){await cmd('AUTH LOGIN','334');await cmd(b64(c.user),'334');await cmd(b64(c.pass||''),'235')}
  await cmd('MAIL FROM:<'+addr(c.from)+'>','250');await cmd('RCPT TO:<'+addr(to)+'>','250');await cmd('DATA','354');
  const body=b64(text).match(/.{1,76}/g).join('\r\n');
  const msg=[`From: ${clean(c.from)}`,`To: ${clean(to)}`,`Subject: =?UTF-8?B?${b64(clean(subject))}?=`,`Date: ${new Date().toUTCString()}`,`Message-ID: <${crypto.randomUUID()}@metrohome24>`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',body].join('\r\n');
  await cmd(msg+'\r\n.','250');sock.write('QUIT\r\n');await Promise.race([next().catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);return true}
 finally{sock.destroy()}}
module.exports={sendMail,enabled};
