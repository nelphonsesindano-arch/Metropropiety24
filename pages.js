const f=document.getElementById('cf');
if(f)f.addEventListener('submit',async e=>{e.preventDefault();const r=document.getElementById('cr');r.textContent='Envoi…';
 try{const x=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('cn').value,email:document.getElementById('ce').value,message:document.getElementById('cm').value})});
  const j=await x.json();if(!x.ok)throw new Error(j.error||'Erreur');f.reset();r.textContent='Merci, votre message a bien été envoyé.'}catch(err){r.textContent=err.message}});
