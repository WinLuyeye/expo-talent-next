'use client';
import {useState,type FormEvent} from 'react';
import {ShieldCheck} from 'lucide-react';
import {api,err} from '@/lib/client';
import type {Admin} from '@/lib/shared';
export type AdminAccess=Admin & {mfa:{required:boolean;locked:boolean;currentLevel:string;hasVerified:boolean;factors:{id:string;name:string;verified:boolean}[]}};
type Enrollment={factorId:string;qr:string;secret:string};
export default function AdminMfa({me,onChange,onLogout}:{me:AdminAccess;onChange:(s:AdminAccess)=>Promise<void>;onLogout:()=>Promise<void>}){
  const [enrollment,setEnrollment]=useState<Enrollment|null>(null),[code,setCode]=useState(''),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const factors=me.mfa.factors.filter(f=>f.verified),pending=me.mfa.factors.filter(f=>!f.verified);
  const canEnroll=!me.mfa.hasVerified||me.mfa.currentLevel==='aal2';
  const factorId=enrollment?.factorId||selected||factors[0]?.id||'';
  async function enroll(){setBusy(true);setError('');try{setEnrollment(await api<Enrollment>('admin/mfa/enroll',{}));setCode('')}catch(e){setError(err(e))}finally{setBusy(false)}}
  async function cancel(id:string){setBusy(true);setError('');try{const r=await api<AdminAccess>('admin/mfa/cancel',{factorId:id});setEnrollment(null);setCode('');await onChange(r)}catch(e){setError(err(e))}finally{setBusy(false)}}
  async function verify(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await api<AdminAccess>('admin/mfa/verify',{factorId,code});setEnrollment(null);setCode('');setSelected('');await onChange(r)}catch(e){setError(err(e))}finally{setBusy(false)}}
  return <section className={'panel stack'+(me.mfa.locked?' admin-login':'')}><p className="eyebrow yellow flex items-center gap-2"><ShieldCheck size={18}/> SÉCURITÉ ADMINISTRATEUR</p>
    <h2>{me.mfa.locked?'Vérifie ton identité':'Double authentification'}</h2>
    <p>{me.mfa.hasVerified?'Ton compte dispose d’un second facteur.':'Protège ton compte avec une application TOTP (Google Authenticator, Microsoft Authenticator, etc.). Aucun e-mail ni SMS nécessaire.'}</p>
    {me.mfa.currentLevel==='aal2'&&<p className="yellow">Session vérifiée à deux facteurs.</p>}
    {enrollment?<><p>Scanne ce QR code dans ton application. Ne partage ni le QR ni la clé.</p><img src={enrollment.qr} width={256} height={256} alt="QR de configuration TOTP confidentiel" style={{background:'#fff',borderRadius:8,maxWidth:'100%'}}/><details><summary>Saisir la clé manuellement</summary><p style={{overflowWrap:'anywhere'}}>{enrollment.secret}</p></details><button type="button" className="btn outline" disabled={busy} onClick={()=>void cancel(enrollment.factorId)}>Annuler cette configuration</button></>:<>
      {canEnroll&&pending.map(f=><div key={f.id}><p>Une configuration non terminée existe. Annule-la si tu n’as plus son QR code.</p><button type="button" className="btn outline" disabled={busy} onClick={()=>void cancel(f.id)}>Annuler la configuration</button></div>)}
      {canEnroll&&!pending.length&&<button type="button" className="btn" disabled={busy} onClick={()=>void enroll()}>{me.mfa.hasVerified?'Ajouter un appareil de secours':'Configurer mon authentificateur'}</button>}
      {me.mfa.hasVerified&&me.mfa.currentLevel!=='aal2'&&factors.length===0&&<p>Le facteur existant n’est pas un TOTP pris en charge par ce site. Contacte le responsable Supabase.</p>}
    </>}
    {(enrollment||(me.mfa.locked&&factors.length>0))&&<form className="stack" onSubmit={verify}>
      {!enrollment&&factors.length>1&&<label>Appareil<select value={factorId} onChange={e=>setSelected(e.target.value)}>{factors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
      <label>Code à 6 chiffres<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
      <button className="btn" disabled={busy||!/^\d{6}$/.test(code)||!factorId}>Vérifier le code</button>
    </form>}
    <p>Conserve un second appareil de confiance pour la récupération. Ne partage jamais un code ou une clé.</p>
    {me.mfa.locked&&<button type="button" className="btn outline" onClick={()=>void onLogout()}>Se déconnecter</button>}
    <p className="error" role="alert">{error}</p>
  </section>
}
