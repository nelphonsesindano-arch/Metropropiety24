/* MetroHome24 : application installable (service worker + bouton « Installer l'application ») */
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
let ev=null;const btn=()=>document.getElementById('inst');
addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;if(btn())btn().hidden=false});
addEventListener('appinstalled',()=>{if(btn())btn().hidden=true});
document.addEventListener('click',e=>{if(e.target.id==='inst'&&ev){ev.prompt();ev.userChoice.finally(()=>{ev=null;e.target.hidden=true})}});
