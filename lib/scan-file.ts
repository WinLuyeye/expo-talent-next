import 'server-only';
import {createHash} from 'node:crypto';
import {secureEndpoint,scanVerdict} from './security-runtime';
export class ScanFailure extends Error{constructor(public reason:'infected'|'unavailable'){super(reason)}}
export function scannerConfigured(){return !!secureEndpoint(process.env.FILE_SCAN_URL)&&!!process.env.FILE_SCAN_TOKEN&&process.env.FILE_SCAN_TOKEN.length>=32;}
export async function scanFile(bytes:Buffer){
 const endpoint=secureEndpoint(process.env.FILE_SCAN_URL),token=process.env.FILE_SCAN_TOKEN;
 if(!endpoint||!token||token.length<32)throw new ScanFailure('unavailable');
 const hash=createHash('sha256').update(bytes).digest('hex');
 let verdict:ReturnType<typeof scanVerdict>='unknown';
 try{const res=await fetch(endpoint,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/octet-stream'},body:new Uint8Array(bytes),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});if(res.ok)verdict=scanVerdict(await res.json(),hash);}catch{/* Fail closed. */}
 if(verdict==='infected')throw new ScanFailure('infected');if(verdict!=='clean')throw new ScanFailure('unavailable');
}
