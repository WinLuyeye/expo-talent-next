'use client';
import {useEffect,useRef,useState} from 'react';
import {classifyChannel} from '@/lib/traffic-model';
const preferenceKey='expo-audience-choice-v1';
const sessionKey='expo-audience-tab-v1';
type Choice='yes'|'no'|'unknown';
function privacySignal(){return navigator.doNotTrack==='1'||(navigator as Navigator & {globalPrivacyControl?:boolean}).globalPrivacyControl===true;}
export default function PublicTraffic(){
  const [choice,setChoice]=useState<Choice>('unknown'),[ready,setReady]=useState(false),[blocked,setBlocked]=useState(false),[open,setOpen]=useState(false);
  const recorded=useRef(false);
  useEffect(()=>{
    if(privacySignal()){setBlocked(true);setChoice('no');setReady(true);return;}
    try{const stored=localStorage.getItem(preferenceKey);if(stored==='yes'||stored==='no')setChoice(stored);else setOpen(true);}catch{setOpen(true);}
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready||choice!=='yes'||blocked||recorded.current)return;
    recorded.current=true;
    try{
      let session=crypto.randomUUID();
      try{const existing=sessionStorage.getItem(sessionKey);if(existing&&/^[0-9a-f-]{36}$/i.test(existing))session=existing;else sessionStorage.setItem(sessionKey,session);}catch{}
      const channel=classifyChannel(document.referrer,location.origin);
      void fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,channel}),keepalive:true,cache:'no-store'}).catch(()=>{});
    }catch{/* Le site fonctionne même si la mesure échoue. */}
  },[choice,blocked,ready]);
  function choose(v:'yes'|'no'){setChoice(v);setOpen(false);try{localStorage.setItem(preferenceKey,v);if(v==='no')sessionStorage.removeItem(sessionKey);}catch{}}
  if(!ready)return null;
  return <div className="audience-preferences">
    <button type="button" className="link" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>Préférences de mesure d’audience</button>
    {open&&<section className="audience-consent" aria-label="Mesure d’audience facultative"><div><strong>Nous aider à améliorer EXPO TALENT</strong><p>Avec ton accord, nous comptons les chargements du site, le type d’appareil et la provenance générale, sans cookies publicitaires. Le choix est modifiable ici à tout moment.</p>{blocked&&<p>Le signal de confidentialité de ton navigateur désactive la mesure.</p>}</div><div className="audience-consent-actions">{!blocked&&<button type="button" className="btn small outline" onClick={()=>choose('no')}>Refuser</button>}{!blocked&&<button type="button" className="btn small" onClick={()=>choose('yes')}>Autoriser</button>}{blocked&&<button type="button" className="btn small outline" onClick={()=>setOpen(false)}>Fermer</button>}</div></section>}
  </div>;
}
