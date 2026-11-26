import {securityEvent} from '@/lib/security-incidents';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db,digest,limit,source,origin,HttpError} from '@/lib/server';
import {classifyDevice,localDay,trafficChannels} from '@/lib/traffic-model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const schema=z.object({session:z.string().uuid(),channel:z.enum(trafficChannels)}).strict();
const empty=()=>new NextResponse(null,{status:204,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
  try{
    origin(req);
    const ua=req.headers.get('user-agent')||'';
    if(req.headers.get('dnt')==='1'||req.headers.get('sec-gpc')==='1'||/bot|crawler|spider|headless|preview|curl|wget/i.test(ua))return empty();
    if(Number(req.headers.get('content-length')||0)>1024)return new NextResponse(null,{status:413});
    const raw=await req.text();if(raw.length>1024)return new NextResponse(null,{status:413});
    const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return new NextResponse(null,{status:400});
    await limit('traffic:'+localDay()+':'+source(req),600,600);
    const day=localDay();const data=parsed.data;
    const r=await db().rpc('expo_record_traffic',{p_day:day,p_token:digest('traffic-session:'+day+':'+data.session),p_device:classifyDevice(ua),p_channel:data.channel});
    if(r.error)throw new HttpError('Mesure d’audience indisponible.',503);
    return empty();
  }catch(e){if(!(e instanceof SyntaxError)&&(!(e instanceof HttpError)||e.status>=500))await securityEvent('server_error',req);return new NextResponse(null,{status:e instanceof HttpError?e.status:e instanceof SyntaxError?400:503,headers:{'Cache-Control':'no-store'}});}
}
