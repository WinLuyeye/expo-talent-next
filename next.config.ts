import type {NextConfig} from 'next';
const production=process.env.NODE_ENV==='production';
const config:NextConfig={poweredByHeader:false,async headers(){return [
 {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},...(production?[{key:'Strict-Transport-Security',value:'max-age=31536000'}]:[])]},
 {source:'/api/:path*',headers:[{key:'Content-Security-Policy',value:"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"}]},
 ...['/admin/:path*','/espace-coordination/:path*','/api/admin/:path*'].map(source=>({source,headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}))
]}};
export default config;
