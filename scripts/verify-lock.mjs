import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
let lock;
try { lock=JSON.parse(readFileSync('package-lock.json','utf8')); } catch { throw Error('package-lock.json manquant ou invalide : npm install --package-lock-only --ignore-scripts'); }
assert(lock.lockfileVersion>=3 && lock.packages?.[''], 'Lockfile npm v3 requis');
const root=lock.packages[''];
for(const key of ['dependencies','devDependencies'])assert.deepEqual(root[key],pkg[key],`Lockfile incohérent : ${key}`);
assert.equal(root.version,pkg.version,'Version du lockfile incohérente');
for(const [name,version] of Object.entries({next:pkg.dependencies.next,react:pkg.dependencies.react,'react-dom':pkg.dependencies['react-dom'],zod:pkg.dependencies.zod,exceljs:pkg.dependencies.exceljs,postcss:pkg.devDependencies.postcss})) {
 assert.equal(lock.packages[`node_modules/${name}`]?.version,version,`Version inattendue : ${name}`);
}
for(const [path,entry] of Object.entries(lock.packages)){
 if(/(?:^|\/)node_modules\/postcss$/.test(path))assert.equal(entry.version,pkg.devDependencies.postcss,`PostCSS non aligné : ${path}`);
}
const uuid=lock.packages['node_modules/exceljs/node_modules/uuid']??lock.packages['node_modules/uuid'];
assert.equal(uuid?.version,pkg.overrides.exceljs.uuid,'UUID d’ExcelJS non aligné');
console.log('Lockfile cohérent et dépendances ciblées verrouillées.');
