'use client';
import {useEffect,useState} from 'react';
import {api,err} from '@/lib/client';
type Incident={bucket:string;kind:string;hits:number;sources:number;created:string};
const names:Record<string,string>={distributed_login:'Connexions suspectes depuis plusieurs sources',repeated_login:'Tentatives de connexion répétées',server_errors:'Erreurs serveur répétées',rejected_files:'Fichiers suspects refusés'};
export default function AdminIncidents(){
 const [rows,setRows]=useState<Incident[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');api<{rows:Incident[]}>('admin/security/incidents').then(r=>{if(active)setRows(r.rows)}).catch(e=>{if(active)setError(err(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[revision]);
 return <section className="panel stack"><h2>Alertes de sécurité</h2><p>Incidents détectés au cours des 30 derniers jours. Les volumes indiqués correspondent au déclenchement de l’alerte, par fenêtre de 15 minutes. Aucun identifiant ni IP brute n’est affiché.</p><div className="actions"><button type="button" className="btn outline small" disabled={loading} onClick={()=>setRevision(n=>n+1)}>Actualiser les alertes</button></div>{loading?<p role="status">Chargement…</p>:error?<p role="alert" className="error">{error}</p>:rows.length?<div className="table-wrap"><table><thead><tr><th>Date (Kinshasa)</th><th>Incident</th><th>Événements</th><th>Sources</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.created+r.kind+i}><td>{new Date(r.created).toLocaleString('fr-FR',{timeZone:'Africa/Kinshasa'})}</td><td>{names[r.kind]||r.kind}</td><td>{r.hits}</td><td>{r.sources||'—'}</td></tr>)}</tbody></table></div>:<p>Aucun incident enregistré. Cela ne prouve pas l’absence d’attaque.</p>}</section>;
}
