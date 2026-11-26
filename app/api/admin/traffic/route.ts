import {NextResponse} from 'next/server';
import ExcelJS from 'exceljs';
import {db,requireAdmin,HttpError,must,auditEvent} from '@/lib/server';
import {summarizeTraffic,deviceLabels,channelLabels,type TrafficReport} from '@/lib/traffic-model';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'};
export async function GET(req:Request){
  try{
    const me=await requireAdmin(true);
    const params=new URL(req.url).searchParams,period=params.get('days')||'30',format=params.get('format')||'json';
    if(!['7','30','90'].includes(period)||!['json','csv','xlsx'].includes(format))throw new HttpError('Période ou format invalide.');
    const report=must(await db().rpc('expo_traffic_report',{p_days:Number(period)})) as TrafficReport;
    if(format==='json')return NextResponse.json(report,{headers});
    await auditEvent(me.id,'export.request','audience.'+format,{days:Number(period)});
    const summary=summarizeTraffic(report),name=`expo-talent-audience-${report.start}-${report.end}`;
    const daily=[['Date (Kinshasa)','Pages vues','Sessions quotidiennes estimées','Inscriptions réelles'],...summary.daily.map(r=>[r.day,r.pageviews,r.sessions,r.registrations])];
    const breakdown=[['Date (Kinshasa)','Appareil','Provenance','Pages vues','Sessions attribuées'],...report.rows.map(r=>[r.day,deviceLabels[r.device],channelLabels[r.channel],r.pageviews,r.sessions])];
    const devices=[['Appareil','Pages vues','Sessions attribuées'],...summary.devices.map(r=>[r.label,r.pageviews,r.sessions])];
    const channels=[['Provenance','Pages vues','Sessions attribuées'],...summary.channels.map(r=>[r.label,r.pageviews,r.sessions])];
    if(format==='csv'){
      const rows=[['Type','Date','Appareil','Provenance','Pages vues','Sessions estimées','Inscriptions réelles'],...summary.daily.map(r=>['Total quotidien',r.day,'','',r.pageviews,r.sessions,r.registrations]),...report.rows.map(r=>['Détail',r.day,deviceLabels[r.device],channelLabels[r.channel],r.pageviews,r.sessions,''])];
      const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');
      return new NextResponse(csv,{headers:{...headers,'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${name}.csv"`}});
    }
    const workbook=new ExcelJS.Workbook();
    const sheets:[string,(string|number)[][]][]=[['Évolution',daily],['Appareils',devices],['Provenances',channels],['Détails',breakdown],['Méthode',[['Indicateur','Définition'],['Période',`${report.start} au ${report.end} — Kinshasa`],['Pages vues','Chargements de la page publique avec consentement.'],['Sessions','Onglets quotidiens estimés ; non assimilables à des personnes uniques.'],['Inscriptions','Candidatures non fictives, indépendantes de la mesure d’audience.'],['Données','Aucune donnée antérieure à l’activation de la mesure.']]]];
    for(const [title,rows] of sheets){const ws=workbook.addWorksheet(title);for(const row of rows)ws.addRow(row);ws.getRow(1).font={bold:true,color:{argb:'FF101322'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFE51D'}};ws.views=[{state:'frozen',ySplit:1}];ws.columns.forEach((c,i)=>c.width=title==='Méthode'&&i===1?80:27);}
    const buffer=await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer),{headers:{...headers,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${name}.xlsx"`}});
  }catch(e){return NextResponse.json({error:e instanceof HttpError?e.message:'Statistiques indisponibles.'},{status:e instanceof HttpError?e.status:500,headers});}
}
