'use client';
import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import type {Values} from '@/lib/shared';
import {readDraft,sanitizeDraft} from '@/lib/security-policy';
const key='expo-registration-draft-v1';
export function useRegistrationDraft(values:Values,setValues:Dispatch<SetStateAction<Values>>,setStep:Dispatch<SetStateAction<number>>,success:boolean){
 const [enabled,setEnabled]=useState(false),[saved,setSaved]=useState<ReturnType<typeof readDraft>>(null),[notice,setNotice]=useState(''),[online,setOnline]=useState(true);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{try{const d=readDraft(localStorage.getItem(key));setSaved(d);if(!d)localStorage.removeItem(key);}catch{}setLoaded(true);const update=()=>setOnline(navigator.onLine);update();window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{if(!loaded||!enabled||success)return;try{localStorage.setItem(key,JSON.stringify({saved:Date.now(),values:sanitizeDraft(values)}));}catch{setNotice('Le navigateur ne permet pas de sauvegarder ce brouillon.');}},[loaded,enabled,values,success]);
 function clear(){try{localStorage.removeItem(key);}catch{}setEnabled(false);setSaved(null);setNotice('');}
 function enable(){setSaved(null);setEnabled(true);setNotice('Brouillon conservé sur cet appareil.');}
 function restore(){if(!saved)return;const d=readDraft(JSON.stringify(saved));if(!d){clear();return;}setValues({type:'Individuelle',participants:1,...d.values});setStep(0);enable();setNotice('Brouillon restauré. Vérifie les champs et joins de nouveau tes fichiers.');}
 useEffect(()=>{if(success){try{localStorage.removeItem(key);}catch{}setEnabled(false);setSaved(null);}},[success]);
 return {enabled,saved,notice,online,clear,enable,restore,loaded};
}
export function DraftControls({draft}:{draft:ReturnType<typeof useRegistrationDraft>}){return <div className="registration-safety">{!draft.online&&<p role="status" className="error">Connexion interrompue. Tes champs restent en mémoire ; reconnecte-toi avant d’envoyer.</p>}{draft.loaded&&<><p>Sur un appareil personnel, tu peux garder un brouillon pendant 24 heures après la dernière modification. Les fichiers et consentements ne sont pas sauvegardés.</p>{draft.saved?<div className="actions"><button type="button" className="btn outline small" onClick={draft.restore}>Reprendre le brouillon</button><button type="button" className="link" onClick={draft.clear}>Effacer le brouillon</button></div>:<label className="check"><input type="checkbox" checked={draft.enabled} onChange={e=>e.target.checked?draft.enable():draft.clear()}/>Sauvegarder sur cet appareil (facultatif)</label>}{draft.notice&&<small role="status">{draft.notice}</small>}</>}</div>}
type Widget={render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};
let scriptPromise:Promise<Widget>|null=null;
function loadWidget(){
 const w=window as Window&{turnstile?:Widget};if(w.turnstile)return Promise.resolve(w.turnstile);
 if(!scriptPromise)scriptPromise=new Promise<Widget>((resolve,reject)=>{const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;let timeout:number;const fail=()=>{window.clearTimeout(timeout);script.remove();scriptPromise=null;reject(Error('Vérification indisponible.'));};script.onload=()=>{window.clearTimeout(timeout);if(w.turnstile)resolve(w.turnstile);else fail();};script.onerror=fail;timeout=window.setTimeout(fail,12000);document.head.appendChild(script);});return scriptPromise;
}
export function TurnstileWidget({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}){
 const target=useRef<HTMLDivElement>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true,id:string|undefined,widget:Widget|undefined;onToken('');setError('');loadWidget().then(w=>{if(!live||!target.current)return;widget=w;id=w.render(target.current,{sitekey:siteKey,theme:'dark',size:'flexible',action:'registration','response-field':false,callback:(token:string)=>{if(live){onToken(token);setError('');}},'expired-callback':()=>{if(live)onToken('');},'error-callback':()=>{if(live){onToken('');setError('Vérification indisponible. Réessaie.');}}});}).catch(()=>{if(live)setError('Impossible de charger la vérification. Réessaie.');});return()=>{live=false;if(id&&widget)widget.remove(id);};},[siteKey,onToken,retry]);
 return <div className="wide registration-safety"><p>Vérification de sécurité</p><div ref={target}/>{error&&<p role="alert" className="error">{error} <button type="button" className="link" onClick={()=>setRetry(n=>n+1)}>Réessayer</button></p>}</div>;
}
