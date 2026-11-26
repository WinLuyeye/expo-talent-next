import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{
  let sitemap:string|undefined;
  try{if(process.env.APP_ORIGIN){const url=new URL(process.env.APP_ORIGIN);if(['https:','http:'].includes(url.protocol))sitemap=new URL('/sitemap.xml',url).href}}catch{}
  return {rules:{userAgent:'*',allow:'/',disallow:['/admin','/espace-coordination','/api/']},...(sitemap?{sitemap}:{})};
}
