'use client';
import {useMemo,useState} from 'react';
import {applicationStats,filterApplications,initialFilter,type Scope,type Distribution} from '@/lib/application-model';
import type {Entry} from '@/lib/shared';
import {ExportButtons} from './AdminExports';
const fmt=(n:number)=>new Intl.NumberFormat('fr-FR').format(n);
function DistributionCard({title,rows,total}:{title:string;rows:Distribution[];total:number}){
 const [expanded,setExpanded]=useState(false);const chronological=title==='Inscriptions par jour';
 const shown=expanded?rows:chronological?rows.slice(-8):rows.slice(0,8);
 return <article className="panel stats-card"><h3>{title}</h3>{!rows.length?<p className="muted">Aucune donnée.</p>:<div className="stats-distribution">{shown.map(r=>{const pct=total?100*r.total/total:0;return <div className="stats-item" key={r.name}><div><span>{r.name}</span><strong>{fmt(r.total)} <small>· {Math.round(pct)} %</small></strong></div><div className="stats-track" aria-hidden="true"><i style={{width:pct+'%'}}/></div></div>})}</div>}{rows.length>8&&<button className="btn admin-quiet small" type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Afficher moins':`Voir les ${rows.length} valeurs`}</button>}</article>;
}
export default function AdminApplicationStats({applications}:{applications:Entry[]}){
 const [scope,setScope]=useState<Scope>('all');const filter={...initialFilter,scope};const rows=useMemo(()=>filterApplications(applications,{...initialFilter,scope}),[applications,scope]);const stats=useMemo(()=>applicationStats(rows),[rows]);
 return <section className="application-stats"><div className="admin-section-heading"><div><h2>Statistiques détaillées des candidatures</h2><p>{fmt(rows.length)} dossier(s) · toutes périodes · fuseau de Kinshasa</p></div><div className="stats-tools"><label>Population<select value={scope} onChange={e=>setScope(e.target.value as Scope)}><option value="all">Tous les dossiers</option><option value="real">Candidatures réelles</option><option value="demo">Démonstrations</option></select></label><ExportButtons filter={filter} statsOnly label="Statistiques"/></div></div><div className="stats-grid">{stats.map(s=><DistributionCard key={s.title+scope} title={s.title} rows={s.rows} total={rows.length}/>)}</div></section>;
}
