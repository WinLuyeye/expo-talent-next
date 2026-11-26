import {PDFDocument,StandardFonts,rgb,type PDFFont} from 'pdf-lib';
import QRCode from 'qrcode';
import {fullName,type Entry} from './shared';

export const acceptanceSubject='Candidature acceptée — EXPO TALENT ISS-KIN';
export function acceptanceMessage(a:Entry,origin:string){return `Bonjour ${a.data.prenom},

Félicitations ! Nous avons le plaisir de t’annoncer que ta candidature à EXPO TALENT ISS-KIN a été acceptée.

Nom complet : ${fullName(a.data)}
Promotion : ${a.data.promotion}
Catégorie : ${a.data.categorie}
Numéro d’inscription : ${a.id}
Statut : Candidature acceptée

Tu trouveras en pièce jointe ta fiche d’acceptation, munie d’un QR code de vérification. Conserve-la et présente-la si elle t’est demandée par l’équipe organisatrice.

Les prochaines étapes, ainsi que les éventuelles modalités de passage, te seront communiquées par la coordination estudiantine.

Suivre ta candidature : ${new URL('/#suivi',origin).href}

La Coordination estudiantine
Institut Supérieur de Statistique de Kinshasa — ISS-KIN.

Révélons aujourd’hui les talents qui façonneront demain !`;}

export async function acceptancePDF(a:Entry,acceptedAt:string):Promise<Buffer>{
  const doc=await PDFDocument.create({updateMetadata:false}), page=doc.addPage([595,842]);
  // Stable metadata for retries using the same Resend idempotency key.
  const acceptedDate=new Date(acceptedAt);doc.setCreationDate(acceptedDate);doc.setModificationDate(acceptedDate);
  const normal=await doc.embedFont(StandardFonts.Helvetica), bold=await doc.embedFont(StandardFonts.HelveticaBold), italic=await doc.embedFont(StandardFonts.HelveticaOblique);
  const navy=rgb(.04,.05,.09), panel=rgb(.075,.095,.16), yellow=rgb(1,.90,.08), white=rgb(1,1,1), muted=rgb(.68,.73,.82);
  const safe=(s:unknown)=>Array.from(String(s??'').replace(/\s+/g,' ').trim()).map(c=>{try{normal.encodeText(c);return c}catch{return '?'}}).join('')||'—';
  const rect=(x:number,y:number,w:number,h:number,color=panel)=>page.drawRectangle({x,y,width:w,height:h,color});
  const text=(s:unknown,x:number,y:number,size:number,font=normal,color=white)=>page.drawText(safe(s),{x,y,size,font,color});
  function wrap(s:string,font:PDFFont,size:number,width:number){const lines:string[]=[];let line='';for(const ch of s){if(line&&font.widthOfTextAtSize(line+ch,size)>width){const k=line.lastIndexOf(' ');if(k>0){lines.push(line.slice(0,k));line=line.slice(k+1)+ch;}else{lines.push(line);line=ch;}}else line+=ch;}if(line)lines.push(line);return lines;}
  function fitted(s:unknown,x:number,y:number,w:number,maxLines=3){let size=11,lines=wrap(safe(s),bold,size,w);while(lines.length>maxLines&&size>6){size-=.5;lines=wrap(safe(s),bold,size,w);}if(lines.length>maxLines){lines=lines.slice(0,maxLines);let last=lines[maxLines-1];while(bold.widthOfTextAtSize(last+'…',size)>w)last=last.slice(0,-1);lines[maxLines-1]=last+'…';}lines.forEach((v,i)=>text(v,x,y-i*(size+1),size,bold));}
  rect(0,0,595,842,navy);rect(0,833,595,9,yellow);
  rect(36,741,62,62,white);
  const logo=await doc.embedJpg(Buffer.from(LOGO_JPEG,'base64'));page.drawImage(logo,{x:41,y:746,width:52,height:52});
  text('EXPO TALENT',112,783,27,bold,yellow);text('INSTITUT SUPÉRIEUR DE STATISTIQUE DE KINSHASA',112,764,9,bold);text('COORDINATION ESTUDIANTINE • ISS-KIN',112,748,9,normal,muted);
  text('FICHE D’ACCEPTATION',36,692,28,bold);text('Candidature retenue / EXPO TALENT',36,671,12,normal,muted);
  rect(36,615,523,42);text('RÉFÉRENCE UNIQUE',48,642,8,normal,muted);fitted(a.id,48,624,315,1);rect(389,626,158,20,yellow);text('CANDIDATURE ACCEPTÉE',398,633,9,bold,navy);
  rect(36,310,523,291);text('INFORMATIONS DU CANDIDAT',49,580,11,bold,yellow);
  const d=a.data;const rows=[['Nom complet',fullName(d),'Matricule',a.matricule],['Promotion',d.promotion,'Vacation',d.vacation],['Filière',d.filiere,'Département',d.departement],['Catégorie',d.categorie,'Type de participation',d.type],['Prestation',d.intitule,'Date de validation',acceptedDate.toLocaleDateString('fr-FR',{timeZone:'Africa/Kinshasa',dateStyle:'long'})]];
  rows.forEach(([l,v,r,w],i)=>{const y=555-i*50;text(String(l).toUpperCase(),49,y,8,normal,muted);fitted(v,49,y-14,238);text(String(r).toUpperCase(),302,y,8,normal,muted);fitted(w,302,y-14,244);});
  rect(36,122,523,177);const qr=await doc.embedPng(await QRCode.toBuffer(a.id,{width:300,margin:4}));page.drawImage(qr,{x:48,y:148,width:126,height:126});
  text('VÉRIFICATION DE LA CANDIDATURE',187,274,10,bold,yellow);
  const prose=(s:string,y:number)=>wrap(safe(s),normal,10,350).forEach((v,i)=>text(v,187,y-i*13,10,normal,muted));
  prose('QR code : référence uniquement. Aucun renseignement personnel n’est encodé.',254);prose('Présenter cette fiche sur demande de l’équipe organisatrice. Les modalités de passage seront communiquées ultérieurement.',216);
  text('Validation de la coordination',187,157,9,normal,muted);page.drawLine({start:{x:365,y:156},end:{x:546,y:156},thickness:.6,color:muted});
  text('Révélons aujourd’hui les talents qui façonneront demain !',36,84,12,italic,yellow);text('Cette fiche ne constitue pas une convocation officielle.',36,42,9,normal,muted);
  doc.setTitle('Fiche d’acceptation — '+a.id);doc.setAuthor('EXPO TALENT — ISS-KIN');return Buffer.from(await doc.save());
}

// Logo ISS-KIN dérivé de public/static/logo.webp, compatible PDF.
const LOGO_JPEG='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';
