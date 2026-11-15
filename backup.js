'use strict';
/* Sauvegarde cohérente : base SQLite + photos + clé de session. Usage : npm run backup */
const fs=require('node:fs'),path=require('node:path');const {DatabaseSync}=require('node:sqlite');
try{process.loadEnvFile(path.join(__dirname,'.env'))}catch{}
const DATA=process.env.DATA_DIR||path.join(__dirname,'data'),OUT=process.env.BACKUP_DIR||path.join(__dirname,'backups'),KEEP=+process.env.BACKUP_KEEP||14;
const stamp=new Date().toISOString().replace(/[:T]/g,'-').slice(0,19),dest=path.join(OUT,stamp);fs.mkdirSync(dest,{recursive:true});
const db=new DatabaseSync(path.join(DATA,'metrohome24.db'));db.exec(`VACUUM INTO '${path.join(dest,'metrohome24.db').replace(/'/g,"''")}'`);db.close();
if(fs.existsSync(path.join(DATA,'uploads')))fs.cpSync(path.join(DATA,'uploads'),path.join(dest,'uploads'),{recursive:true});
if(fs.existsSync(path.join(DATA,'secret.key')))fs.copyFileSync(path.join(DATA,'secret.key'),path.join(dest,'secret.key'));
fs.readdirSync(OUT).filter(d=>/^\d{4}-/.test(d)).sort().slice(0,-KEEP).forEach(d=>fs.rmSync(path.join(OUT,d),{recursive:true,force:true}));
console.log('Sauvegarde créée :',dest);
