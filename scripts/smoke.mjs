// Read-only smoke test, no real accounts or credentials, no registration or email.
const origin = new URL(process.env.SMOKE_BASE_URL || 'http://localhost:3000').origin;
const tests = [
  ['public page', '/', r => r.status === 200],
  ['public configuration', '/api/config', async r => r.status === 200 && typeof (await r.json()).settings?.open === 'boolean'],
  ['admin data denied', '/api/admin/data', r => [401,403].includes(r.status)],
  ['admin session denied', '/api/admin/session', r => [401,403].includes(r.status)],
  ['admin audit denied', '/api/admin/audit', r => [401,403].includes(r.status)],
  ['Excel export denied', '/api/admin/export.xlsx', r => [401,403].includes(r.status)],
  ['CSV export denied', '/api/admin/export.csv', r => [401,403].includes(r.status)],
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
