export const IDLE_SECONDS=20*60;
export const IDLE_UI_MS=15*60*1000;
export const DRAFT_TTL_MS=24*60*60*1000;
export const draftFields=['nom','postnom','prenom','sexe','email','telephone','matricule','filiere','departement','promotion','vacation','categorie','intitule','description','type','groupe','participants','besoins','motivation','video'] as const;
export const stepFields=[['nom','postnom','prenom','email','telephone'],['matricule','filiere','departement','promotion'],['categorie','intitule','description','type','motivation','video'],['certifie','reglement','consentement']] as const;
export function validPhone(s:string){return /^[+0-9 ()-]{7,25}$/.test(s)&&/^\+?\d{7,15}$/.test(s.replace(/[ ()-]/g,''));}
export function validMatricule(s:string){const v=s.replace(/\s+/g,'');return v.length>=2&&v.length<=80&&/[\p{L}\p{N}]/u.test(v)&&!/[\p{Cc}\p{Cf}]/u.test(v);}
export function safeText(s:string){return !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(s);}
export function safeHttps(s:string){if(!s)return true;if(!/^https:\/\//i.test(s))return false;try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}}
export function fieldIssue(key:string,value:unknown,required=true):string{
  if(['certifie','reglement','consentement'].includes(key))return value===true?'':'Cette confirmation est nécessaire.';
  const s=String(value??'').trim();if(!s)return required?'Ce champ est obligatoire.':'';
  if(!safeText(s))return 'Ce champ contient des caractères non autorisés.';
  if(key==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))return 'Indique une adresse e-mail valide.';
  if(key==='telephone'&&!validPhone(s))return 'Indique un numéro de 7 à 15 chiffres, avec indicatif si nécessaire.';
  if(key==='matricule'&&!validMatricule(s))return 'Indique ton matricule étudiant (2 à 80 caractères).';
  if(key==='video'&&!safeHttps(s))return 'Utilise un lien HTTPS sans identifiants.';
  if(key==='participants'&&(!Number.isInteger(Number(s))||Number(s)<2||Number(s)>100))return 'Indique entre 2 et 100 participants.';
  if(key==='type'&&!['Individuelle','En groupe'].includes(s))return 'Choisis un type de participation.';
  if(s.length>(['description','motivation','besoins'].includes(key)?2000:key==='video'?500:key==='telephone'?25:key==='matricule'?150:150))return 'Ce champ est trop long.';
  return '';
}
export function sanitizeDraft(input:unknown):Record<string,string|number|boolean>{
  const output:Record<string,string|number|boolean>={};if(!input||typeof input!=='object'||Array.isArray(input))return output;
  const data=input as Record<string,unknown>;
  for(const k of draftFields){const v=data[k];if(typeof v==='string'&&safeText(v)&&v.length<=2000)output[k]=v;else if(k==='participants'&&typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=100)output[k]=v;}
  return output;
}
export function readDraft(raw:string|null,now=Date.now()){
  if(!raw)return null;try{const d=JSON.parse(raw);if(!Number.isFinite(d.saved)||d.saved>now||now-d.saved>=DRAFT_TTL_MS)return null;return {saved:d.saved,values:sanitizeDraft(d.values)};}catch{return null;}
}
export function validIdleStamp(stamp:number,now=Date.now()){return Number.isSafeInteger(stamp)&&stamp<=now+5000&&now-stamp<IDLE_SECONDS*1000;}
export function captchaMode(site:string|undefined,secret:string|undefined,required:string|undefined){return site&&secret?'enabled':site||secret||required==='true'?'misconfigured':'disabled';}
