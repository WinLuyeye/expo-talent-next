import {NextResponse} from 'next/server';
import {workbookReport,pdfReport,reportResponse,type Report} from '@/lib/report-export';
import {db,requireAdmin,HttpError,must,auditEvent} from '@/lib/server';
import {summarizeTraffic,deviceLabels,channelLabels,type TrafficReport} from '@/lib/traffic-model';
export const runtime='nodejs';
export const maxDuration=60;
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
export async function GET(req:Request){
  try{
    const me=await requireAdmin(true);
    const params=new URL(req.url).searchParams,period=params.get('days')||'30',format=params.get('format')||'json';
    if(!['7','30','90'].includes(period)||!['json','pdf','xlsx'].includes(format))throw new HttpError('Période ou format invalide.');
    const report=must(await db().rpc('expo_traffic_report',{p_days:Number(period)})) as TrafficReport;
    if(format==='json')return NextResponse.json(report,{headers});
    await auditEvent(me.id,'export.request','audience.'+format,{days:Number(period)});
    const summary=summarizeTraffic(report),name=`expo-talent-audience-${report.start}-${report.end}`;
    const daily=[['Date (Kinshasa)','Pages vues','Sessions quotidiennes estimées','Inscriptions réelles'],...summary.daily.map(r=>[r.day,r.pageviews,r.sessions,r.registrations])];
    const breakdown=[['Date (Kinshasa)','Appareil','Provenance','Pages vues','Sessions attribuées'],...report.rows.map(r=>[r.day,deviceLabels[r.device],channelLabels[r.channel],r.pageviews,r.sessions])];
    const devices=[['Appareil','Pages vues','Sessions attribuées'],...summary.devices.map(r=>[r.label,r.pageviews,r.sessions])];
    const channels=[['Provenance','Pages vues','Sessions attribuées'],...summary.channels.map(r=>[r.label,r.pageviews,r.sessions])];
    const reportData:Report={title:'Rapport d’audience',subtitle:`${report.start} au ${report.end} · Fuseau de Kinshasa · Mesure facultative`,sections:[
      {title:'Synthèse',headers:['Indicateur','Valeur'],rows:[['Pages vues',summary.totals.pageviews],['Sessions quotidiennes estimées',summary.totals.sessions],['Inscriptions réelles',summary.totals.registrations]],widths:[44,26]},
      {title:'Évolution',headers:daily[0].map(String),rows:daily.slice(1),widths:[25,22,34,25]},
      {title:'Appareils',headers:devices[0].map(String),rows:devices.slice(1),widths:[35,22,26]},
      {title:'Provenances',headers:channels[0].map(String),rows:channels.slice(1),widths:[35,22,26]},
      {title:'Détails',headers:breakdown[0].map(String),rows:breakdown.slice(1),widths:[25,24,28,18,26]},
      {title:'Méthode',headers:['Indicateur','Définition'],rows:[['Pages vues','Chargements de la page publique avec consentement.'],['Sessions','Onglets quotidiens estimés, non assimilables à des personnes uniques.'],['Inscriptions','Candidatures non fictives, indépendantes des visites mesurées.'],['Limites','Pas de données historiques avant activation. Les visites sans consentement ne sont pas comptées.']],widths:[32,85]}
    ]};
    return reportResponse(format==='pdf'?await pdfReport(reportData):await workbookReport(reportData),format==='pdf'?'pdf':'xlsx',name);
  }catch(e){return NextResponse.json({error:e instanceof HttpError?e.message:'Statistiques indisponibles.'},{status:e instanceof HttpError?e.status:500,headers});}
}
