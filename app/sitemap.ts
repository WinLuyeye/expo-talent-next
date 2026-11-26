import type {MetadataRoute} from 'next';
export default function sitemap():MetadataRoute.Sitemap{
  const base=process.env.APP_ORIGIN;
  if(!base)return [];
  try {const url=new URL(base);if(!['https:','http:'].includes(url.protocol))return [];return [{url:url.origin+'/'}]}catch{return []}
}
