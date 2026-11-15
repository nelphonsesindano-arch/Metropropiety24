/* MetroHome24 : comptes obligatoires, modération, photos animées */
var SC=[{a:'#8EC9F5',b:'#FBE3C5',w:'#F5EFE6',r:'#7A3E5D',y:'#F2B84B'},{a:'#9BB8FF',b:'#FFD9E8',w:'#FFF7EE',r:'#3E4A89',y:'#FF8FAB'},{a:'#7FD6C9',b:'#FFF1C9',w:'#EFF6F2',r:'#1F6F6B',y:'#FFC857'},{a:'#C9A8FF',b:'#FFD6A5',w:'#F8F1FF',r:'#5B2A86',y:'#FF9F68'},{a:'#86C5FF',b:'#E8F7D4',w:'#FFFFFF',r:'#2D4F7C',y:'#F4A261'},{a:'#F6B8A0',b:'#FFEBC2',w:'#FFF4E6',r:'#8C3B3B',y:'#6DD3C4'}];
function scene(i){const P=SC[i%6],k=i%3,id='g'+(i%6);let h;
 if(k===0)h=`<rect x="110" y="150" width="180" height="100" fill="${P.w}"/><path d="M95 152 200 80 305 152z" fill="${P.r}"/><rect x="185" y="195" width="30" height="55" rx="3" fill="${P.r}"/><rect class="win" x="128" y="172" width="34" height="30" rx="3" fill="${P.y}"/><rect class="win d2" x="238" y="172" width="34" height="30" rx="3" fill="${P.y}"/>`;
 else if(k===1)h=`<rect x="90" y="170" width="150" height="80" fill="${P.w}"/><rect x="150" y="120" width="140" height="130" fill="${P.w}"/><rect x="85" y="162" width="160" height="10" fill="${P.r}"/><rect x="145" y="112" width="150" height="10" fill="${P.r}"/><rect class="win" x="100" y="190" width="50" height="35" fill="${P.y}"/><rect class="win d2" x="170" y="140" width="45" height="40" fill="${P.y}"/><rect class="win d1" x="230" y="140" width="45" height="40" fill="${P.y}"/><rect x="190" y="200" width="30" height="50" fill="${P.r}"/>`;
 else h=`<rect x="130" y="70" width="140" height="180" fill="${P.w}"/><rect x="122" y="62" width="156" height="10" fill="${P.r}"/>`+[0,1,2,3].map(r=>[0,1,2].map(c=>`<rect class="win d${(r+c)%3}" x="${146+c*40}" y="${88+r*38}" width="26" height="22" fill="${P.y}"/>`).join('')).join('')+`<rect x="188" y="222" width="24" height="28" fill="${P.r}"/>`;
 return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration d’une belle maison"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.a}"/><stop offset="1" stop-color="${P.b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/><circle class="sun" cx="330" cy="70" r="26" fill="${P.y}"/><g class="cl"><ellipse cx="80" cy="60" rx="38" ry="13" fill="#fff" opacity=".8"/><ellipse cx="105" cy="52" rx="26" ry="12" fill="#fff" opacity=".8"/></g><g class="cl c2"><ellipse cx="250" cy="40" rx="30" ry="10" fill="#fff" opacity=".7"/></g><rect y="250" width="400" height="50" fill="#5BA874"/>${h}<g class="tree"><rect x="52" y="205" width="8" height="48" fill="#6B4A2F"/><circle cx="56" cy="195" r="26" fill="#2F8F5B"/></g><g class="tree t2"><rect x="340" y="215" width="7" height="38" fill="#6B4A2F"/><circle cx="343" cy="205" r="21" fill="#3BA66B"/></g></svg>`}
function pic(l){const p=(l.photos&&l.photos[0])||l.img;return p?`<img src="${p}" alt="${esc(l.t)}" loading="lazy">`:scene(l.id)}
var curPs=[];
function gal(l){curPs=l.photos&&l.photos.length?l.photos:l.img?[l.img]:[];if(!curPs.length)return scene(l.id);
 return `<img id="mainph" src="${curPs[0]}" alt="${esc(l.t)}">`+(curPs.length>1?`<div class="th">${curPs.map((p,j)=>`<img data-thi="${j}" src="${p}" alt="Photo ${j+1}">`).join('')}</div>`:'')}
function gate(h){
 if(h==='publier'){
  if(!me){window.want=1;$('#ldlg').showModal();toast('Créez un compte pour publier un bien');return 'accueil'}
  if(me.role==='Chercheur'){if(confirm('Votre compte est de type Chercheur. Passer en compte Propriétaire pour publier ?'))me.role='Propriétaire';else return 'accueil'}
  const s=$('#pubrole');s.value=me.role;s.dispatchEvent(new Event('change'));s.style.pointerEvents='none';s.style.opacity='.7'}
 if(h==='admin'&&!window.adm){if(prompt('Code administrateur')===CONFIG.adminCode)window.adm=true;else return 'accueil'}
 return h}
function renderAdmin(){const p=L.filter(l=>l.st==='En attente'),dn=L.filter(l=>l.mine&&['Active','Refusée'].includes(l.st));
 $('#astats').innerHTML=[['À valider',p.length],['Publiées',L.filter(l=>l.st==='Active').length],['Refusées',L.filter(l=>l.st==='Refusée').length]].map(([a,b])=>`<div class="box"><div class="pr">${b}</div><div class="mu">${a}</div></div>`).join('');
 $('#apend').innerHTML=p.length?p.map(l=>`<div class="box" style="margin-bottom:10px"><div class="row" style="margin:0">${(l.photos||[]).map(u=>`<img src="${u}" alt="" style="width:90px;height:68px;object-fit:cover;border-radius:8px">`).join('')}</div><h3>${esc(l.t)}</h3><p class="mu">${l.type} · ${l.tr} · ${price(l)} · ${esc(l.q)}, ${l.vi}</p><p>${esc(l.desc)}</p><div class="fee"><b>Publieur</b><br>${l.owner?esc(l.owner.name)+' · '+l.owner.role+'<br>'+esc(l.owner.phone)+' · '+esc(l.owner.email):'—'}<br>Honoraires : ${esc(l.hon)}</div><div class="row"><button class="btn s" data-ok="${l.id}">Approuver</button><button class="btn o s" data-no="${l.id}">Refuser</button></div></div>`).join(''):'<p class="mu">Aucune annonce en attente.</p>';
 $('#adone').innerHTML=dn.length?dn.map(l=>`<p>${esc(l.t)} : ${l.st}${l.reason?' ('+esc(l.reason)+')':''}</p>`).join(''):'<p class="mu">Aucune décision.</p>'}
document.addEventListener('click',e=>{const t=e.target,d=a=>t.closest('['+a+']');
 let x=d('data-thi');if(x){$('#mainph').src=curPs[+x.dataset.thi];return}
 x=d('data-ok');if(x){const l=L.find(l=>l.id==x.dataset.ok);l.st='Active';l.d=11;l.v=['Téléphone vérifié'];renderAdmin();render();toast('Annonce approuvée et publiée');return}
 x=d('data-no');if(x){const l=L.find(l=>l.id==x.dataset.no),r=prompt('Motif du refus (visible par le publieur)');if(!r)return;l.st='Refusée';l.reason=r;renderAdmin();render();toast('Annonce refusée');return}
 if(t.id==='lgo'){const n=$('#ln').value.trim(),p=$('#lp').value.replace(/\D/g,''),m=$('#lm').value.trim();
  if(!n||p.length<9||!/^\S+@\S+\.\S+$/.test(m)){toast('Nom, téléphone et e-mail valides requis');return}
  if($('#lk').value.trim()!=='123456'){toast('Code incorrect (prototype : 123456)');return}
  me={name:n,phone:p.startsWith('0')?'243'+p.slice(1):p,email:m,role:$('#lr').value,ver:{phone:true,mail:true}};
  $('#ldlg').close();renderMine();toast('Compte créé. Bienvenue '+n);
  if(window.want){window.want=0;location.hash='#publier'}}});
window.pend=[];
document.addEventListener('change',e=>{if(e.target.id!=='ph')return;window.pend=[];$('#pv').innerHTML='';
 [...e.target.files].slice(0,5).forEach(f=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,900/im.width),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);const u=c.toDataURL('image/jpeg',.72);window.pend.push(u);$('#pv').insertAdjacentHTML('beforeend',`<img src="${u}" alt="" style="width:72px;height:56px;object-fit:cover;border-radius:8px">`)};im.src=r.result};r.readAsDataURL(f)})});
(function(){const im=CONFIG.heroImages||[],n=im.length||4;
 $('#slides').style.setProperty('--t',6*n+'s');
 $('#slides').innerHTML=(im.length?im.map(u=>`<img src="${u}" alt="">`):[1,2,3,4].map(scene)).map((s,i)=>`<div class="sl" style="animation-delay:${i*6}s">${s}</div>`).join('')})();
showStep();route();
