// Run locally on an encrypted, trusted machine. No backups are sent to GitHub.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const required=['PGHOST','PGUSER','PGPASSWORD','PGDATABASE','PGSSLROOTCERT','BACKUP_SUPABASE_URL','BACKUP_SERVICE_KEY','BACKUP_AGE_RECIPIENT','BACKUP_DIRECTORY'];
for(const name of required)if(!process.env[name])throw Error('Variable de sauvegarde manquante : '+name);
const url=new URL(process.env.BACKUP_SUPABASE_URL);if(url.protocol!=='https:'||url.username||url.password)throw Error('URL Supabase invalide');
if(!process.env.BACKUP_AGE_RECIPIENT.startsWith('age1'))throw Error('Utiliser un destinataire age public natif.');
const out=path.resolve(process.env.BACKUP_DIRECTORY),cwd=process.cwd();
if(out===cwd||out.startsWith(cwd+path.sep))throw Error('Le dossier de sauvegarde doit être hors du dépôt.');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'expo-backup-'));
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),output=path.join(out,`expo-${stamp}.tar.age`),partial=output+'.partial';
const hash=b=>createHash('sha256').update(b).digest('hex');
function run(bin,args,env=process.env){const p=spawnSync(bin,args,{env,stdio:['ignore','ignore','ignore']});if(p.error||p.status!==0)throw Error(bin+' a échoué. Vérifie les outils et les paramètres privés.');}
const db=createClient(url.origin,process.env.BACKUP_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const objects=[];
async function download(bucket,prefix=''){
 for(let offset=0;;offset+=100){const r=await db.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(r.error||!r.data)throw Error('Inventaire Storage indisponible.');for(const entry of r.data){const key=prefix?prefix+'/'+entry.name:entry.name;if(!entry.id){await download(bucket,key);continue;}const f=await db.storage.from(bucket).download(key);if(f.error||!f.data)throw Error('Téléchargement Storage incomplet.');const bytes=Buffer.from(await f.data.arrayBuffer()),sha256=hash(bytes);const local='objects/'+sha256;await fs.writeFile(path.join(tmp,local),bytes,{mode:0o600});objects.push({bucket,key,file:local,sha256,size:bytes.length,contentType:f.data.type||null});}if(r.data.length<100)break;}
}
try{
 await fs.mkdir(out,{recursive:true,mode:0o700});await fs.mkdir(path.join(tmp,'objects'),{mode:0o700});
 // Logical archive of app, Auth and Storage metadata. Managed extensions and cluster settings are not a full platform snapshot.
 run('pg_dump',['--format=custom','--no-owner','--schema=public','--schema=auth','--schema=storage','--file='+path.join(tmp,'database.dump')],{...process.env,PGSSLMODE:'verify-full'});
 run('pg_restore',['--list',path.join(tmp,'database.dump')]);
 for(const bucket of ['expo-private','expo-gallery'])await download(bucket);
 const database=await fs.readFile(path.join(tmp,'database.dump'));
 await fs.writeFile(path.join(tmp,'manifest.json'),JSON.stringify({format:1,created:new Date().toISOString(),project:url.hostname,database:{file:'database.dump',sha256:hash(database),size:database.length},objects},null,2),{mode:0o600});
 const archive=path.join(tmp,'payload.tar');run('tar',['-cf',archive,'-C',tmp,'database.dump','manifest.json','objects']);
 run('age',['-r',process.env.BACKUP_AGE_RECIPIENT,'-o',partial,archive]);await fs.rename(partial,output);
 console.log(`Sauvegarde chiffrée créée : ${output} (${objects.length} objets Storage). Vérification de restauration encore requise.`);
}finally{await fs.rm(partial,{force:true});await fs.rm(tmp,{recursive:true,force:true});}
