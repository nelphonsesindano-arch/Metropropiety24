/* MetroHome24 : favoris, alertes, avis et compte synchronisés avec le serveur ; nettoyage des éléments de démonstration */
(()=>{
const call=async(m,u,b)=>{const r=await fetch(u,{method:m,credentials:'include',headers:m==='GET'?{}:{'Content-Type':'application/json'},body:m==='GET'?undefined:JSON.stringify(b||{})});
 let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||'Erreur ('+r.status+')');return j};
let rows=[];
const showAlerts=()=>{const ul=$('#alerts');if(ul)ul.innerHTML=rows.map(a=>`<li>${esc(a.label)} <button class="btn o s" data-adel="${a.id}">Supprimer</button></li>`).join('')};
/* éléments de démonstration masqués tant que les vraies données n'existent pas */
const soon=id=>{const s=document.getElementById(id);if(s)s.innerHTML='<h2>Bientôt disponible</h2><p class="lead">Cette section ouvrira prochainement.</p>'};
if(!CONFIG.services){soon('v-services');document.querySelector('#nav a[href="#services"]')?.remove()}
if(!CONFIG.agencies){soon('v-agences');document.querySelector('#nav a[href="#agences"]')?.remove()}
if(!CONFIG.payments){const h=[...document.querySelectorAll('#v-compte h2')].find(x=>x.textContent.includes('Paiements'));if(h){h.hidden=true;const t=$('#txs');if(t)t.hidden=true}}
fetch('/api/health',{credentials:'include'}).then(r=>{if(r.ok){const p=$('#proto');if(p)p.remove()}}).catch(()=>{});
/* appelé par api.js après chaque rechargement des données */
window.mhAfter=async()=>{
 if(!me){favs.clear();rows=[];alerts.length=0;showAlerts();return}
 try{const f=(await call('GET','/api/favorites')).ids;
  for(const id of [...favs])if(!f.includes(id))await call('POST','/api/favorites',{listing_id:id,on:true}).catch(()=>{});
  favs.clear();(await call('GET','/api/favorites')).ids.forEach(i=>favs.add(i));
  rows=(await call('GET','/api/alerts')).alerts;alerts.length=0;rows.forEach(a=>alerts.push(a.label));showAlerts();render()}catch(e){}};
const _r=window.renderMine;
window.renderMine=function(){_r();if(window.API&&me&&$('#profile')&&!$('#exp'))$('#profile').insertAdjacentHTML('beforeend','<div class="row" style="margin-top:10px"><button class="btn o s" id="exp">Télécharger mes données</button><button class="btn o s" id="del">Supprimer mon compte</button></div>')};
document.addEventListener('click',e=>{if(!window.API)return;const t=e.target,d=a=>t.closest('['+a+']');
 let x=d('data-f');if(x){const id=+x.dataset.f;setTimeout(()=>{if(me)call('POST','/api/favorites',{listing_id:id,on:favs.has(id)}).catch(y=>toast(y.message))},0);return}
 if(t.id==='alert'){e.stopPropagation();const g=i=>$(i).value,q={tr:g('#f-tr'),type:g('#f-ty'),vi:g('#f-vi'),q:g('#f-qu'),prixMax:+g('#f-px')||0,chMin:+g('#f-ch')||0};
  const label=[q.tr,q.type,q.vi,q.q,q.prixMax&&'≤ '+q.prixMax+' USD',q.chMin&&q.chMin+'+ ch.'].filter(Boolean).join(' · ')||'Toutes les annonces';
  if(!me){$('#ldlg').showModal();toast('Connectez-vous pour recevoir des alertes par e-mail');return}
  call('POST','/api/alerts',{label,q}).then(()=>{toast('Alerte créée : vous serez prévenu par e-mail');return window.mhAfter()}).catch(y=>toast(y.message));return}
 x=d('data-adel');if(x){call('DELETE','/api/alerts/'+x.dataset.adel).then(()=>window.mhAfter()).catch(y=>toast(y.message));return}
 x=d('data-rev');if(x){e.stopImmediatePropagation();if(!me){if($('#dlg').open)$('#dlg').close();$('#ldlg').showModal();toast('Connectez-vous pour donner un avis');return}
  const id=+x.dataset.rev;call('POST','/api/reviews',{listing_id:id,stars:+$('#rs').value,text:$('#rtx').value}).then(async()=>{await window.mhRefresh();open(id);toast('Avis publié')}).catch(y=>toast(y.message));return}
 if(t.id==='exp'){call('GET','/api/me/export').then(j=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(j,null,2)],{type:'application/json'}));a.download='metrohome24-mes-donnees.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}).catch(y=>toast(y.message));return}
 if(t.id==='del'){const pw=prompt('Supprimer définitivement votre compte, vos annonces et vos photos ?\nEntrez votre mot de passe pour confirmer.');if(!pw)return;
  call('DELETE','/api/me',{password:pw}).then(()=>{me=null;location.hash='#accueil';return window.mhRefresh()}).then(()=>toast('Compte supprimé')).catch(y=>toast(y.message))}
},true);
})();
