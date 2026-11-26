import {statuses,fullName,type Entry} from './shared';
export const filterKeys=['promotion','filiere','categorie','status'] as const;
export type Scope='all'|'real'|'demo';
export type ApplicationFilter={search:string;scope:Scope;filters:Record<string,string>;participantsOnly?:boolean};
export const initialFilter:ApplicationFilter={search:'',scope:'all',filters:{}};
export const isDemo=(r:Entry)=>String(r.data.synthetic)==='true';
export const isAccepted=(r:Entry)=>r.status===statuses[2]||r.status===statuses[4];
export const canBatch=(r:Entry)=>!isDemo(r)&&r.status!==statuses[4];
export function normalized(v:unknown){return String(v??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();}
export function filterApplications(rows:Entry[],f:ApplicationFilter){
 const words=normalized(f.search).split(/\s+/).filter(Boolean);
 return rows.filter(r=>{
  if(f.scope==='real'&&isDemo(r)||f.scope==='demo'&&!isDemo(r)||f.participantsOnly&&!isAccepted(r))return false;
  const text=normalized([fullName(r.data),r.matricule,r.id,r.email,r.data.telephone].join(' '));
  return words.every(w=>text.includes(w))&&filterKeys.every(k=>!f.filters[k]||String(k==='status'?r.status:r.data[k]??'')===f.filters[k]);
 }).sort((a,b)=>Date.parse(b.created)-Date.parse(a.created)||a.id.localeCompare(b.id));
}
export type Distribution={name:string;total:number};
export function distribution(rows:Entry[],key:(r:Entry)=>string,chronological=false):Distribution[]{
 const m=new Map<string,number>();for(const r of rows){const k=key(r).trim()||'Non renseigné';m.set(k,(m.get(k)||0)+1);}
 return Array.from(m,([name,total])=>({name,total})).sort((a,b)=>chronological?a.name.localeCompare(b.name):b.total-a.total||a.name.localeCompare(b.name,'fr'));
}
export const kinDay=(s:string)=>{const d=new Date(s);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('sv-SE',{timeZone:'Africa/Kinshasa',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'Date inconnue';};
export function applicationStats(rows:Entry[]){return [
 {title:'Statuts',rows:statuses.map(name=>({name,total:rows.filter(r=>r.status===name).length}))},
 {title:'Promotions',rows:distribution(rows,r=>String(r.data.promotion??''))},
 {title:'Catégories de talents',rows:distribution(rows,r=>String(r.data.categorie??''))},
 {title:'Filières',rows:distribution(rows,r=>String(r.data.filiere??''))},
 {title:'Départements',rows:distribution(rows,r=>String(r.data.departement??''))},
 {title:'Vacations',rows:distribution(rows,r=>String(r.data.vacation??''))},
 {title:'Types de participation',rows:distribution(rows,r=>String(r.data.type??''))},
 {title:'Inscriptions par jour',rows:distribution(rows,r=>kinDay(r.created),true)},
 ];}
