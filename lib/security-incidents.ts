import 'server-only';
import {db,digest,limit,source} from './server';
import {secureEndpoint} from './security-runtime';
import {alertEmailConfigured,mailConfigured} from './launch-policy';
type Kind='login_failure'|'login_blocked'|'server_error'|'file_rejected';
export async function securityEvent(kind:Kind,req:Request,account?:string){
 try{
   const ip=source(req);const src=ip==='local'?'-':digest('security-source:'+ip);const tag=account?digest('security-account:'+account.trim().toLowerCase()):'-';
   // Prevent incident logging itself from becoming a high-volume write endpoint.
   await limit('security-log:'+kind+':'+ip,40,60);
   const r=await db().rpc('expo_security_record',{p_kind:kind,p_account:tag,p_source:src});
   if(r.error){console.error('EXPO security event unavailable');return;}
   if(!r.data)return;
   console.warn('EXPO security incident',r.data.kind,r.data.hits,r.data.sources);
   const recipient=process.env.SECURITY_ALERT_EMAIL;
   if(alertEmailConfigured(mailConfigured(process.env.RESEND_API_KEY,process.env.EMAIL_FROM),recipient)){
     try{const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.RESEND_API_KEY}`},body:JSON.stringify({from:process.env.EMAIL_FROM,to:[recipient],subject:'EXPO TALENT — Alerte de sécurité',text:`Type : ${r.data.kind}\nÉvénements : ${r.data.hits}\nSources : ${r.data.sources}\nFenêtre : ${r.data.bucket}\nConsulte l’espace Coordination, rubrique Sécurité.`}),redirect:'error',signal:AbortSignal.timeout(3000)});if(!res.ok)console.error('EXPO incident email refused');}catch{console.error('EXPO incident email unavailable');}
   }
   const url=secureEndpoint(process.env.SECURITY_WEBHOOK_URL),secret=process.env.SECURITY_WEBHOOK_TOKEN;
   if(url&&secret&&secret.length>=32){try{const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${secret}`},body:JSON.stringify({project:'EXPO TALENT',kind:r.data.kind,hits:r.data.hits,sources:r.data.sources,bucket:r.data.bucket}),redirect:'error',signal:AbortSignal.timeout(3000)});if(!res.ok)console.error('EXPO incident notification refused');}catch{console.error('EXPO incident notification unavailable');}}
 }catch{/* Never weaken authentication or change the original response if logging fails. */}
}
