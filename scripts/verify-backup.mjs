// Verify an archive made by backup.mjs. Never restores production or writes to Supabase.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const archive=process.argv[2],identity=process.env.BACKUP_AGE_IDENTITY_FILE;
if(!archive||!identity)throw Error('Usage: npm run backup:verify -- <archive.tar.age>; définir BACKUP_AGE_IDENTITY_FILE.');
const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'expo-verify-')),tar=path.join(tmp,'payload.tar');
function run(bin,args,capture=false){const p=spawnSync(bin,args,{encoding:capture?'utf8':undefined,stdio:['ignore',capture?'pipe':'ignore','ignore'],maxBuffer:8*1024*1024});if(p.error||p.status!==0)throw Error(bin+' a échoué.');return p.stdout;}
const sha=b=>createHash('sha256').update(b).digest('hex');
try{
 run('age',['-d','-i',identity,'-o',tar,path.resolve(archive)]);
 const list=run('tar',['-tf',tar],true).trim().split(/\r?\n/);if(!list.includes('database.dump')||!list.includes('manifest.json')||list.some(p=>!(/^(database\.dump|manifest\.json|objects\/?|objects\/[a-f0-9]{64})$/.test(p))))throw Error('Contenu archive inattendu.');
 // Reject symlinks and special entries; only our own trusted archives should be opened.
 const verbose=run('tar',['-tvf',tar],true).trim().split(/\r?\n/);if(verbose.some(l=>!/^[-d]/.test(l)))throw Error('Entrée spéciale non autorisée.');
 run('tar',['-xf',tar,'-C',tmp]);
 const m=JSON.parse(await fs.readFile(path.join(tmp,'manifest.json'),'utf8'));if(m.format!==1||m.database?.file!=='database.dump'||!Array.isArray(m.objects))throw Error('Manifeste invalide.');
 const db=await fs.readFile(path.join(tmp,'database.dump'));if(db.length!==m.database.size||sha(db)!==m.database.sha256)throw Error('Dump altéré.');
 for(const obj of m.objects){if(!/^objects\/[a-f0-9]{64}$/.test(obj.file)||!['expo-private','expo-gallery'].includes(obj.bucket))throw Error('Objet invalide.');const b=await fs.readFile(path.join(tmp,obj.file));if(b.length!==obj.size||sha(b)!==obj.sha256)throw Error('Objet Storage altéré.');}
 run('pg_restore',['--list',path.join(tmp,'database.dump')]);console.log(`Intégrité OK (${m.objects.length} objets). Ce contrôle ne remplace pas une restauration réelle sur un projet isolé.`);
}finally{await fs.rm(tmp,{recursive:true,force:true});}
