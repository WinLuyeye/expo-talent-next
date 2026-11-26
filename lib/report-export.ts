import 'server-only';
import ExcelJS from 'exceljs';
import {PDFDocument,StandardFonts,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import {LOGO_JPEG} from './acceptance';
import {applicationStats,isDemo,kinDay} from './application-model';
import {fullName,labels,type Entry} from './shared';
export type Cell=string|number;
export type ReportSection={title:string;headers:string[];rows:Cell[][];widths?:number[]};
export type Report={title:string;subtitle:string;sections:ReportSection[];details?:Entry[];};
const stamp=()=>new Date().toLocaleString('fr-FR',{timeZone:'Africa/Kinshasa',dateStyle:'short',timeStyle:'short'});
const display=(v:unknown):Cell=>typeof v==='boolean'?(v?'Oui':'Non'):typeof v==='number'&&Number.isFinite(v)?v:String(v??'');
const dataKeys=['nom','postnom','prenom','sexe','email','telephone','matricule','promotion','filiere','departement','vacation','categorie','intitule','description','type','groupe','participants','besoins','motivation','video','certifie','reglement','consentement','consent_date'];
export function applicationReport(rows:Entry[],scope:string,statsOnly:boolean,participantsOnly:boolean):Report{
 const real=rows.filter(r=>!isDemo(r)).length;const title=statsOnly?'Statistiques des candidatures':participantsOnly?'Participants retenus':'Candidatures';
 const sections:ReportSection[]=[{title:'Synthèse',headers:['Indicateur','Valeur'],rows:[['Dossiers',rows.length],['Candidatures réelles',real],['Démonstrations',rows.length-real]],widths:[35,25]},...applicationStats(rows).map(s=>({title:s.title,headers:['Répartition','Nombre','Part (%)'],rows:s.rows.map(r=>[r.name,r.total,rows.length?Math.round(r.total*1000/rows.length)/10:0]),widths:[55,15,15]}))];
 if(!statsOnly)sections.push({title:'Dossiers',headers:['Référence','Population','Statut','Date (Kinshasa)',...dataKeys.map(k=>labels[k]||k),'Pièce jointe'],rows:rows.map(r=>[r.id,isDemo(r)?'Démo':'Réelle',r.status,kinDay(r.created),...dataKeys.map(k=>display(k==='matricule'?r.matricule:k==='email'?r.email:r.data[k])),r.original_name||'']),widths:[30,15,30,19,...dataKeys.map(k=>['description','motivation','besoins','video'].includes(k)?55:['email','filiere','departement','categorie','intitule'].includes(k)?34:22),30]});
 return {title,subtitle:`${rows.length} dossier(s) · ${scope==='real'?'Réelles':scope==='demo'?'Démonstrations':'Population mixte / tous'} · ${stamp()} (Kinshasa)`,sections,details:statsOnly?undefined:rows};
}
const excelColor={navy:'FF111827',yellow:'FFFFE51D',muted:'FF5B6781',line:'FFDCE3F0',light:'FFF1F4FA',white:'FFFFFFFF',ink:'FF182238'};
export async function workbookReport(report:Report){
 const wb=new ExcelJS.Workbook();wb.creator='EXPO TALENT — ISS-KIN';wb.created=new Date();const logo=wb.addImage({base64:'data:image/jpeg;base64,'+LOGO_JPEG,extension:'jpeg'});
 for(const section of report.sections){
  const ws=wb.addWorksheet(section.title.slice(0,31));const n=section.headers.length;ws.columns=section.headers.map((_,i)=>({width:n===2&&i===1?Math.max(44,section.widths?.[i]||26):section.widths?.[i]||26}));
  for(let i=1;i<=3;i++){const row=ws.getRow(i);row.height=i===1?30:i===2?26:42;for(let j=1;j<=n;j++){row.getCell(j).fill={type:'pattern',pattern:'solid',fgColor:{argb:excelColor.navy}};}}
  if(n>2){ws.mergeCells(1,2,1,n);ws.mergeCells(2,2,2,n);ws.mergeCells(3,2,3,n);}
  ws.getCell('B1').value='EXPO TALENT | ISS-KIN';ws.getCell('B1').font={name:'Calibri',size:17,bold:true,color:{argb:excelColor.yellow}};
  ws.getCell('B2').value=report.title+' — '+section.title;ws.getCell('B2').font={name:'Calibri',size:12,bold:true,color:{argb:excelColor.white}};ws.getCell('B2').alignment={vertical:'middle',wrapText:true};
  ws.getCell('B3').value=report.subtitle;ws.getCell('B3').font={name:'Calibri',size:10,color:{argb:'FFBAC6DE'}};ws.getCell('B3').alignment={vertical:'middle',wrapText:true};
  ws.addImage(logo,{tl:{col:0.1,row:0.1},ext:{width:58,height:58}});
  const header=ws.addRow(section.headers);header.height=32;header.eachCell({includeEmpty:true},c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:excelColor.yellow}};c.font={name:'Calibri',bold:true,color:{argb:excelColor.ink},size:11};c.alignment={vertical:'middle',wrapText:true};});
  for(const row of section.rows){const r=ws.addRow(row);let lines=1;row.forEach((v,i)=>{lines=Math.max(lines,Math.ceil(String(v).length/Math.max(10,(section.widths?.[i]||26)-3))+String(v).split('\n').length-1);});r.height=Math.min(409,Math.max(24,lines*15+8));r.eachCell({includeEmpty:true},c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:r.number%2===0?excelColor.light:excelColor.white}};c.font={name:'Calibri',size:11,color:{argb:excelColor.ink}};c.alignment={vertical:'middle',wrapText:true};c.border={bottom:{style:'hair',color:{argb:excelColor.line}}};});}
  ws.views=[{state:'frozen',ySplit:4,xSplit:section.title==='Dossiers'?1:0,showGridLines:false}];ws.autoFilter={from:{row:4,column:1},to:{row:Math.max(4,ws.rowCount),column:n}};
  ws.pageSetup={orientation:n>5?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,paperSize:9,printTitlesRow:'1:4'};
 }
 return new Uint8Array(await wb.xlsx.writeBuffer());
}
const navy=rgb(.06,.08,.14), yellow=rgb(1,.90,.114), ink=rgb(.10,.14,.23), muted=rgb(.36,.41,.51), light=rgb(.94,.96,.98), line=rgb(.85,.88,.92), white=rgb(1,1,1);
function clean(value:unknown,font:PDFFont){return Array.from(String(value??'').replace(/\s+/g,' ').trim()).map(c=>{try{font.encodeText(c);return c}catch{return '?'}}).join('')||'—';}
function wrap(value:unknown,font:PDFFont,size:number,width:number){const s=clean(value,font),out:string[]=[];let curr='';for(const c of s){if(curr&&font.widthOfTextAtSize(curr+c,size)>width){const p=curr.lastIndexOf(' ');if(p>0){out.push(curr.slice(0,p));curr=curr.slice(p+1)+c;}else{out.push(curr);curr=c;}}else curr+=c;}if(curr)out.push(curr);return out;}
export async function pdfReport(report:Report){
 const doc=await PDFDocument.create();doc.setTitle('EXPO TALENT — '+report.title);doc.setAuthor('Coordination estudiantine ISS-KIN');const normal=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold),logo=await doc.embedJpg(Buffer.from(LOGO_JPEG,'base64'));
 const W=595,H=842,M=36,CW=W-2*M;let page:PDFPage=doc.addPage([W,H]),y=0;
 function text(value:unknown,x:number,yy:number,size=10,font=normal,color=ink){page.drawText(clean(value,font),{x,y:yy,size,font,color});}
 function newPage(first=false){if(!first)page=doc.addPage([W,H]);page.drawRectangle({x:0,y:H-108,width:W,height:108,color:navy});page.drawRectangle({x:0,y:H-5,width:W,height:5,color:yellow});page.drawRectangle({x:M,y:H-77,width:50,height:50,color:white});page.drawImage(logo,{x:M+4,y:H-73,width:42,height:42});text('EXPO TALENT',M+64,H-36,21,bold,yellow);text('ISS-KIN | COORDINATION ESTUDIANTINE',M+64,H-52,9,bold,white);text(report.title,M+64,H-72,13,bold,white);wrap(report.subtitle,normal,8,CW).slice(0,2).forEach((s,i)=>text(s,M,H-91-i*10,8,normal,white));y=H-130;}
 function space(h:number){if(y-h<54)newPage();}
 function heading(t:string){const lines=wrap(t,bold,12,CW-18);space(30+lines.length*15);page.drawRectangle({x:M,y:y-4,width:4,height:18,color:yellow});lines.forEach((l,i)=>text(l,M+12,y-i*15,12,bold));y-=lines.length*15+7;}
 function table(s:ReportSection){const fractions=s.headers.length===3?[.66,.17,.17]:s.headers.length===2?[.66,.34]:Array(s.headers.length).fill(1/s.headers.length);const widths=fractions.map(f=>CW*f);function head(){const labels=s.headers.map((v,i)=>wrap(v,bold,9,widths[i]-12));const h=Math.max(24,Math.max(...labels.map(l=>l.length))*10+8);page.drawRectangle({x:M,y:y-h,width:CW,height:h,color:navy});let x=M;labels.forEach((ls,i)=>{ls.forEach((l,j)=>text(l,x+6,y-12-j*10,9,bold,white));x+=widths[i];});y-=h;}
  space(75);heading(s.title);head();if(!s.rows.length){text('Aucune donnée.',M+6,y-14,9);y-=27;}
  for(const [i,row] of s.rows.entries()){const cells=row.map((v,j)=>wrap(v,normal,9,widths[j]-12));const h=Math.max(22,Math.max(...cells.map(c=>c.length))*12+8);if(y-h<54){newPage();heading(s.title+' (suite)');head();}page.drawRectangle({x:M,y:y-h,width:CW,height:h,color:i%2?white:light});let x=M;cells.forEach((lines,j)=>{lines.forEach((l,k)=>text(l,x+6,y-13-k*12,9));x+=widths[j];});y-=h;}
  y-=18;
 }
 newPage(true);for(const section of report.sections){if(section.title!=='Dossiers')table(section);}
 // PDF: all dossier fields, individually wrapped and paginated; XLSX has the same raw values.
 if(report.details?.length){for(const r of report.details){space(95);heading(fullName(r.data)+' — '+(isDemo(r)?'Démo':'Réelle'));const fields:[string,unknown][]=[['Référence',r.id],['Statut',r.status],['Date (Kinshasa)',kinDay(r.created)],...dataKeys.map(k=>[labels[k]||k,display(k==='matricule'?r.matricule:k==='email'?r.email:r.data[k])] as [string,unknown]),['Pièce jointe',r.original_name||'']];
   for(const [k,v] of fields){const lines=wrap(v,normal,9,CW-167),kl=wrap(k,bold,9,148);let offset=0;const total=Math.max(lines.length,kl.length);while(offset<total){if(y<85){newPage();heading('Dossier '+r.id+' (suite)');}const count=Math.min(total-offset,Math.max(1,Math.floor((y-58)/12)));const h=count*12+6;page.drawRectangle({x:M,y:y-h,width:CW,height:h,color:offset%2?white:light});for(let i=0;i<count;i++){if(kl[offset+i])text(kl[offset+i],M+5,y-12-i*12,9,bold,muted);if(lines[offset+i])text(lines[offset+i],M+160,y-12-i*12,9);}y-=h;offset+=count;}}
   y-=18;
 }}
 const pages=doc.getPages();pages.forEach((p,i)=>{page=p;page.drawLine({start:{x:M,y:39},end:{x:W-M,y:39},thickness:.7,color:line});text('CONFIDENTIEL • USAGE COORDINATION',M,24,8,bold,muted);text(`${i+1} / ${pages.length}`,W-M-36,24,8,normal,muted);});return new Uint8Array(await doc.save());
}
export function reportResponse(bytes:Uint8Array,format:'xlsx'|'pdf',name:string){return new Response(new Uint8Array(bytes),{headers:{'Content-Type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${name}.${format}"`,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}
