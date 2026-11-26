import {NextRequest,NextResponse} from 'next/server';
import {contentPolicy} from './lib/security-runtime';
export function middleware(request:NextRequest){
 const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
 const production=process.env.NODE_ENV==='production';
 const enforce=process.env.CSP_NONCE_ENFORCE==='true';
 const strict=contentPolicy(nonce,production,true);
 const headers=new Headers(request.headers);headers.set('x-nonce',nonce);headers.set('content-security-policy',strict);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',enforce?strict:contentPolicy(nonce,production,false));
 if(!enforce)response.headers.set('Content-Security-Policy-Report-Only',strict);
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/((?!api|_next/static|_next/image|static/|favicon.ico|robots.txt|sitemap.xml).*)']};
