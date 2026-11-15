const E=['🏠','🏡','🏢','🌳','🏬','🏗️'],C=['#CFE4DA','#F3E2B4','#D5DEF0','#E7D3CB','#DDE8C9','#E4D9EE'];
let L=CONFIG.listings;
let favs=new Set(),mode='grid',visits=[],alerts=[],cmpSel=new Set(),preset={};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const fmt=n=>n.toLocaleString('fr-FR');
const price=l=>fmt(l.prix)+' '+l.dev+l.per;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.x);toast.x=setTimeout(()=>t.classList.remove('on'),2800)}
function filt(){
 const g=id=>$(id).value,tr=g('#f-tr'),ty=g('#f-ty'),vi=g('#f-vi'),q=g('#f-qu').toLowerCase(),px=+g('#f-px'),ch=+g('#f-ch'),pu=g('#f-pu'),so=g('#f-so'),ve=$('#f-ve').checked;
 let r=L.filter(l=>l.st==='Active'&&(!tr||l.tr===tr)&&(!ty||l.type===ty)&&(!vi||l.vi===vi)&&(!$('#f-co')||!$('#f-co').value||l.c===$('#f-co').value)&&(!q||l.q.toLowerCase().includes(q))&&(!px||l.dev!=='USD'||l.prix<=px)&&l.ch>=ch&&(!pu||l.pub===pu)&&(!ve||!l.v.includes('Non vérifié')));
 return r.sort((a,b)=>so==='a'?a.prix-b.prix:so==='z'?b.prix-a.prix:b.d-a.d)}
function card(l){const i=l.id%6;
 return `<div class="card" tabindex="0" role="button" data-id="${l.id}" aria-label="${l.t}"><div class="ph">${pic(l)}<button class="fav" data-f="${l.id}" aria-label="Favori">${favs.has(l.id)?'♥':'♡'}</button></div><div class="in"><div class="pr">${price(l)}</div><div>${l.t}</div><div class="mu">${l.q}${l.c?', '+l.c:''}, ${l.vi}${l.ch?' · '+l.ch+' ch.':''} · ${l.m2} m²</div><div class="mu">${rt(l)}</div><span class="tag">${l.pub}</span>${l.v.map(v=>`<span class="tag ${v==='Non vérifié'?'r':v==='Bien inspecté'?'w':''}">${v}</span>`).join('')}</div></div>`}
function render(){const r=filt();$('#results').className='grid'+(mode==='list'?' list':'');
 $('#results').innerHTML=r.length?r.map(card).join(''):'<p class="mu">Aucun bien ne correspond. Élargissez vos filtres ou créez une alerte.</p>';
 $('#rt').textContent=r.length+' annonce'+(r.length>1?'s':'');
 renderFavs();renderMine()}
function renderFavs(){const f=L.filter(l=>favs.has(l.id));
 $('#favs').innerHTML=f.length?f.map(card).join(''):'<p class="mu">Touchez ♡ sur une annonce pour l’enregistrer.</p>';
 const s=[...cmpSel].map(id=>L.find(l=>l.id===id)).filter(Boolean);
 $('#cmp').innerHTML=f.length?`<p>${f.map(l=>`<label style="display:inline-flex;gap:6px;margin-right:12px"><input type="checkbox" style="width:auto;margin:0" data-c="${l.id}" ${cmpSel.has(l.id)?'checked':''}>${l.t}</label>`).join('')}</p>`+(s.length>1?`<table><tr><th></th>${s.map(l=>`<th>${l.t}</th>`).join('')}</tr>${[['Prix',price],['Quartier',l=>l.q],['Surface',l=>l.m2+' m²'],['Chambres',l=>l.ch],['Conditions',l=>l.cond],['Frais de visite',l=>l.fv],['Honoraires',l=>l.hon]].map(([k,f])=>`<tr><td><b>${k}</b></td>${s.map(l=>`<td>${f(l)}</td>`).join('')}</tr>`).join('')}</table>`:''):''}
function renderMine(){const m=L.filter(l=>l.mine);
 $('#mine').innerHTML=m.length?m.map(l=>`<tr><td>${l.t}</td><td>${l.st}</td><td>${l.views||0}</td></tr>`).join(''):'<tr><td colspan="3" class="mu">Aucune annonce. Publiez votre premier bien.</td></tr>';
 const c=s=>m.filter(l=>l.st===s).length;
 $('#stats').innerHTML=[['Biens publiés',m.length],['Actives',c('Active')],['En attente',c('En attente')],['Favoris reçus',0]].map(([a,b])=>`<div class="box"><div class="pr">${b}</div><div class="mu">${a}</div></div>`).join('');
 $('#visits').innerHTML=visits.length?visits.map(v=>`<p><b>${v.t}</b> · ${v.date} à ${v.h} · <span class="tag w">En attente</span></p>`).join(''):'<p class="mu">Aucune demande pour le moment.</p>'}
function open(id){const l=L.find(x=>x.id===id),i=l.id%6;
 $('#dlg').innerHTML=`<div class="dh" style="background:${C[i]}">${E[i]}</div><div class="db"><div class="row" style="justify-content:space-between;margin:0"><div><div class="pr">${price(l)}</div><h3 style="margin:0">${l.t}</h3><div class="mu">${l.q}, ${l.vi} · ${l.type} · ${l.m2} m²${l.ch?' · '+l.ch+' ch. · '+l.bain+' sdb':''}</div></div><button class="btn o s" data-close>Fermer</button></div>
 <p>${l.desc}</p>
 <div class="fee"><b>Conditions annoncées</b><br>Caution et avance : ${l.cond}<br>Frais de visite : ${l.fv}<br>Honoraires : ${l.hon}</div>
 <div><span class="tag">${l.pub}</span>${l.v.map(v=>`<span class="tag ${v==='Non vérifié'?'r':v==='Bien inspecté'?'w':''}">${v}</span>`).join('')}</div>
 <p class="mu">Une identité vérifiée ne garantit pas à elle seule la propriété légale. Ne payez rien avant d’avoir vu le bien et les documents.</p>
 <div class="row"><a class="btn s" href="tel:+${CONFIG.phone}">Appeler</a><a class="btn o s" href="https://wa.me/${CONFIG.phone}" target="_blank" rel="noopener">WhatsApp</a><button class="btn o s" data-f="${l.id}">${favs.has(l.id)?'♥ Retirer':'♡ Favori'}</button><button class="btn o s" data-rep="${l.id}">Signaler</button></div>
 <h3 style="margin-top:18px">Demander une visite</h3><div class="two"><label>Date<input type="date" id="vd"></label><label>Plage horaire<select id="vh"><option>09:00</option><option>11:00</option><option>14:00</option><option>16:00</option></select></label></div>
 <div class="row"><button class="btn" data-visit="${l.id}">Envoyer la demande</button></div>
 <h3 style="margin-top:18px">Biens similaires</h3><div class="row">${L.filter(x=>x.id!==l.id&&x.st==='Active'&&(x.q===l.q||x.type===l.type)).slice(0,3).map(x=>`<button class="chip" data-sim="${x.id}">${x.t}</button>`).join('')||'<span class="mu">Aucun pour le moment.</span>'}</div></div>`;
 if(!$('#dlg').open)$('#dlg').showModal();l.views=(l.views||0)+1;}
const V=['accueil','louer','acheter','terrains','commerces','agences','favoris','compte','aide','publier'];
function route(){let h=(location.hash||'#accueil').slice(1);if(!V.includes(h))h='accueil';{const g=typeof gate==='function'?gate(h):h;if(g!==h){h=g;history.replaceState(null,'','#'+h)}if(h==='admin'&&typeof renderAdmin==='function')renderAdmin()}
 const map={louer:{tr:'Location'},acheter:{tr:'Vente'},terrains:{ty:'Terrain'},commerces:{ty:'Boutique'}};
 const search=['accueil','louer','acheter','terrains','commerces'].includes(h);
 $$('.view').forEach(v=>v.classList.remove('on'));$('#v-'+(search?'accueil':h)).classList.add('on');
 $('#hero').hidden=h!=='accueil';$('#home-extra').hidden=h!=='accueil';
 $$('#nav a').forEach(a=>a.toggleAttribute('aria-current',a.getAttribute('href')==='#'+h));
 if(search){$('#f-tr').value='';$('#f-ty').value='';
  if(h==='louer')$('#f-tr').value='Location';if(h==='acheter')$('#f-tr').value='Vente';
  if(h==='terrains'){$('#f-ty').value='';$('#f-tr').value='';$('#f-qu').value='';}
  if(h==='commerces')$('#f-ty').value='Boutique';
  if(h==='terrains'){const o=L.filter(l=>['Terrain','Parcelle'].includes(l.type));}
  render()}
 if(h==='terrains'){$('#results').innerHTML=filt().filter(l=>['Terrain','Parcelle'].includes(l.type)).map(card).join('')||'<p class="mu">Aucun terrain pour le moment.</p>'}
 if(h==='compte'||h==='favoris')render();window.scrollTo(0,0)}
addEventListener('hashchange',route);
$('#chips').innerHTML=['Maison à louer à Golf','Studio sous 200 USD','Terrain à vendre','Boutique à louer'].map((c,i)=>`<button class="chip" data-p="${i}">${c}</button>`).join('');
const PS=[{tr:'Location',ty:'Maison',qu:'Golf'},{ty:'Studio',px:200},{tr:'Vente',ty:'Parcelle'},{tr:'Location',ty:'Boutique'}];
document.addEventListener('click',e=>{const t=e.target;
 const p=t.closest('[data-p]');if(p){const o=PS[p.dataset.p];$('#sf').reset();$('#f-tr').value=o.tr||'';$('#f-ty').value=o.ty||'';$('#f-qu').value=o.qu||'';$('#f-px').value=o.px||'';render();return}
 const f=t.closest('[data-f]');if(f){e.stopPropagation();const id=+f.dataset.f;favs.has(id)?favs.delete(id):favs.add(id);toast(favs.has(id)?'Ajouté aux favoris':'Retiré des favoris');render();if($('#dlg').open)open(id);return}
 if(t.closest('[data-close]')){$('#dlg').close();return}
 const rp=t.closest('[data-rep]');if(rp){const m=prompt('Motif du signalement (fausse annonce, frais abusifs, déjà loué…)');if(m)toast('Signalement envoyé à la modération');return}
 const vs=t.closest('[data-visit]');if(vs){const d=$('#vd').value;if(!d){toast('Choisissez une date');return}const l=L.find(x=>x.id==vs.dataset.visit);visits.push({t:l.t,date:d,h:$('#vh').value});toast('Demande envoyée. Frais de visite : '+l.fv.split(':')[0].toLowerCase());$('#dlg').close();renderMine();return}
 const sm=t.closest('[data-sim]');if(sm){open(+sm.dataset.sim);return}
 const cd=t.closest('.card');if(cd){open(+cd.dataset.id);return}
 if(t===$('#dlg'))$('#dlg').close()});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('card'))open(+e.target.dataset.id)});
document.addEventListener('change',e=>{const c=e.target.dataset.c;if(c){const id=+c;if(e.target.checked){if(cmpSel.size>=4){e.target.checked=false;toast('Quatre biens maximum');return}cmpSel.add(id)}else cmpSel.delete(id);renderFavs()}});
$$('#sf input,#sf select').forEach(x=>x.addEventListener('input',render));
$('#bg').onclick=()=>{mode='grid';render()};$('#bl').onclick=()=>{mode='list';render()};
$('#alert').onclick=()=>{const s=[$('#f-tr').value,$('#f-ty').value,$('#f-qu').value,$('#f-px').value&&'≤ '+$('#f-px').value+' USD'].filter(Boolean).join(' · ')||'Toutes les annonces';alerts.push(s);$('#alerts').innerHTML=alerts.map(a=>`<li>${a}</li>`).join('');toast('Alerte créée')};
/* Publication */
let step=0;const FS=$$('#pf fieldset');
function showStep(){FS.forEach((f,i)=>f.classList.toggle('on',i===step));$$('#stp i').forEach((b,i)=>b.classList.toggle('on',i<=step));
 $('#prev').hidden=step===0;$('#next').textContent=step===3?'Soumettre à validation':'Continuer'}
$('#pubrole').onchange=e=>{$('#hon').hidden=e.target.value==='Propriétaire'};
$('#prev').onclick=()=>{step--;showStep()};
function save(st){const d=Object.fromEntries(new FormData($('#pf')));
 if(!d.t||!d.prix||!d.q){toast('Titre, quartier et prix sont obligatoires');return false}
 if(st!=='Brouillon'&&!(window.pend&&window.pend.length)){toast('Ajoutez au moins une photo');return false}
 if(d.pub!=='Propriétaire'&&(!d.hon||!d.qui||!$('#mand').checked)){toast('Honoraires, payeur et mandat sont obligatoires pour un intermédiaire');return false}
 L.unshift({id:Date.now()%100000,t:d.t,type:d.type,tr:d.tr,vi:d.vi,q:d.q,prix:+d.prix,dev:d.dev,per:d.tr==='Location'?'/mois':'',ch:+d.ch,bain:+d.bain,m2:+d.m2,pub:d.pub,v:['Non vérifié'],cond:d.cond||'Non précisé',fv:d.fv==='Aucun'?'Aucun':'Oui : '+(d.fvm||'montant à préciser'),hon:d.pub==='Propriétaire'?'Aucun':d.hon+' ('+d.qui+')',desc:d.desc||'',st,d:10,mine:true,owner:me?{name:me.name,phone:me.phone,email:me.email,role:me.role}:null,photos:window.pend||[]});
 $('#pf').reset();window.pend=[];$('#pv').innerHTML='';step=0;showStep();toast(st==='Brouillon'?'Brouillon enregistré':'Annonce soumise à validation');location.hash='#compte';return true}
$('#next').onclick=()=>{if(step<3){step++;showStep()}else save('En attente')};
$('#draft').onclick=()=>save('Brouillon');

