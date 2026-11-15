/* Lieux du Haut-Katanga. À COMPLÉTER ET VÉRIFIER avec vos agents locaux (communes, quartiers). */
window.LIEUX={province:'Haut-Katanga',
 villes:{'Lubumbashi':['Annexe','Kamalondo','Kampemba','Katuba','Kenya','Lubumbashi','Ruashi'],
  'Likasi':['Kikula','Likasi','Panda','Shituru'],'Kipushi':[],'Kasenga':[],'Kambove':[],'Pweto':[],'Sakania':[],'Mitwaba':[]},
 /* Suggestions de quartiers (saisie libre autorisée) */
 quartiers:['Golf','Bel-Air','Makomeno','Kalubwe','Lido','Gambela','Kigoma','Kisanga','Mampala','Ruashi','Kenya','Katuba','Industriel','Centre-ville']};
(function(){
 const q=s=>document.querySelector(s),O=(a,first)=>(first!==undefined?`<option value="">${first}</option>`:'')+a.map(x=>`<option>${x}</option>`).join('');
 const V=Object.keys(LIEUX.villes);
 function filtre(){const c=q('#f-co');if(!c)return;const l=LIEUX.villes[q('#f-vi').value]||[];c.innerHTML=O(l,'Toutes');c.disabled=!l.length}
 function formCommune(keep){const f=q('#pf');if(!f)return;const e=f.elements,l=LIEUX.villes[e.vi.value]||[],old=e.c.value;
  e.c.innerHTML=`<option value="">${l.length?'Choisir la commune':'Non applicable'}</option>`+O(l);if(keep&&l.includes(old))e.c.value=old}
 function formVilles(){const f=q('#pf');if(!f)return;f.elements.vi.innerHTML=O(V);formCommune()}
 window.setLieu=(vi,c)=>{const e=q('#pf').elements;e.vi.value=vi;formCommune();e.c.value=c||''};
 q('#f-vi').innerHTML=O(V,'Toutes');filtre();formVilles();
 document.body.insertAdjacentHTML('beforeend',`<datalist id="dl-q">${O(LIEUX.quartiers)}</datalist>`);
 const ch=q('#chips');if(ch)ch.insertAdjacentHTML('beforebegin','<p class="mu" style="margin:14px 0 0"><b>Parcourir par commune</b></p><div class="chips" id="communes">'+
  LIEUX.villes.Lubumbashi.map(c=>`<button class="chip" data-co="Lubumbashi|${c}">${c}</button>`).join('')+'<button class="chip" data-co="Likasi|">Likasi</button></div>');
 document.addEventListener('change',e=>{if(e.target.id==='f-vi'){filtre();if(typeof render==='function')render()}
  if(e.target.name==='vi'&&e.target.form&&e.target.form.id==='pf')formCommune()});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-co]');if(!b)return;const[v,c]=b.dataset.co.split('|');
  q('#f-vi').value=v;filtre();q('#f-co').value=c;if(typeof render==='function')render();const r=q('#results');if(r)r.scrollIntoView({behavior:'smooth'})});
 q('#pf')&&q('#pf').addEventListener('reset',()=>setTimeout(()=>{formVilles()},0));
})();
