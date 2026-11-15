/* MetroHome24 : fonctions avancées (avis, messages, paiement simulé, profil, analyses, services) */
V.push('services','admin');
let me=null,msgs=[],txs=[],prefs={nouvelles:true,visites:true,messages:true,prix:false};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AM={Maison:['Eau','Électricité','Clôture','Parking'],Villa:['Piscine','Jardin','Gardien','Parking'],Appartement:['Ascenseur','Groupe électrogène','Climatisation'],Studio:['Eau','Électricité'],Parcelle:['Accès route','Titre à vérifier'],Terrain:['Accès route'],Boutique:['Rideau métallique','Électricité'],Bureau:['Climatisation','Internet'],Entrepôt:['Accès camions','Courant triphasé']};
L.forEach(l=>{l.am=l.am||AM[l.type]||[];l.near=l.near||['École','Marché','Transport'];l.rev=l.rev||[]});
if(L[0]&&!L[0].rev.length)L[0].rev=[{n:'Aline K.',s:5,t:'Bien conforme aux photos, propriétaire sérieux.'}];
const avg=l=>l.rev&&l.rev.length?l.rev.reduce((a,r)=>a+r.s,0)/l.rev.length:0;
const rt=l=>l.rev&&l.rev.length?`★ ${avg(l).toFixed(1)} (${l.rev.length} avis)`:'Pas encore d’avis';
function open(id){const l=L.find(x=>x.id===id),i=l.id%6;l.views=(l.views||0)+1;const ph=(l.owner&&l.owner.phone)||CONFIG.phone;
 const gm='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(l.q+' '+l.vi),
 lk=(u,t)=>u?`<a class="btn o s" href="${esc(u)}" target="_blank" rel="noopener">${t}</a>`:'',
 sh=encodeURIComponent(l.t+' sur MetroHome24 '+location.href.split('#')[0]);
 $('#dlg').innerHTML=`<div class="dh">${gal(l)}</div><div class="db">
 <div class="row" style="justify-content:space-between;margin:0"><div><div class="pr">${price(l)}</div><h3 style="margin:0">${esc(l.t)}</h3><div class="mu">${esc(l.q)}${l.c?', '+esc(l.c):''}, ${l.vi} · ${l.type} · ${l.m2} m²${l.ch?' · '+l.ch+' ch. · '+l.bain+' sdb':''}</div><div class="mu">${rt(l)}</div></div><button class="btn o s" data-close>Fermer</button></div>
 <p>${esc(l.desc)}</p>
 <div><b>Équipements</b><br>${l.am.map(a=>`<span class="tag">${esc(a)}</span>`).join('')}</div>
 <div style="margin-top:8px"><b>À proximité</b><br>${l.near.map(a=>`<span class="tag w">${esc(a)}</span>`).join('')}</div>
 <div class="row">${lk(l.tour,'Visite virtuelle 360°')}${lk(l.video,'Vidéo')}${lk(l.plan,'Plan du bien')}<a class="btn o s" href="${gm}" target="_blank" rel="noopener">Voir sur la carte</a></div>
 <div class="fee"><b>Conditions annoncées</b><br>Caution et avance : ${esc(l.cond)}<br>Frais de visite : ${esc(l.fv)}<br>Honoraires : ${esc(l.hon)}</div>
 <div class="fee"><b>Publié par</b> ${l.owner?esc(l.owner.name)+' · '+l.owner.role+(l.owner.phoneVerified===false?'':' · téléphone vérifié'):l.pub}</div><div><span class="tag">${l.pub}</span>${l.v.map(v=>`<span class="tag ${v==='Non vérifié'?'r':v==='Bien inspecté'?'w':''}">${v}</span>`).join('')}</div>
 <p class="mu">Une identité vérifiée ne garantit pas à elle seule la propriété légale. Ne payez jamais avant d’avoir vu le bien et les documents.</p>
 <div class="row"><a class="btn s" href="tel:+${ph}">Appeler</a><a class="btn o s" href="https://wa.me/${ph}" target="_blank" rel="noopener">WhatsApp</a><button class="btn o s" data-f="${l.id}">${favs.has(l.id)?'♥ Retirer':'♡ Favori'}</button><button class="btn o s" data-rep="${l.id}">Signaler</button>
 <a class="btn o s" href="https://wa.me/?text=${sh}" target="_blank" rel="noopener">Partager</a><a class="btn o s" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href.split('#')[0])}" target="_blank" rel="noopener">Facebook</a></div>
 <h3 style="margin-top:18px">Poser une question</h3><textarea id="iq" rows="2" placeholder="Bonjour, le bien est-il toujours disponible ?"></textarea><div class="row"><button class="btn s" data-inq="${l.id}">Envoyer</button></div>
 <h3 style="margin-top:18px">Demander une visite</h3><div class="two"><label>Date<input type="date" id="vd"></label><label>Plage horaire<select id="vh"><option>09:00</option><option>11:00</option><option>14:00</option><option>16:00</option></select></label></div><div class="row"><button class="btn s" data-visit="${l.id}">Envoyer la demande</button></div>
 ${CONFIG.payments?`<h3 style="margin-top:18px">Paiement (simulation)</h3><div class="two"><label>Montant (${l.dev})<input type="number" id="pa" value="${l.tr==='Location'?l.prix:Math.round(l.prix*0.01)}"></label><label>Mode<select id="pm"><option>Airtel Money</option><option>M-Pesa</option><option>Orange Money</option><option>Carte bancaire</option></select></label></div><div class="row"><button class="btn s" data-pay="${l.id}">${l.tr==='Location'?'Payer le loyer':'Verser un acompte'}</button></div>
 `:''}<h3 style="margin-top:18px">Avis (${l.rev.length})</h3>${l.rev.map(r=>`<p><b>${esc(r.n)}</b> ${'★'.repeat(r.s)}<br>${esc(r.t)}</p>`).join('')||'<p class="mu">Soyez le premier à donner votre avis.</p>'}
 <div class="two"><label>Note<select id="rs"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></label><label>Commentaire<input id="rtx"></label></div><div class="row"><button class="btn o s" data-rev="${l.id}">Publier l’avis</button></div>
 <h3 style="margin-top:18px">Biens similaires</h3><div class="row">${L.filter(x=>x.id!==l.id&&x.st==='Active'&&(x.q===l.q||x.type===l.type)).slice(0,3).map(x=>`<button class="chip" data-sim="${x.id}">${esc(x.t)}</button>`).join('')||'<span class="mu">Aucun pour le moment.</span>'}</div></div>`;
 if(!$('#dlg').open)$('#dlg').showModal()}
function recoHTML(){const ty=new Set(L.filter(l=>favs.has(l.id)).map(l=>l.type));
 const r=L.filter(l=>l.st==='Active'&&!favs.has(l.id)&&(!ty.size||ty.has(l.type))).slice(0,3);
 return(r.length?r:L.filter(l=>l.st==='Active').slice(0,3)).map(card).join('')}
function renderMine(){const m=L.filter(l=>l.mine),c=s=>m.filter(l=>l.st===s).length;
 $('#stats').innerHTML=[['Biens publiés',m.length],['Actives',c('Active')],['En attente',c('En attente')],['Messages',msgs.length]].map(([a,b])=>`<div class="box"><div class="pr">${b}</div><div class="mu">${a}</div></div>`).join('');
 $('#mine').innerHTML=m.length?m.map(l=>`<tr><td>${esc(l.t)}</td><td>${l.st}${l.reason?' : '+esc(l.reason):''}</td><td>${l.views||0}</td></tr>`).join(''):'<tr><td colspan="3" class="mu">Aucune annonce. Publiez votre premier bien.</td></tr>';
 $('#visits').innerHTML=visits.length?visits.map(v=>`<p><b>${esc(v.t)}</b> · ${v.date} à ${v.h} · <span class="tag w">En attente</span></p>`).join(''):'<p class="mu">Aucune demande pour le moment.</p>';
 $('#msgs').innerHTML=msgs.length?msgs.map(x=>`<p><b>${esc(x.t)}</b><br>${esc(x.m)}<br><span class="mu">Réponse : en attente</span></p>`).join(''):'<p class="mu">Aucun message.</p>';
 $('#txs').innerHTML=txs.length?`<table><tr><th>Bien</th><th>Montant</th><th>Mode</th><th>Statut</th><th></th></tr>${txs.map((x,i)=>`<tr><td>${esc(x.t)}</td><td>${x.a}</td><td>${x.m}</td><td>${x.st}</td><td>${x.st.startsWith('Payé')?`<button class="btn o s" data-rf="${i}">Remboursement</button>`:''}</td></tr>`).join('')}</table>`:'<p class="mu">Aucune transaction.</p>';
 const top=[...L].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5),mx=Math.max(1,...top.map(l=>l.views||0));
 const loc=L.filter(l=>l.tr==='Location'&&l.dev==='USD'),q={};loc.forEach(l=>{(q[l.q]=q[l.q]||[]).push(l.prix)});
 $('#anl').innerHTML='<b>Consultations par annonce</b>'+top.map(l=>`<div class="mu">${esc(l.t)}</div><div style="background:var(--g);height:8px;border-radius:4px;width:${Math.max(2,(l.views||0)/mx*100)}%"></div>`).join('')+'<p><b>Loyer moyen par quartier (USD)</b></p><table>'+Object.entries(q).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${Math.round(v.reduce((a,b)=>a+b)/v.length)}</td></tr>`).join('')+'</table>';
 $('#prefs').innerHTML=[['nouvelles','Nouvelles annonces correspondant à mes alertes'],['visites','Demandes et confirmations de visite'],['messages','Nouveaux messages'],['prix','Baisses de prix de mes favoris']].map(([k,t])=>`<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" style="width:auto;margin:0" data-pref="${k}" ${prefs[k]?'checked':''}>${t}</label>`).join('');
 const ve=me?me.ver:{};
 $('#profile').innerHTML=me?`<p><b>${esc(me.name)}</b> · ${me.role} · ${esc(me.phone)+' · '+esc(me.email)}</p>`+[['phone','Téléphone'],['mail','E-mail'],['id','Pièce d’identité']].map(([k,t])=>`<p>${t} : ${ve[k]?'<span class="tag">Vérifié</span>':`<button class="btn o s" data-ver="${k}">Vérifier</button>`}</p>`).join('')+'<button class="btn o s" id="logout">Se déconnecter</button>':'<p class="mu">Connectez-vous pour gérer votre profil et vos vérifications.</p><button class="btn s" data-login>Se connecter</button>';
 $('#login').textContent=me?'Bonjour, '+me.name.split(' ')[0]:'Se connecter';
 $('#reco').innerHTML=recoHTML()}
document.addEventListener('click',e=>{const t=e.target,d=a=>t.closest('['+a+']');
 if(t.id==='login'||d('data-login')){me?location.hash='#compte':$('#ldlg').showModal();return}
 if(t.id==='logout'){me=null;renderMine();toast('Déconnecté');return}
 if(t.dataset.soc){toast(t.dataset.soc+' : connexion disponible avec le back-end');return}
 let x=d('data-inq');if(x){const m=$('#iq').value.trim();if(!m){toast('Écrivez un message');return}msgs.push({t:L.find(l=>l.id==x.dataset.inq).t,m});toast('Message envoyé');$('#dlg').close();renderMine();return}
 x=d('data-pay');if(x){if(!me){$('#dlg').close();$('#ldlg').showModal();toast('Connectez-vous pour payer');return}const l=L.find(l=>l.id==x.dataset.pay),a=+$('#pa').value;if(!a){toast('Montant invalide');return}txs.push({t:l.t,a:fmt(a)+' '+l.dev,m:$('#pm').value,st:'Payé (simulation)'});toast('Paiement simulé enregistré');$('#dlg').close();renderMine();return}
 x=d('data-rf');if(x){txs[+x.dataset.rf].st='Remboursement demandé';renderMine();toast('Demande de remboursement envoyée');return}
 x=d('data-rev');if(x){const l=L.find(l=>l.id==x.dataset.rev),s=+$('#rs').value,tx=$('#rtx').value.trim();if(!tx){toast('Ajoutez un commentaire');return}l.rev.push({n:me?me.name:'Visiteur',s,t:tx});open(l.id);toast('Avis publié');return}
 x=d('data-ver');if(x){if(!me)return;me.ver[x.dataset.ver]=true;renderMine();toast('Vérification simulée : un vrai code sera envoyé avec le back-end');return}
 x=d('data-svc');if(x){msgs.push({t:'Service : '+x.dataset.svc,m:'Demande de devis'});toast('Demande de devis envoyée');renderMine();return}
 if(t.id==='lx'||t===$('#ldlg')){$('#ldlg').close()}
 if(t.id==='sup'){const m=$('#sm').value.trim();if(!m){toast('Écrivez votre message');return}$('#sm').value='';toast('Message envoyé au support')}});
document.addEventListener('change',e=>{if(e.target.dataset.pref){prefs[e.target.dataset.pref]=e.target.checked;toast('Préférence enregistrée')}});
document.querySelectorAll('#mail').forEach(e=>e.textContent=CONFIG.email);document.querySelectorAll('#tel').forEach(e=>e.textContent='+'+CONFIG.phone);
