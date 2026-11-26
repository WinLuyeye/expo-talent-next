// Pure helpers for the nonce policy and scanner contract; no secrets here.
export function contentPolicy(nonce:string,production:boolean,strict:boolean){
 if(!/^[A-Za-z0-9+/=]+$/.test(nonce))throw Error('Invalid CSP nonce');
 const script=strict?`'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`:"'self' 'unsafe-inline' https://challenges.cloudflare.com";
 return ["default-src 'self'",`script-src ${script}${production?'':" 'unsafe-eval'"}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https:","font-src 'self' data:","connect-src 'self' https://challenges.cloudflare.com"+(production?'':' ws: wss:'),"frame-src https://challenges.cloudflare.com","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'","worker-src 'self' blob:"].join('; ');
}
export function secureEndpoint(raw:string|undefined){if(!raw)return null;try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash?u.href:null;}catch{return null;}}
export function scanVerdict(data:unknown,hash:string):'clean'|'infected'|'unknown'{if(!data||typeof data!=='object')return 'unknown';const v=data as Record<string,unknown>;return v.sha256===hash&&(v.verdict==='clean'||v.verdict==='infected')?v.verdict:'unknown';}
