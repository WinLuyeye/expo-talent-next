export const trafficDevices = ['mobile','tablet','desktop','unknown'] as const;
export const trafficChannels = ['direct','search','social','messaging','referral'] as const;
export type TrafficDevice = typeof trafficDevices[number];
export type TrafficChannel = typeof trafficChannels[number];
export type TrafficRow = {day:string;device:TrafficDevice;channel:TrafficChannel;pageviews:number;sessions:number};
export type TrafficReport = {start:string;end:string;rows:TrafficRow[];registrations:{day:string;total:number}[]};
export const deviceLabels:Record<TrafficDevice,string> = {mobile:'Téléphone',tablet:'Tablette',desktop:'Ordinateur',unknown:'Non déterminé'};
export const channelLabels:Record<TrafficChannel,string> = {direct:'Direct / non identifié',search:'Moteurs de recherche',social:'Réseaux sociaux',messaging:'Messageries',referral:'Autres sites'};
export function classifyDevice(ua:string):TrafficDevice {
  if(!ua.trim())return 'unknown';
  if(/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua))return 'tablet';
  if(/Mobile|iPhone|iPod|Android|Windows Phone/i.test(ua))return 'mobile';
  return /Windows NT|Macintosh|X11|Linux|CrOS/i.test(ua)?'desktop':'unknown';
}
export function classifyChannel(referrer:string,origin:string):TrafficChannel {
  if(!referrer)return 'direct';
  try {
    const u=new URL(referrer), h=u.hostname.toLowerCase();
    if(u.origin===origin)return 'direct';
    if(!['http:','https:'].includes(u.protocol))return 'direct';
    if(/(^|\.)(wa\.me|whatsapp\.com|t\.me|telegram\.org|messenger\.com|signal\.org)$/.test(h))return 'messaging';
    if(/(^|\.)(facebook\.com|fb\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|youtu\.be|snapchat\.com|threads\.net|threads\.com|reddit\.com)$/.test(h))return 'social';
    if(/(^|\.)(google\.[a-z]{2,}(\.[a-z]{2})?|bing\.com|yahoo\.com|duckduckgo\.com|ecosia\.org|brave\.com|yandex\.com|yandex\.ru)$/.test(h))return 'search';
    return 'referral';
  } catch {return 'direct';}
}
export function localDay(date=new Date()):string {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Kinshasa',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=(t:string)=>parts.find(p=>p.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function summarizeTraffic(report:TrafficReport){
  const byDay=new Map<string,{day:string;pageviews:number;sessions:number;registrations:number}>();
  for(let date=new Date(report.start+'T00:00:00Z'),i=0;date.toISOString().slice(0,10)<=report.end&&i<90;date.setUTCDate(date.getUTCDate()+1),i++){
    const day=date.toISOString().slice(0,10);byDay.set(day,{day,pageviews:0,sessions:0,registrations:0});
  }
  const devices=trafficDevices.map(key=>({key,label:deviceLabels[key],pageviews:0,sessions:0}));
  const channels=trafficChannels.map(key=>({key,label:channelLabels[key],pageviews:0,sessions:0}));
  for(const r of report.rows){
    const day=byDay.get(r.day);if(!day)continue;
    day.pageviews+=r.pageviews;day.sessions+=r.sessions;
    const device=devices.find(d=>d.key===r.device);if(device){device.pageviews+=r.pageviews;device.sessions+=r.sessions;}
    const channel=channels.find(d=>d.key===r.channel);if(channel){channel.pageviews+=r.pageviews;channel.sessions+=r.sessions;}
  }
  for(const r of report.registrations){const day=byDay.get(r.day);if(day)day.registrations+=r.total;}
  const daily=[...byDay.values()];const totals=daily.reduce((s,r)=>({pageviews:s.pageviews+r.pageviews,sessions:s.sessions+r.sessions,registrations:s.registrations+r.registrations}),{pageviews:0,sessions:0,registrations:0});
  const peak=daily.reduce<(typeof daily)[number]|null>((best,row)=>row.pageviews>(best?.pageviews??0)?row:best,null);
  return {daily,devices,channels,totals,peak};
}
