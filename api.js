/* MetroHome24 : liaison avec le serveur. Si /api/health ne répond pas, le site reste en mode prototype. */
document.addEventListener('submit',e=>e.preventDefault());
(async()=>{
const A=(typeof CONFIG.api==='string')?CONFIG.api:'';
const call=async(m,u,b)=>{const r=await fetch(A+u,{method:m,credentials:'include',headers:m==='GET'?{}:{'Content-Type':'application/json'},body:m==='GET'?undefined:JSON.stringify(b||{})});
 let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||'Erreur serveur ('+r.status+')');return j};
let SMS=false;try{SMS=!!(await call('GET','/api/health')).sms}catch(e){return}
window.API=true;window.mhRefresh=()=>refresh();
let editId=null,editPh=[];
const setMe=u=>{me=u?{...u,ver:{}}:null};
const mini=u=>`<img src="${u}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px">`;
/* ---------- données ---------- */
async function adminExtras(){if(!(me&&me.isAdmin))return;
 try{const[r,u]=await Promise.all([call('GET','/api/admin/reports'),call('GET','/api/admin/users')]);
  $('#arep').innerHTML=r.reports.length?r.reports.map(x=>`<p>Annonce n°${x.listing_id} : ${esc(x.reason)} <span class="mu">(${esc(x.uname||'?')})</span></p>`).join(''):'<p class="mu">Aucun signalement.</p>';
  $('#ausers').innerHTML='<table>'+u.users.map(x=>`<tr><td>${esc(x.name)}<br><span class="mu">${esc(x.phone)} · ${esc(x.email)}</span></td><td>${x.role}${x.banned?' · <b>banni</b>':''}</td><td>${x.is_admin?'':`<button class="btn o s" data-${x.banned?'unban':'ban'}="${x.id}">${x.banned?'Réactiver':'Bannir'}</button> <button class="btn o s" data-rpw="${x.id}">Mot de passe</button>`}</td></tr>`).join('')+'</table>'}catch(e){}}
async function refresh(){
 try{const map=new Map();(await call('GET','/api/listings')).listings.forEach(l=>map.set(l.id,l));
  if(me){(await call('GET','/api/my')).listings.forEach(l=>{l.mine=true;map.set(l.id,l)});
   if(me.isAdmin)(await call('GET','/api/admin/listings')).listings.forEach(l=>{const o=map.get(l.id);map.set(l.id,Object.assign(l,{mine:!!(o&&o.mine)}))});
   const ib=await call('GET','/api/inbox');msgs.length=0;visits.length=0;
   ib.sent.forEach(x=>x.k==='message'?msgs.push({t:x.listing,m:x.body}):visits.push({t:x.listing,date:x.d,h:x.h}));
   const box=$('#inbox');if(box)box.innerHTML=ib.received.length?ib.received.map(x=>`<p><b>${x.k==='visite'?'Demande de visite':'Message'}</b> · ${esc(x.listing)}<br>${esc(x.body)}<br><span class="mu">${esc(x.from)} · ${esc(x.phone)}</span></p>`).join(''):'<p class="mu">Aucune demande reçue.</p>'}
  L.length=0;L.push(...[...map.values()].sort((a,b)=>b.d-a.d))}catch(e){toast(e.message)}
 render();renderMine();if(location.hash==='#admin')renderAdmin();adminExtras();window.mhAfter&&window.mhAfter()}
/* ---------- interface ajoutée ---------- */
const hs=[...document.querySelectorAll('#v-compte h2')].find(h=>h.textContent.trim()==='Messages');
if(hs)hs.insertAdjacentHTML('beforebegin','<h2>Demandes reçues</h2><div class="box" id="inbox"><p class="mu">Connectez-vous pour voir les demandes reçues.</p></div>');
$('#v-admin').insertAdjacentHTML('beforeend','<h2>Signalements</h2><div class="box" id="arep"></div><h2>Comptes</h2><div class="box sc" id="ausers"></div>');
$('#pf').insertAdjacentHTML('beforebegin','<div class="fee" id="ebar" hidden>Vous modifiez une annonce : elle sera revalidée par l’équipe avant d’être de nouveau visible. <button class="btn o s" type="button" id="cedit">Annuler la modification</button></div>');
$('#pv').insertAdjacentHTML('beforebegin','<div class="row" id="pvx"></div>');
const lk=$('#lk');if(lk)lk.parentElement.hidden=true;
const go=$('#lgo');if(go){go.textContent='Créer mon compte';
 go.closest('.row').insertAdjacentHTML('beforebegin','<label>Mot de passe (8 caractères minimum)<input id="lpw" type="password" autocomplete="new-password"></label><label id="lil">N° de pièce d’identité (obligatoire pour publier)<input id="li"></label>');
 go.closest('.row').insertAdjacentHTML('afterend','<h3 style="margin-top:14px">Déjà inscrit ?</h3><label>Téléphone ou e-mail<input id="lq" autocomplete="username"></label><label>Mot de passe<input id="lqp" type="password" autocomplete="current-password"></label><div class="row"><button class="btn o" id="lin">Se connecter</button><button class="btn o s" id="lfg" type="button">Mot de passe oublié ?</button></div><div id="lfb" hidden><p class="mu">Indiquez votre téléphone ou e-mail ci-dessus, puis demandez un code par SMS.</p><div class="row"><button class="btn o s" id="lfs" type="button">Envoyer le code</button></div><label>Code reçu par SMS<input id="lfc" inputmode="numeric" maxlength="6"></label><label>Nouveau mot de passe<input id="lfp" type="password" autocomplete="new-password"></label><div class="row"><button class="btn s" id="lfr" type="button">Changer le mot de passe</button></div></div>');
 const pm=[...$('#ldlg').querySelectorAll('p.mu')].find(p=>/Prototype|SMS/.test(p.textContent));if(pm)pm.textContent='Votre mot de passe est stocké de façon chiffrée.'}
const sync=()=>{const r=$('#lr'),l=$('#lil');if(r&&l)l.hidden=r.value==='Chercheur'};document.addEventListener('change',e=>{if(e.target.id==='lr')sync()});sync();
/* ---------- Mon espace : annonces, profil ---------- */
const acts=l=>{const ok=['Active','Louée','Vendue','Suspendue'].includes(l.st),done=l.tr==='Location'?'Louée':'Vendue';
 return `<button class="btn o s" data-edit="${l.id}">Modifier</button> `+(l.st==='Active'?`<button class="btn o s" data-st="${l.id}" data-to="${done}">Marquer ${done.toLowerCase()}</button> <button class="btn o s" data-st="${l.id}" data-to="Suspendue">Suspendre</button> `:ok?`<button class="btn o s" data-st="${l.id}" data-to="Active">Réactiver</button> `:'')+`<button class="btn o s" data-del="${l.id}">Supprimer</button>`};
const _rm=window.renderMine;
window.renderMine=function(){_rm();
 const th=$('#mine').closest('table').querySelector('thead tr');if(th&&th.children.length===3)th.insertAdjacentHTML('beforeend','<th>Actions</th>');
 const m=L.filter(l=>l.mine);
 $('#mine').innerHTML=m.length?m.map(l=>`<tr><td>${esc(l.t)}</td><td>${l.st}${l.reason?' : '+esc(l.reason):''}</td><td>${l.views||0}</td><td>${acts(l)}</td></tr>`).join(''):'<tr><td colspan="4" class="mu">Aucune annonce. Publiez votre premier bien.</td></tr>';
 if(me){const ph=me.phoneVerified?'<span class="tag">✔ Vérifié</span>':SMS?'<button class="btn o s" data-otps>Recevoir un code SMS</button> <input id="otpc" inputmode="numeric" maxlength="6" placeholder="Code à 6 chiffres" style="width:11em"> <button class="btn s" data-otpv>Valider</button>':'<span class="tag r">Non vérifié</span> <span class="mu">(SMS non activé)</span>';
  $('#profile').innerHTML=`<p><b>${esc(me.name)}</b> · ${me.role} · ${esc(me.phone)} · ${esc(me.email)}</p><p>Téléphone : ${ph}</p><p>Pièce d’identité : ${me.idno?'fournie, contrôle par l’équipe':'non fournie'}</p><details><summary><b>Changer mon mot de passe</b></summary><label>Ancien mot de passe<input id="pw0" type="password" autocomplete="current-password"></label><label>Nouveau (8 caractères min.)<input id="pw1" type="password" autocomplete="new-password"></label><div class="row"><button class="btn s" data-pw>Enregistrer</button></div></details><div class="row"><button class="btn o s" id="logout">Se déconnecter</button></div>`}};
/* ---------- modification d’une annonce ---------- */
function pvx(){$('#pvx').innerHTML=editPh.map((u,i)=>`<span style="position:relative">${mini(u)}<button type="button" data-rmph="${i}" aria-label="Retirer la photo" style="position:absolute;top:-6px;right:-6px;border:0;border-radius:50%;width:22px;height:22px;cursor:pointer">✕</button></span>`).join('');$('#ebar').hidden=!editId}
function cancelEdit(){editId=null;editPh=[];window.pend=[];$('#pf').reset();$('#pv').innerHTML='';pvx();step=0;showStep()}
function startEdit(l){editId=l.id;editPh=(l.photos||[]).slice();window.pend=[];$('#pv').innerHTML='';
 const f=$('#pf').elements,set=(k,v)=>{if(f[k])f[k].value=v==null?'':v};
 ['t','type','tr','vi','q','ch','bain','m2','prix','dev','cond','desc'].forEach(k=>set(k,l[k]));
 if(window.setLieu)setLieu(l.vi,l.c);
 set('fv',l.fv==='Aucun'?'Aucun':'Oui, annoncés ci-dessous');set('fvm',(l.fv||'').startsWith('Oui : ')?l.fv.slice(6):'');
 const mm=/^(.*) \((.*)\)$/.exec(l.hon||'');set('hon',mm?mm[1]:'');set('qui',mm?mm[2]:'');$('#mand').checked=false;
 step=0;showStep();pvx();location.hash='#publier'}
addEventListener('hashchange',()=>{if(editId&&location.hash!=='#publier')cancelEdit()});
const _ss=window.showStep;window.showStep=function(){_ss();if(editId&&step===3)$('#next').textContent='Enregistrer les modifications'};
/* ---------- règles d’accès ---------- */
window.gate=function(h){
 if(h==='publier'){
  if(!me){window.want=1;$('#ldlg').showModal();toast('Créez un compte pour publier un bien');return 'accueil'}
  if(me.role==='Chercheur'&&!confirm('Votre compte est de type Chercheur. Passer en compte Propriétaire pour publier ?'))return 'accueil';
  if(me.role==='Chercheur'||!me.idno){const id=prompt('Numéro de pièce d’identité (obligatoire pour publier) ?');if(!id||id.trim().length<4)return 'accueil';
   const role=me.role==='Chercheur'?'Propriétaire':me.role;me.role=role;me.idno=id.trim();call('PATCH','/api/me',{role,idno:me.idno}).then(r=>{setMe(r.user);renderMine()}).catch(e=>toast(e.message))}
  if(SMS&&!me.phoneVerified){toast('Vérifiez votre numéro par SMS dans Mon espace pour publier');return 'compte'}
  const s=$('#pubrole');s.value=me.role;s.dispatchEvent(new Event('change'));s.style.pointerEvents='none';s.style.opacity='.7'}
 if(h==='admin'&&!(me&&me.isAdmin)){toast('Accès réservé à l’administrateur');return 'accueil'}
 return h};
/* ---------- publication / modification ---------- */
window.save=async function(st){
 if(!me){toast('Créez un compte pour publier');$('#ldlg').showModal();return false}
 const d=Object.fromEntries(new FormData($('#pf')));d.pub=me.role==='Chercheur'?'Propriétaire':me.role;
 const np=editPh.length+(window.pend||[]).length;
 if(!d.t||!d.prix||!d.q){toast('Titre, quartier et prix sont obligatoires');return false}
 if(st!=='Brouillon'&&!np){toast('Ajoutez au moins une photo');return false}
 if(np>5){toast('5 photos maximum');return false}
 if(d.pub!=='Propriétaire'&&(!d.hon||!d.qui||!$('#mand').checked)){toast('Honoraires, payeur et mandat sont obligatoires pour un intermédiaire');return false}
 const body={status:st,mandat:$('#mand').checked,photos:[...editPh,...(window.pend||[])],listing:{t:d.t,type:d.type,tr:d.tr,vi:d.vi,c:d.c||'',q:d.q,prix:+d.prix,dev:d.dev,ch:+d.ch,bain:+d.bain,m2:+d.m2,cond:d.cond||'Non précisé',fv:d.fv==='Aucun'?'Aucun':'Oui : '+(d.fvm||'montant à préciser'),hon:d.pub==='Propriétaire'?'Aucun':d.hon+' ('+d.qui+')',desc:d.desc||''}};
 try{const was=editId;await call(was?'PATCH':'POST',was?'/api/listings/'+was:'/api/listings',body);
  editId=null;editPh=[];$('#pf').reset();window.pend=[];$('#pv').innerHTML='';pvx();step=0;showStep();await refresh();
  toast(st==='Brouillon'?'Brouillon enregistré':was?'Modifications envoyées : l’annonce sera revalidée':'Annonce soumise : elle sera visible après validation');location.hash='#compte';return true}
 catch(e){toast(e.message);return false}};
const _ra=window.renderAdmin;
window.renderAdmin=function(){_ra();const dn=L.filter(l=>['Active','Refusée'].includes(l.st)).slice(0,30);
 $('#adone').innerHTML=dn.length?dn.map(l=>`<p>${esc(l.t)} : ${l.st}${l.reason?' ('+esc(l.reason)+')':''} · ${esc(l.owner?l.owner.name:'')}</p>`).join(''):'<p class="mu">Aucune décision.</p>'};
/* ---------- clics interceptés avant le code du prototype ---------- */
document.addEventListener('click',e=>{const t=e.target,d=a=>t.closest('['+a+']'),stop=()=>e.stopImmediatePropagation();
 const need=()=>{if(me)return true;$('#dlg').open&&$('#dlg').close();$('#ldlg').showModal();toast('Connectez-vous pour continuer');return false};
 const fail=y=>toast(y.message),ok=(m,f)=>()=>{toast(m);return f?f():refresh()};
 if(t.id==='lgo'){stop();(async()=>{try{const role=$('#lr').value;
   const r=await call('POST','/api/register',{name:$('#ln').value,phone:$('#lp').value,email:$('#lm').value,role,idno:role==='Chercheur'?'':$('#li').value,password:$('#lpw').value});
   setMe(r.user);$('#ldlg').close();await refresh();
   if(SMS){window.want=0;location.hash='#compte';call('POST','/api/otp/send').then(()=>toast('Compte créé. Un code SMS vous a été envoyé : saisissez-le ci-dessous')).catch(()=>toast('Compte créé. Demandez le code SMS dans Mon espace'))}
   else{toast('Compte créé. Bienvenue '+me.name);if(window.want){window.want=0;location.hash='#publier'}}}catch(x){fail(x)}})();return}
 if(t.id==='lin'){stop();(async()=>{try{const r=await call('POST','/api/login',{id:$('#lq').value,password:$('#lqp').value});
   setMe(r.user);$('#ldlg').close();await refresh();toast('Bienvenue '+me.name);if(window.want){window.want=0;location.hash='#publier'}}catch(x){fail(x)}})();return}
 if(t.id==='lfg'){stop();if(!SMS){toast('Contactez l’administrateur pour réinitialiser votre mot de passe');return}$('#lfb').hidden=!$('#lfb').hidden;return}
 if(t.id==='lfs'){stop();call('POST','/api/password/forgot',{id:$('#lq').value}).then(()=>toast('Si le compte existe, un code SMS vient d’être envoyé')).catch(fail);return}
 if(t.id==='lfr'){stop();(async()=>{try{const r=await call('POST','/api/password/reset',{id:$('#lq').value,code:$('#lfc').value,password:$('#lfp').value});
   setMe(r.user);$('#ldlg').close();await refresh();toast('Mot de passe changé. Bienvenue '+me.name)}catch(x){fail(x)}})();return}
 if(t.id==='logout'){stop();call('POST','/api/logout').finally(()=>{me=null;refresh();toast('Déconnecté')});return}
 if(t.id==='cedit'){stop();cancelEdit();location.hash='#compte';return}
 let x=d('data-otps');if(x){stop();call('POST','/api/otp/send').then(()=>toast('Code envoyé par SMS')).catch(fail);return}
 x=d('data-otpv');if(x){stop();call('POST','/api/otp/verify',{code:$('#otpc').value}).then(r=>{setMe(r.user);toast('Numéro vérifié');return refresh()}).catch(fail);return}
 x=d('data-pw');if(x){stop();call('POST','/api/me/password',{old:$('#pw0').value,new:$('#pw1').value}).then(()=>{$('#pw0').value=$('#pw1').value='';toast('Mot de passe modifié')}).catch(fail);return}
 x=d('data-edit');if(x){stop();const l=L.find(l=>l.id==x.dataset.edit);if(l)startEdit(l);return}
 x=d('data-st');if(x){stop();call('PATCH','/api/listings/'+x.dataset.st+'/status',{status:x.dataset.to}).then(ok('Statut mis à jour')).catch(fail);return}
 x=d('data-del');if(x){stop();if(!confirm('Supprimer définitivement cette annonce ?'))return;call('DELETE','/api/listings/'+x.dataset.del).then(ok('Annonce supprimée')).catch(fail);return}
 x=d('data-rmph');if(x){stop();editPh.splice(+x.dataset.rmph,1);pvx();return}
 x=d('data-ok');if(x){stop();const idc=confirm('Pièce d’identité contrôlée ?\nOK = badge « Identité vérifiée », Annuler = badge « Annonce validée »');
  call('POST','/api/admin/listings/'+x.dataset.ok+'/decision',{decision:'approve',identityChecked:idc}).then(ok('Annonce approuvée et publiée')).catch(fail);return}
 x=d('data-no');if(x){stop();const w=prompt('Motif du refus (visible par le publieur)');if(!w)return;
  call('POST','/api/admin/listings/'+x.dataset.no+'/decision',{decision:'refuse',reason:w}).then(ok('Annonce refusée')).catch(fail);return}
 x=d('data-ban')||d('data-unban');if(x){stop();const un=!!d('data-unban');call('POST','/api/admin/users/'+(un?x.dataset.unban:x.dataset.ban)+'/ban',{banned:!un}).then(ok(un?'Compte réactivé':'Compte banni')).catch(fail);return}
 x=d('data-rpw');if(x){stop();const w=prompt('Mot de passe provisoire (10 caractères minimum). Communiquez-le à l’utilisateur.');if(!w)return;
  call('POST','/api/admin/users/'+x.dataset.rpw+'/password',{password:w}).then(ok('Mot de passe provisoire défini')).catch(fail);return}
 x=d('data-rep');if(x){stop();if(!need())return;const w=prompt('Motif du signalement (fausse annonce, frais abusifs, déjà loué…)');if(!w)return;
  call('POST','/api/reports',{listing_id:+x.dataset.rep,reason:w}).then(()=>toast('Signalement envoyé à la modération')).catch(fail);return}
 x=d('data-inq');if(x){stop();if(!need())return;const m=$('#iq').value.trim();if(!m){toast('Écrivez un message');return}
  call('POST','/api/messages',{listing_id:+x.dataset.inq,body:m}).then(()=>{$('#dlg').close();return ok('Message envoyé')()}).catch(fail);return}
 x=d('data-visit');if(x){stop();if(!need())return;const dt=$('#vd').value;if(!dt){toast('Choisissez une date');return}
  call('POST','/api/visits',{listing_id:+x.dataset.visit,date:dt,hour:$('#vh').value}).then(()=>{$('#dlg').close();return ok('Demande de visite envoyée')()}).catch(fail)}
},true);
try{setMe((await call('GET','/api/me')).user)}catch(e){}
await refresh();route();
})();
