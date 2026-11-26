import 'server-only';
import {captchaMode} from './security-policy';
import {HttpError} from './server';
export function turnstileConfig(){const site=process.env.TURNSTILE_SITE_KEY;const mode=captchaMode(site,process.env.TURNSTILE_SECRET_KEY,process.env.TURNSTILE_REQUIRED);return {mode,siteKey:mode==='enabled'?site!:''};}
export async function verifyTurnstile(token:unknown,req:Request){
 const {mode}=turnstileConfig();if(mode==='disabled')return;
 if(mode==='misconfigured')throw new HttpError('Vérification anti-robot indisponible. Réessaie plus tard.',503);
 if(typeof token!=='string'||!token||token.length>2048)throw new HttpError('Confirme la vérification anti-robot.');
 const expected=new URL(process.env.APP_ORIGIN||req.url).hostname;
 let data:{success?:boolean;hostname?:string;action?:string};
 try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY!,response:token}),signal:AbortSignal.timeout(8000),cache:'no-store'});if(!response.ok)throw Error('provider');data=await response.json();}catch{throw new HttpError('Vérification anti-robot indisponible. Réessaie plus tard.',503);}
 if(data.success!==true||data.hostname!==expected||data.action!=='registration')throw new HttpError('Vérification anti-robot expirée ou invalide. Réessaie.');
}
