const test=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const cache=new Map();function load(path){if(cache.has(path))return cache.get(path).exports;const m={exports:{}};cache.set(path,m);const code=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',code)(m,m.exports,p=>p==='./shared'?load('lib/shared.ts'):require(p));return m.exports;}
const {filterApplications,initialFilter,canBatch,applicationStats,kinDay}=load('lib/application-model.ts');const {statuses}=load('lib/shared.ts');
const row=(id,data={},status=statuses[0],created='2026-11-26T10:00:00Z')=>({id,matricule:'M-'+id,email:id+'@example.invalid',status,created,data:{nom:'Élodie',postnom:'Test',prenom:'A',promotion:'L1',categorie:'Chant',...data},attachment:null,original_name:null});
const rows=[row('A',{synthetic:true}),row('B',{synthetic:'true'}),row('C',{},statuses[4]),row('D',{nom:'André',promotion:'L2'},statuses[2],'2026-11-26T23:30:00Z'),row('E',{nom:'Paul'},statuses[1])];
test('population réelle exclut les démos booléennes et texte',()=>assert.deepEqual(filterApplications(rows,{...initialFilter,scope:'real'}).map(r=>r.id),['D','C','E']));
test('population démo',()=>assert.equal(filterApplications(rows,{...initialFilter,scope:'demo'}).length,2));
test('recherche insensible aux accents, multi mots',()=>assert.deepEqual(filterApplications(rows,{...initialFilter,search:'andre m-d'}).map(r=>r.id),['D']));
test('filtre combiné respecte promotion et statut',()=>assert.deepEqual(filterApplications(rows,{...initialFilter,filters:{promotion:'L2',status:statuses[2]}}).map(r=>r.id),['D']));
test('participants retenus inclut acceptés et confirmés',()=>assert.deepEqual(filterApplications(rows,{...initialFilter,participantsOnly:true}).map(r=>r.id),['D','C']));
test('sélection groupée refuse démos et confirmés',()=>assert.deepEqual(rows.filter(canBatch).map(r=>r.id),['D','E']));
test('agrégation des statuts garde les zéros et total exact',()=>{const s=applicationStats(rows)[0].rows;assert.equal(s.length,5);assert.equal(s.reduce((n,r)=>n+r.total,0),5);assert.equal(s.find(r=>r.name===statuses[3]).total,0)});
test('agrégation population vide',()=>assert.ok(applicationStats([]).every(s=>s.rows.every(r=>r.total===0))));
test('jour Kinshasa et date invalide',()=>{assert.equal(kinDay('2026-11-26T23:30:00Z'),'2026-11-27');assert.equal(kinDay('invalid'),'Date inconnue')});
test('l’ordre des lignes initiales est conservé',()=>{filterApplications(rows,initialFilter);assert.equal(rows[0].id,'A')});
