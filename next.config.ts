import type {NextConfig} from 'next';
// Next App Router uses inline bootstrap scripts and Framer Motion uses inline styles.
// A stricter nonce-based policy is a separate rollout; no eval in production.
const production=process.env.NODE_ENV==='production';
const csp=["default-src 'self'","script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com"+(production?'':" 'unsafe-eval'"),"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob: https:","font-src 'self' data:","connect-src 'self' https://challenges.cloudflare.com"+(production?'':' ws: wss:'),"frame-src https://challenges.cloudflare.com","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'","worker-src 'self' blob:"].join('; ');
const config:NextConfig={poweredByHeader:false,async headers(){return [
 {source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},{key:'Content-Security-Policy',value:csp},...(production?[{key:'Strict-Transport-Security',value:'max-age=31536000'}]:[])]},
 ...['/admin/:path*','/espace-coordination/:path*','/api/admin/:path*'].map(source=>({source,headers:[{key:'Cache-Control',value:'no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}))
]}};
export default config;
