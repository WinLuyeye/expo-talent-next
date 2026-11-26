// Read-only smoke test, no real accounts or credentials, no registration or email.
const origin = new URL(process.env.SMOKE_BASE_URL || 'http://localhost:3000').origin;
const tests = [
  ['public page and CSP', '/', r => r.status === 200 && !!r.headers.get('content-security-policy')],
  ['coordination page', '/espace-coordination', r => r.status === 200],
  ['old admin redirect', '/admin', r => [307,308].includes(r.status) && (r.headers.get('location')||'').endsWith('/espace-coordination')],
  ['audience denied', '/api/admin/traffic?days=7', r => [401,403].includes(r.status)],
  ['public configuration', '/api/config', async r => r.status === 200 && typeof (await r.json()).settings?.open === 'boolean'],
  ['admin data denied', '/api/admin/data', r => [401,403].includes(r.status)],
  ['admin session denied', '/api/admin/session', r => [401,403].includes(r.status)],
  ['admin audit denied', '/api/admin/audit', r => [401,403].includes(r.status)],
  ['Excel export denied', '/api/admin/export.xlsx', r => [401,403].includes(r.status)],
  ['PDF export denied', '/api/admin/export.pdf', r => [401,403].includes(r.status)],
  ['PDF audience denied', '/api/admin/traffic?days=7&format=pdf', r => [401,403].includes(r.status)],
];
let fails=0;
for (const [name,path,check] of tests) {
  try {
    const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    const ok=await check(r); if(!ok) fails++;
    console.log(`${ok?'PASS':'FAIL'} ${name}: ${r.status}`);
  } catch { fails++; console.error(`FAIL ${name}: connexion impossible`); }
}
if(fails)process.exitCode=1;
