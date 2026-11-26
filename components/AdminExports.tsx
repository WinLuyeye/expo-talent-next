'use client';
import {useEffect,useRef,useState} from 'react';
import type {ApplicationFilter} from '@/lib/application-model';
type Format='xlsx'|'pdf';
function ReportButtons({label,fileName,request}:{label:string;fileName:string;request:(format:Format,signal:AbortSignal)=>Promise<Response>}){
 const [busy,setBusy]=useState(''),[message,setMessage]=useState('');const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>{active.current?.abort();active.current=null},[]);
 async function download(format:Format){
  if(active.current)return;const controller=new AbortController();active.current=controller;setBusy(format);setMessage('');let url:string|undefined;
  try{const res=await request(format,controller.signal);if(!res.ok){const data=await res.json().catch(()=>null);throw Error(data?.error||'Export indisponible.');}const blob=await res.blob();if(controller.signal.aborted)return;if(!blob.size||!blob.type.includes(format==='pdf'?'application/pdf':'spreadsheetml'))throw Error('Format de réponse inattendu.');url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${fileName}.${format}`;document.body.appendChild(link);link.click();link.remove();const downloaded=url;window.setTimeout(()=>URL.revokeObjectURL(downloaded),30000);url=undefined;setMessage('Téléchargement lancé.');}catch(e){if(!controller.signal.aborted)setMessage(e instanceof Error?e.message:'Export indisponible.');}finally{if(url)URL.revokeObjectURL(url);if(active.current===controller){active.current=null;setBusy('');}}
 }
 return <div className="export-controls"><span>{label}</span><div className="export-buttons"><button type="button" className="btn outline small" aria-label={`Exporter ${label.toLowerCase()} en Excel`} disabled={!!busy} onClick={()=>void download('xlsx')}>{busy==='xlsx'?'Préparation…':'Excel'}</button><button type="button" className="btn outline small" aria-label={`Exporter ${label.toLowerCase()} en PDF`} disabled={!!busy} onClick={()=>void download('pdf')}>{busy==='pdf'?'Préparation…':'PDF'}</button></div>{message&&<small role="status">{message}</small>}</div>;
}
export function ExportButtons({filter,statsOnly=false,label='Résultats filtrés'}:{filter:ApplicationFilter;statsOnly?:boolean;label?:string}){
 return <ReportButtons label={label} fileName={`expo-talent-${statsOnly?'statistiques':filter.participantsOnly?'participants':'candidatures'}`} request={(format,signal)=>fetch('/api/admin/export.'+format,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...filter,statsOnly}),cache:'no-store',signal})}/>;
}
export function AudienceExportButtons({days,start,end}:{days:number;start:string;end:string}){
 return <ReportButtons label="Rapport d’audience" fileName={`expo-talent-audience-${start}-${end}`} request={(format,signal)=>fetch(`/api/admin/traffic?days=${days}&format=${format}`,{cache:'no-store',signal})}/>;
}
