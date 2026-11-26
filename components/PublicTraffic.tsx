'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {classifyChannel} from '@/lib/traffic-model';
const preferenceKey='expo-audience-choice-v1';
const sessionKey='expo-audience-tab-v1';
type Choice='yes'|'no'|'unknown';
function privacySignal(){return navigator.doNotTrack==='1'||(navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl===true;}
type Preferences={choice:Choice;ready:boolean;blocked:boolean;choose:(v:'yes'|'no')=>void};
const AudienceContext=createContext<Preferences|null>(null);

export function AudienceSettings(){
  const preferences=useContext(AudienceContext);
  if(!preferences||!preferences.ready)return null;
  const {choice,blocked,choose}=preferences;
  return <section className="audience-settings" aria-label="Mesure d’audience">
    <h3>Mesure d’audience</h3>
    <p>Nous comptons les chargements du site, le type d’appareil et la provenance générale uniquement avec ton accord. Ce choix ne change pas l’accès aux inscriptions.</p>
    <p className="audience-settings-state" role="status">{blocked?'Désactivée par ton navigateur.':choice==='yes'?'Activée':choice==='no'?'Désactivée':'Aucun choix enregistré'}</p>
    {!blocked&&<div className="audience-settings-actions"><button type="button" className={choice==='no'?'btn small':'btn small outline'} aria-pressed={choice==='no'} onClick={()=>choose('no')}>Refuser</button><button type="button" className={choice==='yes'?'btn small':'btn small outline'} aria-pressed={choice==='yes'} onClick={()=>choose('yes')}>Autoriser</button></div>}
  </section>;
}

export default function PublicTraffic({children}:{children:ReactNode}){
  const [choice,setChoice]=useState<Choice>('unknown'),[ready,setReady]=useState(false),[blocked,setBlocked]=useState(false),[open,setOpen]=useState(false);
  const recorded=useRef(false);
  useEffect(()=>{
    if(privacySignal()){setBlocked(true);setChoice('no');setReady(true);return;}
    try{const stored=localStorage.getItem(preferenceKey);if(stored==='yes'||stored==='no')setChoice(stored);else setOpen(true);}catch{setOpen(true);}
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready||choice!=='yes'||blocked||recorded.current||privacySignal())return;
    recorded.current=true;
    try{
      let session=crypto.randomUUID();
      try{const existing=sessionStorage.getItem(sessionKey);if(existing&&/^[0-9a-f-]{36}$/i.test(existing))session=existing;else sessionStorage.setItem(sessionKey,session);}catch{}
      const channel=classifyChannel(document.referrer,location.origin);
      void fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,channel}),keepalive:true,cache:'no-store'}).catch(()=>{});
    }catch{/* Le site fonctionne même si la mesure échoue. */}
  },[choice,blocked,ready]);
  function choose(v:'yes'|'no'){if(v==='yes'&&privacySignal()){setBlocked(true);setChoice('no');setOpen(false);return;}setChoice(v);setOpen(false);try{localStorage.setItem(preferenceKey,v);if(v==='no')sessionStorage.removeItem(sessionKey);}catch{}}
  return <AudienceContext.Provider value={{choice,ready,blocked,choose}}>
    {children}
    {ready&&open&&!blocked&&<section className="audience-consent" aria-label="Mesure d’audience facultative"><div><strong>Nous aider à améliorer EXPO TALENT</strong><p>Avec ton accord, nous comptons les chargements du site, le type d’appareil et la provenance générale, sans cookies publicitaires. Tu peux modifier ce choix dans Confidentialité.</p></div><div className="audience-consent-actions"><button type="button" className="btn small outline" onClick={()=>choose('no')}>Refuser</button><button type="button" className="btn small" onClick={()=>choose('yes')}>Autoriser</button></div></section>}
  </AudienceContext.Provider>;
}
