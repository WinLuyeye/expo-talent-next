import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {Resend} from 'resend';
import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import QRCode from 'qrcode';
import {acceptancePDF,acceptanceSubject} from './acceptance';
import {IDLE_SECONDS,validIdleStamp} from './security-policy';
import {needsSecondFactor} from './mfa-policy';
import {defaults,fullName,type Entry,type Settings} from './shared';
export class HttpError extends Error{constructor(message:string,public status=400){super(message)}}
export function env(k:string){const v=process.env[k];if(!v)throw new HttpError('Configuration du service incomplète.',503);return v}
export function db(){return createClient(env('NEXT_PUBLIC_SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})}
export async function auth(){const jar=await cookies();return createServerClient(env('NEXT_PUBLIC_SUPABASE_URL'),env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),{cookies:{getAll:()=>jar.getAll(),setAll:(list)=>{for(const {name,value,options} of list)jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'})}}})}
export function must<T>(r:{data:T;error:any}):NonNullable<T>{if(r.error||r.data===null)throw new HttpError('Opération de base de données impossible.',500);return r.data as NonNullable<T>}
export async function settings(){const r=must(await db().from('event_settings').select('data').eq('id',1).single());return {...defaults,...r.data} as Settings}
type AuthClient=Awaited<ReturnType<typeof auth>>;
export async function requireAdminIdentity(client?:AuthClient){
  const a=client??await auth();const {data:{session},error:sessionError}=await a.auth.getSession();
  if(sessionError||!session)throw new HttpError('Connexion requise.',401);
  const {data:{user},error}=await a.auth.getUser(session.access_token);
  if(error||!user)throw new HttpError('Connexion requise.',401);
  const r=await db().from('admin_roles').select('role').eq('id',user.id).maybeSingle();
  if(r.error)throw new HttpError('Vérification des permissions indisponible.',503);
  if(!r.data||!['owner','reviewer'].includes(r.data.role))throw new HttpError('Accès refusé.',403);
  let sessionId:string;try{sessionId=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString('utf8')).session_id;if(typeof sessionId!=='string'||!/^[0-9a-f-]{36}$/i.test(sessionId))throw Error('session');}catch{throw new HttpError('Session invalide.',401);}
  return {id:user.id,email:user.email||'',role:r.data.role as 'owner'|'reviewer',sessionId};
}
const idleCookie='expo-admin-activity';
export async function clearAdminActivity(){(await cookies()).delete(idleCookie)}
async function checkAdminActivity(userId:string,sessionId:string,initialize:boolean){
  const jar=await cookies(), now=Date.now();
  if(!initialize){const value=jar.get(idleCookie)?.value||'',parts=value.split('.');const stamp=Number(parts[0]);const expected=digest('admin-idle:'+userId+':'+sessionId+':'+parts[0]);
    if(parts.length!==2||!validIdleStamp(stamp,now)||!/^[a-f0-9]{64}$/.test(parts[1]||'')||!timingSafeEqual(Buffer.from(parts[1],'hex'),Buffer.from(expected,'hex')))throw new HttpError('Session expirée. Reconnecte-toi.',401);
  }
  const signed=now+'.'+digest('admin-idle:'+userId+':'+sessionId+':'+now);
  jar.set(idleCookie,signed,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:IDLE_SECONDS});
}
export async function auditEvent(actorId:string,action:'session.login'|'session.logout'|'export.request'|'attachment.request'|'notification.request'|'gallery.request'|'account.request',target:string,details:Record<string,string|number>={}){
  const r=await db().from('admin_audit').insert({actor_id:actorId,action,target_ref:target,details});if(r.error)throw new HttpError('Journal de sécurité indisponible.',503);
}
export async function adminAccess(client?:AuthClient,initialize=false){
  const a=client??await auth();const {sessionId,...me}=await requireAdminIdentity(a);
  await checkAdminActivity(me.id,sessionId,initialize);
  const {data:level,error:levelError}=await a.auth.mfa.getAuthenticatorAssuranceLevel();
  const {data:factors,error:factorError}=await a.auth.mfa.listFactors();
  if(levelError||factorError||!level||!factors||!level.currentLevel)throw new HttpError('Vérification de sécurité indisponible.',503);
  const verified=factors.all.filter(f=>f.status==='verified');
  const required=process.env.ADMIN_MFA_REQUIRED==='true';
  return {...me,mfa:{required,locked:needsSecondFactor(level.currentLevel,verified.length>0,level.nextLevel,required),currentLevel:level.currentLevel,hasVerified:verified.length>0,
    factors:factors.all.filter(f=>f.factor_type==='totp').map(f=>({id:f.id,name:f.friendly_name||'Application d’authentification',verified:f.status==='verified'}))}};
}
export async function requireAdmin(owner=false){
  const me=await adminAccess();
  if(me.mfa.locked)throw new HttpError('Double authentification requise.',403);
  if(owner&&me.role!=='owner')throw new HttpError('Accès refusé.',403);
  return me;
}
export function digest(s:string){const key=env('TRACKING_SECRET');if(key.length<32)throw new HttpError('Configuration de sécurité incomplète.',503);return createHmac('sha256',key).update(s).digest('hex')}
export async function limit(key:string,n:number,seconds:number){const ok=must(await db().rpc('expo_limit',{p_key:digest(key),p_max:n,p_seconds:seconds}));if(!ok)throw new HttpError('Trop de demandes. Réessaie plus tard.',429)}
export function source(req:Request){return req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'local'}
export function origin(req:Request){const expected=process.env.APP_ORIGIN||new URL(req.url).origin;const actual=req.headers.get('origin');if(!actual||actual!==new URL(expected).origin)throw new HttpError('Origine non autorisée.',403)}
export async function deliver(id:string){const d=db();const claim=await d.from('outbox').update({state:'sending',updated:new Date().toISOString(),error:null}).eq('id',id).in('state',['pending','failed']).select().maybeSingle();if(claim.error||!claim.data)return false;const row=claim.data;try{const resend=new Resend(env('RESEND_API_KEY'));let attachments:{filename:string;content:Buffer}[]|undefined;
if(row.subject===acceptanceSubject){const a=must(await d.from('applications').select('*').eq('id',row.app_id).single()) as Entry;if(!['Candidature acceptée','Participation confirmée'].includes(a.status))throw new HttpError('La candidature n’est plus acceptée.');attachments=[{filename:`Fiche-acceptation-${a.id}.pdf`,content:await acceptancePDF(a,row.created)}];}
const r=await resend.emails.send({from:env('EMAIL_FROM'),to:row.recipient,subject:row.subject,text:row.body,...(attachments?{attachments}:{})},{idempotencyKey:'expo-'+id});if(r.error)throw Error('Le service d’envoi a refusé le message.');const done=await d.from('outbox').update({state:'sent',updated:new Date().toISOString(),error:null}).eq('id',id);return !done.error}catch(error){await d.from('outbox').update({state:'failed',error:error instanceof HttpError&&error.message==='La candidature n’est plus acceptée.'?error.message:'Envoi non confirmé. Vérifiez la configuration Resend.',updated:new Date().toISOString()}).eq('id',id);return false}}
export async function sendCode(to:string,code:string){const resend=new Resend(env('RESEND_API_KEY'));const r=await resend.emails.send({from:env('EMAIL_FROM'),to,subject:'Code de suivi — EXPO TALENT ISS-KIN',text:`Ton code de vérification est ${code}. Il expire dans 10 minutes. Ne le partage pas.`});if(r.error)throw new HttpError('Envoi du code indisponible.',503)}
export async function gallery(){const rows=must(await db().from('gallery').select('id,path,caption,kind').order('created',{ascending:false}));return rows.map(r=>({...r,path:r.kind==='image'?db().storage.from('expo-gallery').getPublicUrl(r.path).data.publicUrl:r.path}))}
export async function upload(file:File,bucket:'expo-private'|'expo-gallery'){if(!file.size||file.size>3*1024*1024)throw new HttpError('Fichier limité à 3 Mo.');const b=Buffer.from(await file.arrayBuffer());let mime='',ext='';if(b[0]===255&&b[1]===216&&b[2]===255){mime='image/jpeg';ext='jpg'}else if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){mime='image/png';ext='png'}else if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'){mime='image/webp';ext='webp'}else if(bucket==='expo-private'&&b.subarray(0,5).toString()==='%PDF-'){mime='application/pdf';ext='pdf'}else throw new HttpError('Format de fichier non autorisé.');const path=randomUUID()+'.'+ext;must(await db().storage.from(bucket).upload(path,b,{contentType:mime,upsert:false}));return path}
export async function receipt(a:Entry){const doc=await PDFDocument.create();const page=doc.addPage([595,842]);const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);const safe=(s:string)=>Array.from(s).map(c=>{try{font.encodeText(c);return c}catch{return '?'}}).join('');const text=(s:string,x:number,y:number,size=12,b=false)=>page.drawText(safe(s),{x,y,size,font:b?bold:font,color:rgb(.05,.08,.18),maxWidth:495});page.drawRectangle({x:0,y:715,width:595,height:127,color:rgb(.08,.12,.28)});page.drawText('EXPO TALENT - ISS-KIN',{x:48,y:773,size:27,font:bold,color:rgb(1,.9,.1)});page.drawText('COORDINATION ESTUDIANTINE',{x:48,y:745,size:12,font,color:rgb(1,1,1)});text('Récépissé d’inscription',48,675,24,true);text(a.id,48,637,20,true);let y=595;for(const [k,v] of [['Nom complet',fullName(a.data)],['Promotion',String(a.data.promotion)],['Catégorie',String(a.data.categorie)],['Statut',a.status],['Date',new Date(a.created).toLocaleDateString('fr-FR',{timeZone:'Africa/Kinshasa'})]]){text(k,48,y,11,true);text(v.slice(0,150),48,y-19);y-=55}const qr=await doc.embedPng(await QRCode.toBuffer(a.id,{width:220,margin:2}));page.drawImage(qr,{x:48,y:155,width:130,height:130});text('QR : référence de vérification uniquement.',48,125,11);text('Révélons aujourd’hui les talents qui façonneront demain !',48,78,11,true);return Buffer.from(await doc.save()).toString('base64')}
export async function allRows(table:string,sort='created'){const out:any[]=[];for(let i=0;;i+=500){const r=must(await db().from(table).select('*').order(sort,{ascending:false}).range(i,i+499));out.push(...r);if(r.length<500)return out}}
